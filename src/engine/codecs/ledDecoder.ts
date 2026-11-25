import type { WiringMap } from "@/engine/wiringMapper";

export type LedInput = ArrayBuffer | Uint8Array | File | Blob;

export interface LedDecodeOptions {
  headerOffset?: number | "auto";
  headerSize?: number;
  headerCandidates?: number[];
  pixelCount?: number;
  channels?: number;
  cols?: number;
  rows?: number;
  colorOrder?: string;
  wiringMap?: WiringMap | null;
  useWiring?: boolean;
  wiringMode?: "active" | "raster";
  portMode?: "sequential" | "interleaved";
  ports?: number;
  fps?: number;
  targetFps?: number;
  frameBytes?: number;
  valueOffset?: number | null;
  off?: number | null;
  maxFrames?: number;
}

export interface LedDecodeStats {
  fileSize: number;
  frames: number;
  duration: number;
  pixelsPerFrame: number;
}

export interface LedDecodeResult {
  ok: boolean;
  error?: string;
  fileSize?: number;
  headerOffset?: number;
  frameCount?: number;
  frames?: Uint8Array[];
  rawFrames?: Uint8Array[];
  pixelsPerFrame?: number;
  channels?: number;
  cols?: number;
  rows?: number;
  fps?: number;
  duration?: number;
  colorOrder?: string;
  portMode?: string;
  stats?: LedDecodeStats;
  // Aliases for callers that expect a different name.
  frameBuffers?: Uint8Array[];
  decodedFrames?: Uint8Array[];
  rgbaFrames?: Uint8Array[];
  data?: Uint8Array[];
}

function fail(error: string, extra?: Partial<LedDecodeResult>): LedDecodeResult {
  return { ok: false, error, ...extra };
}

function detectHeaderOffset(size: number, pixelCount: number, channels: number, candidates: number[]): number {
  const frameBytes = Math.max(1, pixelCount * channels);
  let best = candidates[0] ?? 512;
  let bestRem = Number.POSITIVE_INFINITY;
  for (const c of candidates) {
    if (c < 0 || c > size) continue;
    const rem = (size - c) % frameBytes;
    const adj = rem === 0 ? 0 : rem;
    if (adj < bestRem) {
      bestRem = adj;
      best = c;
    }
  }
  return best;
}

function decodeColor(src: Uint8Array, order: string, channels: number): [number, number, number] {
  const bytes: number[] = [];
  for (let i = 0; i < channels; i++) bytes.push(src[i] ?? 0);
  const o = (order || "RGB").toUpperCase().padEnd(3, "RGB").slice(0, Math.max(3, channels));
  const rgb: [number, number, number] = [0, 0, 0];
  const letters = "RGB";
  for (let c = 0; c < 3; c++) {
    const pos = o.indexOf(letters[c]);
    if (pos >= 0 && pos < bytes.length) rgb[c] = bytes[pos];
  }
  return rgb;
}

export function decodeLedBuffer(buffer: ArrayBuffer | Uint8Array, options: LedDecodeOptions = {}): LedDecodeResult {
  try {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer as ArrayBuffer);
    const size = bytes.byteLength;
    if (!size) return fail("Empty or invalid .led file");

    const wiringMap = options.wiringMap ?? null;
    const channels = Math.max(1, Math.min(4, Math.round(options.channels ?? 3)));
    let pixelCount = Math.round(options.pixelCount ?? wiringMap?.totalPixels ?? 0);
    let cols = Math.round(options.cols ?? 0);
    let rows = Math.round(options.rows ?? 0);

    if (pixelCount <= 0 && cols > 0 && rows > 0) pixelCount = cols * rows;
    if (pixelCount <= 0) {
      // Last-resort guess so we never crash; assume a square-ish raw stream.
      cols = cols > 0 ? cols : Math.max(1, Math.round(Math.sqrt(size / Math.max(1, channels))));
      rows = rows > 0 ? rows : Math.max(1, Math.ceil((size / Math.max(1, channels)) / cols));
      pixelCount = Math.max(1, cols * rows);
    }
    if (pixelCount <= 0) return fail("Could not determine pixel count");

    if ((!cols || !rows) && wiringMap?.pixels?.length) {
      cols = Math.max(1, ...wiringMap.pixels.map((p) => (p.x ?? 0) + 1));
      rows = Math.max(1, ...wiringMap.pixels.map((p) => (p.y ?? 0) + 1));
    }
    if (!cols || !rows) {
      cols = cols > 0 ? cols : Math.max(1, Math.round(Math.sqrt(pixelCount)));
      rows = rows > 0 ? rows : Math.max(1, Math.ceil(pixelCount / cols));
    }
    if (cols * rows < pixelCount) {
      // Pad canvas so every LED has a slot.
      cols = Math.max(cols, Math.ceil(Math.sqrt(pixelCount)));
      rows = Math.max(rows, Math.ceil(pixelCount / cols));
    }

    const colorOrder = (options.colorOrder ?? "RGB").toUpperCase();
    const useWiring = options.wiringMode === "raster" ? false : (options.useWiring ?? true);
    const portMode = options.portMode === "interleaved" ? "interleaved" : "sequential";
    const ports = Math.max(1, Math.round(options.ports ?? wiringMap?.ports?.length ?? 1));
    const fps = options.targetFps ?? options.fps ?? 25;
    const valueOffset =
      options.valueOffset === undefined ? (options.off === undefined ? 0xe3 : options.off) : options.valueOffset;
    const maxFrames = Math.max(1, Math.round(options.maxFrames ?? Number.MAX_SAFE_INTEGER));

    const isRzbv =
      size >= 8 &&
      bytes[0] === 0x72 &&
      bytes[1] === 0x7a &&
      bytes[2] === 0x62 &&
      bytes[3] === 0x76 &&
      bytes[4] === 0x30 &&
      bytes[5] === 0x30 &&
      bytes[6] === 0x31;

    // Header offset.
    let headerOffset: number;
    if (isRzbv) {
      headerOffset = 512;
    } else if (typeof options.headerOffset === "number") {
      headerOffset = options.headerOffset;
    } else if (options.headerOffset === "auto") {
      headerOffset = detectHeaderOffset(size, pixelCount, channels, options.headerCandidates ?? [512, 1024, 0, 256, 64]);
    } else if (options.headerSize != null) {
      headerOffset = options.headerSize;
    } else {
      // Default auto-detect per spec.
      headerOffset = detectHeaderOffset(size, pixelCount, channels, options.headerCandidates ?? [512, 1024, 0, 256, 64]);
    }

    if (headerOffset < 0 || headerOffset > size) return fail("Header offset out of range", { fileSize: size });

    // Frame stride.
    let frameBytes: number;
    let frameCount: number;
    if (isRzbv) {
      frameBytes = Math.max(1, Math.round(options.frameBytes ?? 3072));
      const rawCount = (bytes[0x0c] << 8) | bytes[0x0d];
      frameCount = rawCount > 0 ? rawCount : Math.floor((size - headerOffset) / frameBytes);
    } else {
      frameBytes = Math.max(1, Math.round(options.frameBytes ?? pixelCount * channels));
      frameCount = Math.floor((size - headerOffset) / frameBytes);
    }

    const available = Math.floor((size - headerOffset) / frameBytes);
    if (frameCount <= 0) return fail("No frames found in file", { fileSize: size, headerOffset });
    if (frameCount > available) frameCount = available;
    if (frameCount > maxFrames) frameCount = maxFrames;

    // Coord map: 1D global pixel index -> (col,row).
    const coordMap: { x: number; y: number }[] = new Array(pixelCount);
    if (useWiring && wiringMap?.pixels?.length) {
      for (let i = 0; i < pixelCount; i++) {
        const p = wiringMap.pixels[i];
        if (p && typeof p.x === "number" && typeof p.y === "number") {
          coordMap[i] = { x: p.x, y: p.y };
        } else {
          coordMap[i] = { x: i % cols, y: Math.floor(i / cols) };
        }
      }
    } else {
      for (let i = 0; i < pixelCount; i++) {
        coordMap[i] = { x: i % cols, y: Math.floor(i / cols) };
      }
    }

    // Global order for multi-port interleaving.
    const buildGlobalOrder = (): number[] => {
      if (portMode !== "interleaved") return Array.from({ length: pixelCount }, (_, i) => i);
      const portPixels: number[][] = Array.from({ length: ports }, () => []);
      if (wiringMap?.pixels?.length) {
        for (const p of wiringMap.pixels) {
          const portIdx = ((p.port ?? 1) as number) - 1;
          if (portIdx >= 0 && portIdx < ports && typeof p.index === "number") {
            portPixels[portIdx].push(p.index);
          }
        }
      } else {
        const per = Math.max(1, Math.ceil(pixelCount / ports));
        for (let port = 0; port < ports; port++) {
          for (let i = 0; i < per; i++) {
            const g = port * per + i;
            if (g < pixelCount) portPixels[port].push(g);
          }
        }
      }
      const maxLen = Math.max(0, ...portPixels.map((a) => a.length));
      const order: number[] = [];
      const seen = new Set<number>();
      for (let slot = 0; slot < maxLen; slot++) {
        for (let port = 0; port < ports; port++) {
          if (slot < portPixels[port].length) {
            const g = portPixels[port][slot];
            if (!seen.has(g)) {
              seen.add(g);
              order.push(g);
            }
          }
        }
      }
      if (order.length !== pixelCount) {
        for (let i = 0; i < pixelCount; i++) {
          if (!seen.has(i)) {
            seen.add(i);
            order.push(i);
          }
        }
      }
      return order;
    };
    const globalOrder = buildGlobalOrder();

    const canvasPixels = Math.max(pixelCount, cols * rows);
    const frames: Uint8Array[] = [];
    const rawFrames: Uint8Array[] = [];

    for (let f = 0; f < frameCount; f++) {
      const base = headerOffset + f * frameBytes;
      if (base >= size) break;
      const end = Math.min(size, base + frameBytes);
      const chunk = bytes.subarray(base, end);
      const phys = new Uint8Array(frameBytes);
      phys.set(chunk);

      const rgba = new Uint8Array(canvasPixels * 4);
      // Default transparent black.
      for (let i = 0; i < canvasPixels; i++) rgba[i * 4 + 3] = 255;

      for (let k = 0; k < pixelCount; k++) {
        const srcOff = k * channels;
        if (srcOff + channels > phys.length) break;
        const src = phys.subarray(srcOff, srcOff + channels);
        let rgb = decodeColor(src, colorOrder, channels);
        if (valueOffset !== null && valueOffset !== undefined) {
          rgb = [
            (rgb[0] - (valueOffset as number)) & 0xff,
            (rgb[1] - (valueOffset as number)) & 0xff,
            (rgb[2] - (valueOffset as number)) & 0xff,
          ];
        }
        const g = globalOrder[k] ?? k;
        const coord = coordMap[g] ?? { x: g % cols, y: Math.floor(g / cols) };
        const ci = coord.y * cols + coord.x;
        if (ci < 0 || ci >= canvasPixels) continue;
        const o = ci * 4;
        rgba[o] = rgb[0];
        rgba[o + 1] = rgb[1];
        rgba[o + 2] = rgb[2];
        rgba[o + 3] = 255;
      }

      frames.push(rgba);
      rawFrames.push(phys.slice());
    }

    if (!frames.length) return fail("No frames could be decoded", { fileSize: size, headerOffset });

    const result: LedDecodeResult = {
      ok: true,
      fileSize: size,
      headerOffset,
      frameCount: frames.length,
      frames,
      rawFrames,
      pixelsPerFrame: pixelCount,
      channels,
      cols,
      rows,
      fps,
      duration: frames.length / (fps || 1),
      colorOrder,
      portMode,
      stats: {
        fileSize: size,
        frames: frames.length,
        duration: frames.length / (fps || 1),
        pixelsPerFrame: pixelCount,
      },
    };
    result.frameBuffers = frames;
    result.decodedFrames = frames;
    result.rgbaFrames = frames;
    result.data = frames;
    return result;
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Failed to decode .led file");
  }
}

export function decodeLed(input: LedInput, options?: LedDecodeOptions): LedDecodeResult | Promise<LedDecodeResult> {
  if (typeof (input as any)?.arrayBuffer === "function") {
    return (input as Blob).arrayBuffer().then((b) => decodeLedBuffer(b, options));
  }
  const buf = input instanceof Uint8Array ? input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength) : (input as ArrayBuffer);
  return decodeLedBuffer(buf as ArrayBuffer, options);
}

export const decodeLedFile = decodeLed;
export const decodeLedBufferAlias = decodeLedBuffer;
export const readLed = decodeLed;
export const parseLed = decodeLed;

// Back-compat for callers expecting a class.
export class LedDecoder {
  static decode(input: LedInput, options?: LedDecodeOptions) {
    return decodeLed(input, options);
  }
  decode(input: LedInput, options?: LedDecodeOptions) {
    return decodeLed(input, options);
  }
}

export default {
  decodeLed,
  decodeLedBuffer,
  decodeLedFile,
  readLed,
  parseLed,
  LedDecoder,
};