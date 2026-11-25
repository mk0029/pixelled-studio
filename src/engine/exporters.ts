import { renderFrame } from "./compositor";
import { preloadMedia } from "./mediaRenderer";
import { exportAviUncompressed } from "./aviEncoder";
import { buildFseqBytes } from "./codecs/fseq";
import type { TolProgram } from "./codecs/tolDecoder";
import type { WiringMap } from "./wiringMapper";
import { effectiveDuration } from "@/types/project";
import type { Project } from "@/types/project";

export type ExportFormat = "zip" | "avi" | "avi-raw" | "fseq" | "gif" | "swf" | "bin";

export type LedTestPattern = "solid" | "horizontal" | "vertical" | "checker" | "walk";

export interface ExportOptions {
  /** Pixels per LED in raster exports. */
  scale: number;
  onProgress?: (done: number, total: number, phase: string) => void;
}



/** Audio-reactive layers render at a fixed neutral level offline. */
const OFFLINE_AUDIO = 0.5;

const frameCount = (p: Project) => Math.max(1, Math.round(effectiveDuration(p) * Math.max(1, p.fps)));
const safeName = (name: string) => name.replace(/[^\w-]+/g, "_").replace(/^_+|_+$/g, "") || "show";
const tick = () => new Promise<void>((r) => setTimeout(r, 0));

function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w));
  canvas.height = Math.max(1, Math.round(h));
  return canvas;
}

/** RGB frame buffer (3 bytes/px) → RGBA ImageData for canvas painting. */
function frameToImageData(frame: Uint8ClampedArray, cols: number, rows: number): ImageData {
  const data = new Uint8ClampedArray(cols * rows * 4);
  for (let i = 0, j = 0; i < cols * rows; i++, j += 3) {
    data[i * 4] = frame[j];
    data[i * 4 + 1] = frame[j + 1];
    data[i * 4 + 2] = frame[j + 2];
    data[i * 4 + 3] = 255;
  }
  return new ImageData(data, cols, rows);
}

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Canvas export failed"))), type, quality);
  });
}

/** Physical stream bytes for one frame, honouring colour order. */
function physicalBytes(
  frame: Uint8ClampedArray,
  map: WiringMap,
  cols: number,
  colorOrder: string,
  channels: number,
): Uint8Array {
  const out = new Uint8Array(map.pixels.length * channels);
  for (const px of map.pixels) {
    const q = (px.y * cols + px.x) * 3;
    const o = px.index * channels;
    const rgb: Record<string, number> = { R: frame[q], G: frame[q + 1], B: frame[q + 2] };
    for (let c = 0; c < 3; c++) out[o + c] = rgb[colorOrder[c]] ?? 0;
    if (channels === 4) out[o + 3] = 0;
  }
  return out;
}

function wiringCsv(map: WiringMap): string {
  const lines = ["index,port,localIndex,x,y"];
  for (const p of map.pixels) lines.push(`${p.index},${p.port},${p.localIndex},${p.x},${p.y}`);
  return lines.join("\n");
}

/** Renders every frame into a ZIP of PNGs plus project, manifest and wiring CSV. */
export async function exportFrameZip(project: Project, map: WiringMap, opts: ExportOptions): Promise<void> {
  await preloadMedia(project);
  const { preloadProjectFonts } = await import("./fontFamilies");
  await preloadProjectFonts(project);
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  const { cols, rows } = project.hardware;
  const scale = Math.max(1, Math.min(32, Math.round(opts.scale)));
  const total = frameCount(project);
  const small = makeCanvas(cols, rows);
  const sctx = small.getContext("2d")!;
  const big = makeCanvas(cols * scale, rows * scale);
  const bctx = big.getContext("2d")!;
  bctx.imageSmoothingEnabled = false;
  const folder = zip.folder("frames")!;

  for (let i = 0; i < total; i++) {
    const frame = renderFrame(project, i / project.fps, map, OFFLINE_AUDIO);
    sctx.putImageData(frameToImageData(frame, cols, rows), 0, 0);
    bctx.clearRect(0, 0, big.width, big.height);
    bctx.drawImage(small, 0, 0, big.width, big.height);
    folder.file(`frame_${String(i).padStart(5, "0")}.png`, await canvasBlob(big, "image/png"));
    opts.onProgress?.(i + 1, total, "render");
    if (i % 4 === 3) await tick();
  }

  zip.file("project.json", JSON.stringify(project, null, 2));
  zip.file(
    "manifest.json",
    JSON.stringify(
      {
        name: project.name,
        cols,
        rows,
        fps: project.fps,
        duration: effectiveDuration(project),
        frameCount: total,
        controller: project.hardware.controllerId,
        chipset: project.hardware.chipsetId,
        colorOrder: project.hardware.colorOrder,
        pixelCount: map.totalPixels,
        scale,
      },
      null,
      2,
    ),
  );
  zip.file("wiring.csv", wiringCsv(map));

  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" }, (meta) =>
    opts.onProgress?.(total, total, `zip ${Math.round(meta.percent)}%`),
  );
  download(blob, `${safeName(project.name)}_frames.zip`);
}

/** Motion-JPEG AVI: small, standard, plays in any media player. */
export async function exportAvi(project: Project, map: WiringMap, opts: ExportOptions): Promise<void> {
  await preloadMedia(project);
  const { preloadProjectFonts } = await import("./fontFamilies");
  await preloadProjectFonts(project);
  const { cols, rows } = project.hardware;
  const total = frameCount(project);
  const scale = Math.max(1, Math.min(32, Math.round(opts.scale)));
  const W = cols * scale;
  const H = rows * scale;
  const fps = Math.max(1, Math.round(project.fps));
  const small = makeCanvas(cols, rows);
  const sctx = small.getContext("2d")!;
  const big = makeCanvas(W, H);
  const bctx = big.getContext("2d")!;
  bctx.imageSmoothingEnabled = false;

  const jpegs: Uint8Array[] = [];
  let maxJpeg = 0;
  for (let i = 0; i < total; i++) {
    const frame = renderFrame(project, i / fps, map, OFFLINE_AUDIO);
    sctx.putImageData(frameToImageData(frame, cols, rows), 0, 0);
    bctx.clearRect(0, 0, W, H);
    bctx.drawImage(small, 0, 0, W, H);
    const blob = await canvasBlob(big, "image/jpeg", 0.85);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    jpegs.push(bytes);
    maxJpeg = Math.max(maxJpeg, bytes.length);
    opts.onProgress?.(i + 1, total, "render");
    if (i % 4 === 3) await tick();
  }

  const chunkLen = (n: number) => 8 + n + (n & 1);
  const moviData = 4 + jpegs.reduce((sum, j) => sum + chunkLen(j.length), 0);
  const moviList = 8 + moviData;
  const hdrl = 200;
  const idx1 = 8 + total * 16;
  const riff = 4 + hdrl + moviList + idx1;
  const file = new Uint8Array(8 + riff);
  const view = new DataView(file.buffer);
  let pos = 0;

  const fourcc = (s: string) => {
    for (let i = 0; i < 4; i++) file[pos++] = s.charCodeAt(i);
  };
  const u32 = (v: number) => { view.setUint32(pos, v >>> 0, true); pos += 4; };
  const u16 = (v: number) => { view.setUint16(pos, v & 0xffff, true); pos += 2; };

  fourcc("RIFF"); u32(riff); fourcc("AVI ");

  fourcc("LIST"); u32(4 + 64 + 124); fourcc("hdrl");
  fourcc("avih"); u32(56);
  u32(Math.round(1e6 / fps));
  u32(maxJpeg * fps);
  u32(0);
  u32(0x10 | 0x100);
  u32(total);
  u32(0);
  u32(1);
  u32(maxJpeg);
  u32(W); u32(H);
  u32(0); u32(0); u32(0); u32(0);

  fourcc("LIST"); u32(4 + 64 + 48); fourcc("strl");
  fourcc("strh"); u32(56);
  fourcc("vids"); fourcc("MJPG");
  u32(0);
  u16(0); u16(0);
  u32(0);
  u32(1); u32(fps);
  u32(0); u32(total);
  u32(maxJpeg);
  u32(0xffffffff);
  u32(0);
  u16(0); u16(0); u16(W); u16(H);

  fourcc("strf"); u32(40);
  u32(40); u32(W); u32(H);
  u16(1); u16(24);
  u32(0x47504a4d); // 'MJPG'
  u32(maxJpeg);
  u32(0); u32(0);
  u32(0); u32(0);

  fourcc("LIST"); u32(moviData); fourcc("movi");
  const moviBase = pos - 4;
  const offsets: number[] = [];
  for (const jpeg of jpegs) {
    offsets.push(pos - moviBase);
    fourcc("00dc"); u32(jpeg.length);
    file.set(jpeg, pos);
    pos += jpeg.length;
    if (jpeg.length & 1) file[pos++] = 0;
  }

  fourcc("idx1"); u32(total * 16);
  for (let i = 0; i < total; i++) {
    fourcc("00dc");
    u32(0x10);
    u32(offsets[i]);
    u32(jpegs[i].length);
  }

  download(new Blob([file], { type: "video/x-msvideo" }), `${safeName(project.name)}.avi`);
}



/** Raw little-endian frame dump for custom drivers and WLED-style pipelines. */
export async function exportBin(project: Project, map: WiringMap, opts: ExportOptions): Promise<void> {
  await preloadMedia(project);
  const { preloadProjectFonts } = await import("./fontFamilies");
  await preloadProjectFonts(project);
  const { cols, rows, colorOrder, chipsetId } = project.hardware;
  const channels = chipsetId === "SK6812" ? 4 : 3;
  const total = frameCount(project);
  const headerSize = 24;
  const frameBytes = map.pixels.length * channels;
  const file = new Uint8Array(headerSize + total * frameBytes);
  const view = new DataView(file.buffer);
  file.set([0x54, 0x4f, 0x48, 0x42, 0x49, 0x4e, 0x31, 0x00], 0); // TOHBIN1\0
  view.setUint16(8, 1, true);
  view.setUint16(10, cols, true);
  view.setUint16(12, rows, true);
  view.setUint16(14, Math.max(1, Math.round(project.fps)), true);
  view.setUint8(16, channels);
  view.setUint8(17, 0);
  view.setUint16(18, 0, true);
  view.setUint32(20, total, true);

  let pos = headerSize;
  for (let i = 0; i < total; i++) {
    const frame = renderFrame(project, i / project.fps, map, OFFLINE_AUDIO);
    file.set(physicalBytes(frame, map, cols, colorOrder, channels), pos);
    pos += frameBytes;
    opts.onProgress?.(i + 1, total, "render");
    if (i % 4 === 3) await tick();
  }
  download(new Blob([file], { type: "application/octet-stream" }), `${safeName(project.name)}.bin`);
}

/** FSEQ v2 uncompressed sequence: one channel byte per LED channel, in physical wiring order. */
export async function exportFseq(project: Project, map: WiringMap, opts: ExportOptions): Promise<void> {
  await preloadMedia(project);
  const { preloadProjectFonts } = await import("./fontFamilies");
  await preloadProjectFonts(project);
  const { cols, colorOrder, chipsetId } = project.hardware;
  const channels = chipsetId === "SK6812" ? 4 : 3;
  const total = frameCount(project);
  const fps = Math.max(1, Math.round(project.fps));
  const frames: Uint8Array[] = [];

  for (let i = 0; i < total; i++) {
    const frame = renderFrame(project, i / fps, map, OFFLINE_AUDIO);
    frames.push(physicalBytes(frame, map, cols, colorOrder, channels));
    opts.onProgress?.(i + 1, total, "fseq");
    if (i % 4 === 3) await tick();
  }
  const bytes = buildFseqBytes(frames, Math.max(1, map.pixels.length * channels), fps);
  download(new Blob([bytes], { type: "application/octet-stream" }), `${safeName(project.name)}.fseq`);
}

/** Animated GIF at one output pixel per LED (times the chosen scale). */
export async function exportGif(project: Project, map: WiringMap, opts: ExportOptions): Promise<void> {
  await preloadMedia(project);
  const { preloadProjectFonts } = await import("./fontFamilies");
  await preloadProjectFonts(project);
  const { GIFEncoder, quantize, applyPalette } = await import("gifenc");
  const { cols, rows } = project.hardware;
  const total = frameCount(project);
  const scale = Math.max(1, Math.min(12, Math.round(opts.scale)));
  const W = cols * scale;
  const H = rows * scale;
  const fps = Math.max(1, Math.round(project.fps));
  const small = makeCanvas(cols, rows);
  const sctx = small.getContext("2d")!;
  const big = makeCanvas(W, H);
  const bctx = big.getContext("2d", { willReadFrequently: true })!;
  bctx.imageSmoothingEnabled = false;
  const gif = GIFEncoder();

  for (let i = 0; i < total; i++) {
    const frame = renderFrame(project, i / fps, map, OFFLINE_AUDIO);
    sctx.putImageData(frameToImageData(frame, cols, rows), 0, 0);
    bctx.clearRect(0, 0, W, H);
    bctx.drawImage(small, 0, 0, W, H);
    const rgba = bctx.getImageData(0, 0, W, H).data;
    const palette = quantize(rgba, 256);
    const index = applyPalette(rgba, palette);
    gif.writeFrame(index, W, H, {
      palette,
      delay: Math.max(20, Math.round(1000 / fps)),
      repeat: i === 0 ? 0 : undefined,
    });
    opts.onProgress?.(i + 1, total, "gif");
    if (i % 4 === 3) await tick();
  }

  gif.finish();
  download(new Blob([gif.bytes()], { type: "image/gif" }), `${safeName(project.name)}.gif`);
}

function concatBytes(parts: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let pos = 0;
  for (const p of parts) { out.set(p, pos); pos += p.length; }
  return out;
}

/** SWF RECT with 18-bit values (up to 6553 px), enough for a scaled LED grid. */
function swfRect(widthTwips: number, heightTwips: number): Uint8Array {
  const bits: number[] = [];
  const write = (v: number, n: number) => {
    for (let i = n - 1; i >= 0; i--) bits.push((v >> i) & 1);
  };
  write(18, 5);
  write(0, 18);
  write(widthTwips, 18);
  write(0, 18);
  write(heightTwips, 18);
  const out = new Uint8Array(Math.ceil(bits.length / 8));
  bits.forEach((b, i) => { out[i >> 3] |= b << (7 - (i & 7)); });
  return out;
}

function swfTag(code: number, body: Uint8Array): Uint8Array {
  if (body.length < 0x3f) {
    const out = new Uint8Array(2 + body.length);
    const v = (code << 6) | body.length;
    out[0] = v & 0xff;
    out[1] = v >> 8;
    out.set(body, 2);
    return out;
  }
  const out = new Uint8Array(6 + body.length);
  const v = (code << 6) | 0x3f;
  out[0] = v & 0xff;
  out[1] = v >> 8;
  const n = body.length;
  out[2] = n & 0xff;
  out[3] = (n >>> 8) & 0xff;
  out[4] = (n >>> 16) & 0xff;
  out[5] = (n >>> 24) & 0xff;
  out.set(body, 6);
  return out;
}

async function deflateZlib(data: Uint8Array<ArrayBuffer>): Promise<Uint8Array> {
  const stream = new Blob([data]).stream().pipeThrough(new CompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/**
 * Bitmap-timeline SWF: one DefineBitsLossless2 character per frame,
 * replaced on depth 1 each ShowFrame. Stage size = cols x rows LEDs at
 * `scale` pixels per LED, frame rate and frame count from the project.
 */
export async function exportSwf(project: Project, map: WiringMap, opts: ExportOptions): Promise<void> {
  await preloadMedia(project);
  const { preloadProjectFonts } = await import("./fontFamilies");
  await preloadProjectFonts(project);
  const { cols, rows } = project.hardware;
  const total = Math.min(65535, frameCount(project));
  const scale = Math.max(1, Math.min(10, Math.round(opts.scale || 8)));
  const W = cols * scale;
  const H = rows * scale;
  const fps = Math.max(1, Math.round(project.fps));
  const small = makeCanvas(cols, rows);
  const sctx = small.getContext("2d")!;
  const big = makeCanvas(W, H);
  const bctx = big.getContext("2d", { willReadFrequently: true })!;
  bctx.imageSmoothingEnabled = false;
  const tags: Uint8Array[] = [swfTag(9, new Uint8Array([0, 0, 0]))];

  for (let i = 0; i < total; i++) {
    const frame = renderFrame(project, i / fps, map, OFFLINE_AUDIO);
    sctx.putImageData(frameToImageData(frame, cols, rows), 0, 0);
    bctx.clearRect(0, 0, W, H);
    bctx.drawImage(small, 0, 0, W, H);
    const rgba = bctx.getImageData(0, 0, W, H).data;
    const argb = new Uint8Array(W * H * 4);
    for (let p = 0, q = 0; p < W * H; p++, q += 4) {
      argb[q] = 255;
      argb[q + 1] = rgba[q];
      argb[q + 2] = rgba[q + 1];
      argb[q + 3] = rgba[q + 2];
    }
    const compressed = await deflateZlib(argb);
    const define = new Uint8Array(7 + compressed.length);
    const dv = new DataView(define.buffer);
    dv.setUint16(0, i + 1, true);
    define[2] = 5; // 32-bit ARGB
    dv.setUint16(3, W, true);
    dv.setUint16(5, H, true);
    define.set(compressed, 7);
    tags.push(swfTag(36, define));

    const place = new Uint8Array(5);
    place[0] = i === 0 ? 0x02 : 0x03; // HasCharacter (+ Move after frame 1)
    new DataView(place.buffer).setUint16(1, 1, true); // depth
    new DataView(place.buffer).setUint16(3, i + 1, true); // character id
    tags.push(swfTag(26, place));
    tags.push(swfTag(1, new Uint8Array(0))); // ShowFrame
    opts.onProgress?.(i + 1, total, "swf");
    if (i % 4 === 3) await tick();
  }
  tags.push(swfTag(0, new Uint8Array(0)));

  const body = concatBytes(tags);
  const rect = swfRect(W * 20, H * 20);
  const header = new Uint8Array(8 + rect.length + 4);
  header.set([0x46, 0x57, 0x53, 10], 0); // FWS, version 10
  new DataView(header.buffer).setUint32(4, header.length + body.length, true);
  header.set(rect, 8);
  const fpsView = new DataView(header.buffer);
  fpsView.setUint16(8 + rect.length, Math.min(65535, fps * 256), true);
  fpsView.setUint16(8 + rect.length + 2, total, true);

  download(
    new Blob([header, body], { type: "application/x-shockwave-flash" }),
    `${safeName(project.name)}.swf`,
  );
}


export function runExport(project: Project, map: WiringMap, format: ExportFormat, opts: ExportOptions): Promise<void> {
  switch (format) {
    case "zip": return exportFrameZip(project, map, opts);
    case "avi": return exportAvi(project, map, opts);
    case "avi-raw": return exportAviUncompressed(project, map, opts);
    case "fseq": return exportFseq(project, map, opts);
    case "gif": return exportGif(project, map, opts);
    case "swf": return exportSwf(project, map, opts);
    case "bin": return exportBin(project, map, opts);
  }
}
