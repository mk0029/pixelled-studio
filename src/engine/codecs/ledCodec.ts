/**
 * Profile-driven .led byte codec. Dependency-free so Node verification scripts
 * can import it directly. The byte-exact LEDEdit 2014 writer stays in
 * ledEdit2014Codec.ts; this module is the configurable, probed fallback.
 */

export type LedChannelOrder = "RGB" | "GRB" | "BRG" | "RBG" | "GBR" | "BGR" | "GRBW";

export interface ControllerBinaryProfile {
  id: string;
  headerSize: number;
  magicHeader: string;
  channelOrder: LedChannelOrder;
  /** On-wire byte used for unused LED slots / padding. */
  idleFillByte: number;
  /** Repeating byte mask applied during frame packing. Empty = no mask. */
  xorMask?: number[];
  sectorAlignment: number;
  portCount: number;
  maxPixelsPerPort: number;
  /** LEDEdit connection patterns 1-9 (see LayoutsPanel). */
  wiringPattern?: number;
  /** Horizontal or vertical travel for pattern 9. */
  wiringOrientation?: "horizontal" | "vertical";
  /** Big-endian u16 frame-count field in the header. */
  frameCountOffset?: number;
}

export const T1000S_WS2811_PROFILE: ControllerBinaryProfile = {
  id: "t1000s_ws2811",
  headerSize: 512,
  magicHeader: "rzbv001",
  channelOrder: "RGB",
  idleFillByte: 0x00,
  xorMask: [],
  sectorAlignment: 512,
  portCount: 1,
  maxPixelsPerPort: 2048,
  wiringPattern: 3,
  frameCountOffset: 0x0c,
};

export const T8000A_INTERLEAVED_PROFILE: ControllerBinaryProfile = {
  ...T1000S_WS2811_PROFILE,
  id: "t8000a_interleaved",
  portCount: 8,
  maxPixelsPerPort: 1024,
};

export const DEFAULT_LED_PROFILE = T1000S_WS2811_PROFILE;

const CHANNELS: Record<LedChannelOrder, number> = {
  RGB: 3, GRB: 3, BRG: 3, RBG: 3, GBR: 3, BGR: 3, GRBW: 4,
};

/** Position of R, G, B inside one on-wire pixel. */
const ORDER: Record<LedChannelOrder, [number, number, number]> = {
  RGB: [0, 1, 2], GRB: [1, 0, 2], BRG: [2, 0, 1],
  RBG: [0, 2, 1], GBR: [1, 2, 0], BGR: [2, 1, 0], GRBW: [0, 1, 2],
};

export interface LedCodecMeta {
  profileId: string;
  fileSize: number;
  headerSize: number;
  frameBytes: number;
  frameCount: number;
  declaredFrames: number | null;
  pixelCount: number;
  channels: number;
  channelOrder: LedChannelOrder;
  wiringPattern: number;
  portsUsed: number;
  masked: boolean;
}

export interface LedCodecDecodeSuccess {
  ok: true;
  /** RGBA frames, width * height * 4 bytes each. */
  frames: Uint8Array[];
  width: number;
  height: number;
  meta: LedCodecMeta;
  // Aliases used by the existing import pipeline.
  frameCount: number;
  cols: number;
  rows: number;
  rgbaFrames: Uint8Array[];
  frameBuffers: Uint8Array[];
  pixelsPerFrame: number;
  fps: number;
  duration: number;
  fileSize: number;
  headerOffset: number;
  channels: number;
  colorOrder: string;
  stats: { fileSize: number; frames: number; duration: number; pixelsPerFrame: number };
}

export interface LedCodecFailure { ok: false; error: string }
export type LedCodecResult = LedCodecDecodeSuccess | LedCodecFailure;

export interface LedCodecDecodeOptions {
  profile?: ControllerBinaryProfile;
  width?: number;
  height?: number;
  fps?: number;
  maxFrames?: number;
}

export interface LedCodecEncodeOptions {
  profile?: ControllerBinaryProfile;
  width: number;
  height: number;
  /** RGBA frames. */
  frames: Uint8Array[];
  frameCount?: number;
}

const clampInt = (value: unknown, min: number, max: number, fallback: number): number => {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

function maskAt(profile: ControllerBinaryProfile, offset: number): number {
  const mask = profile.xorMask ?? [];
  return mask.length ? (mask[offset % mask.length] & 0xff) : 0;
}

function asc(n: number): number[] { return Array.from({ length: n }, (_, i) => i); }
function desc(n: number): number[] { return asc(n).reverse(); }

/** 1D wire slot -> raster pixel index (y * width + x). */
export function buildProfileWireOrder(
  profile: ControllerBinaryProfile,
  width: number,
  height: number,
): number[] {
  const pattern = clampInt(profile.wiringPattern, 1, 9, 3);
  const order: number[] = [];
  const push = (x: number, y: number) => {
    if (x >= 0 && x < width && y >= 0 && y < height) order.push(y * width + x);
  };

  if (pattern === 9) {
    if (profile.wiringOrientation === "vertical") {
      for (const x of asc(width)) for (const y of asc(height)) push(x, y);
    } else {
      for (const y of asc(height)) for (const x of asc(width)) push(x, y);
    }
    return order;
  }

  const vertical = pattern === 3 || pattern === 4 || pattern === 7 || pattern === 8;
  const startLeft = pattern === 1 || pattern === 3 || pattern === 5 || pattern === 7;
  const startTop = pattern <= 4;
  const reverseAxis = vertical ? !startLeft : !startTop;
  const reverseWithin = vertical ? !startTop : !startLeft;
  const axisCount = vertical ? width : height;
  const withinCount = vertical ? height : width;
  const axes = reverseAxis ? desc(axisCount) : asc(axisCount);

  axes.forEach((axis, i) => {
    const reverse = pattern !== 9 && i % 2 === 1 ? !reverseWithin : reverseWithin;
    const within = reverse ? desc(withinCount) : asc(withinCount);
    for (const b of within) vertical ? push(axis, b) : push(b, axis);
  });
  return order;
}

function frameGeometry(profile: ControllerBinaryProfile, width: number, height: number) {
  const pixelCount = width * height;
  const channels = CHANNELS[profile.channelOrder] ?? 3;
  const alignment = Math.max(1, clampInt(profile.sectorAlignment, 1, 1 << 20, 512));
  const frameBytes = Math.max(alignment, Math.ceil((pixelCount * channels) / alignment) * alignment);
  return { pixelCount, channels, alignment, frameBytes };
}

/** Safe decoder: malformed files return { ok:false, error } and never throw. */
export function decodeLedBuffer(
  input: Uint8Array | ArrayBuffer,
  options: LedCodecDecodeOptions = {},
): LedCodecResult {
  try {
    const bytes = input instanceof Uint8Array ? input : new Uint8Array(input as ArrayBuffer);
    const profile = options.profile ?? DEFAULT_LED_PROFILE;
    const width = clampInt(options.width, 1, 1 << 16, 0);
    const height = clampInt(options.height, 1, 1 << 16, 0);
    if (!width || !height || !Number.isFinite(width) || !Number.isFinite(height)) {
      return { ok: false, error: "A valid width and height are required" };
    }
    if (!bytes.byteLength) return { ok: false, error: "Empty or invalid .led file" };

    const headerSize = clampInt(profile.headerSize, 0, 1 << 20, 512);
    const { pixelCount, channels, frameBytes } = frameGeometry(profile, width, height);
    if (bytes.length <= headerSize) return { ok: false, error: "No frame data found in .led file" };
    const payload = bytes.length - headerSize;
    if (payload % frameBytes !== 0) {
      return {
        ok: false,
        error: `Truncated .led file: ${payload} B after ${headerSize} B header is not a whole number of ${frameBytes} B frames`,
      };
    }

    const physicalFrames = payload / frameBytes;
    const maxFrames = clampInt(options.maxFrames, 1, 1 << 20, 100000);
    const frameCount = Math.min(physicalFrames, maxFrames);
    if (!frameCount) return { ok: false, error: "No frames could be decoded" };

    const magic = profile.magicHeader || "";
    if (magic && headerSize >= magic.length) {
      for (let i = 0; i < magic.length; i++) {
        if (bytes[i] !== magic.charCodeAt(i)) {
          return { ok: false, error: `Unexpected magic: expected "${magic}"` };
        }
      }
    }

    const order = buildProfileWireOrder(profile, width, height);
    if (order.length < pixelCount) return { ok: false, error: "Wiring map does not cover the whole matrix" };
    const [r, g, b] = ORDER[profile.channelOrder] ?? ORDER.RGB;
    const fps = clampInt(options.fps, 1, 240, 25);
    const frames: Uint8Array[] = [];
    const masked = (profile.xorMask?.length ?? 0) > 0;

    for (let f = 0; f < frameCount; f++) {
      const base = headerSize + f * frameBytes;
      const rgba = new Uint8Array(pixelCount * 4);
      for (let slot = 0; slot < pixelCount; slot++) {
        const raster = order[slot];
        const src = base + slot * channels;
        if (src + channels > base + frameBytes) break;
        const off = raster * 4;
        rgba[off] = bytes[src + r] ^ maskAt(profile, slot * channels + r);
        rgba[off + 1] = bytes[src + g] ^ maskAt(profile, slot * channels + g);
        rgba[off + 2] = bytes[src + b] ^ maskAt(profile, slot * channels + b);
        rgba[off + 3] = 255;
      }
      frames.push(rgba);
    }

    const declaredOffset = profile.frameCountOffset;
    const declaredFrames = declaredOffset != null && declaredOffset + 1 < headerSize
      ? (bytes[declaredOffset] << 8) | bytes[declaredOffset + 1]
      : null;
    const fileSize = bytes.length;
    const duration = frameCount / fps;
    const meta: LedCodecMeta = {
      profileId: profile.id,
      fileSize,
      headerSize,
      frameBytes,
      frameCount,
      declaredFrames,
      pixelCount,
      channels,
      channelOrder: profile.channelOrder,
      wiringPattern: clampInt(profile.wiringPattern, 1, 9, 3),
      portsUsed: Math.min(Math.max(1, profile.portCount), Math.ceil(pixelCount / Math.max(1, profile.maxPixelsPerPort))),
      masked,
    };

    return {
      ok: true,
      frames,
      width,
      height,
      meta,
      frameCount,
      cols: width,
      rows: height,
      rgbaFrames: frames,
      frameBuffers: frames,
      pixelsPerFrame: pixelCount,
      fps,
      duration,
      fileSize,
      headerOffset: headerSize,
      channels,
      colorOrder: profile.channelOrder,
      stats: { fileSize, frames: frameCount, duration, pixelsPerFrame: pixelCount },
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to decode .led file" };
  }
}

/** Profile encoder. Throws only for programmer errors (bad frame sizes). */
export function encodeLedBuffer(options: LedCodecEncodeOptions): Uint8Array {
  const profile = options.profile ?? DEFAULT_LED_PROFILE;
  const width = clampInt(options.width, 1, 1 << 16, 0);
  const height = clampInt(options.height, 1, 1 << 16, 0);
  if (!width || !height) throw new Error("A valid width and height are required");
  if (!options.frames.length) throw new Error("No frames to encode");

  const { pixelCount, channels, alignment, frameBytes } = frameGeometry(profile, width, height);
  const headerSize = clampInt(profile.headerSize, 0, 1 << 20, 512);
  const count = clampInt(options.frameCount ?? options.frames.length, 0, 65535, options.frames.length);
  const out = new Uint8Array(headerSize + count * frameBytes);
  out.fill(profile.idleFillByte & 0xff, headerSize);
  out.fill(0, 0, headerSize);

  const magic = profile.magicHeader || "";
  if (magic && headerSize >= magic.length) {
    for (let i = 0; i < magic.length; i++) out[i] = magic.charCodeAt(i) & 0xff;
  }
  if (profile.frameCountOffset != null && profile.frameCountOffset + 1 < headerSize) {
    out[profile.frameCountOffset] = (count >> 8) & 0xff;
    out[profile.frameCountOffset + 1] = count & 0xff;
  }

  const order = buildProfileWireOrder(profile, width, height);
  if (order.length < pixelCount) throw new Error("Wiring map does not cover the whole matrix");
  const [r, g, b] = ORDER[profile.channelOrder] ?? ORDER.RGB;

  options.frames.slice(0, count).forEach((frame, f) => {
    if (frame.length < pixelCount * 4) throw new Error(`Frame ${f} must be ${pixelCount * 4} RGBA bytes`);
    const base = headerSize + f * frameBytes;
    for (let slot = 0; slot < pixelCount; slot++) {
      const raster = order[slot];
      const src = raster * 4;
      const dst = base + slot * channels;
      const values = [frame[src + r], frame[src + g], frame[src + b]];
      if (channels === 4) values.push(0);
      for (let c = 0; c < channels; c++) {
        out[dst + c] = (values[c] ^ maskAt(profile, slot * channels + c)) & 0xff;
      }
    }
  });
  return out;
}

export default { decodeLedBuffer, encodeLedBuffer, buildProfileWireOrder, DEFAULT_LED_PROFILE };
