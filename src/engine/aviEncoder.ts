import { renderFrame } from "./compositor";
import { preloadMedia } from "./mediaRenderer";
import type { WiringMap } from "./wiringMapper";
import type { Project } from "@/types/project";
import type { ExportOptions } from "./exporters";

const OFFLINE_AUDIO = 0.5;
const frameCount = (p: Project) => Math.max(1, Math.round(p.duration * Math.max(1, p.fps)));
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

/**
 * Uncompressed 24-bit BGR (BI_RGB) AVI v1.0 — the universal LEDEdit import format.
 * Bottom-up scanlines, DWORD-padded, with idx1 index table. LEDEdit's VFW parser
 * opens this via File -> Open (.avi) with zero distortion at matrixWidth x matrixHeight.
 */
export async function exportAviUncompressed(project: Project, map: WiringMap, opts: ExportOptions): Promise<void> {
  await preloadMedia(project);
  const { cols, rows } = project.hardware;
  const total = frameCount(project);
  const scale = Math.max(1, Math.min(32, Math.round(opts.scale)));
  const W = cols * scale;
  const H = rows * scale;
  const fps = Math.max(1, Math.round(project.fps));
  const small = document.createElement("canvas");
  small.width = cols; small.height = rows;
  const sctx = small.getContext("2d")!;
  const big = document.createElement("canvas");
  big.width = W; big.height = H;
  const bctx = big.getContext("2d", { willReadFrequently: true })!;
  bctx.imageSmoothingEnabled = false;

  const rowStride = (W * 3 + 3) & ~3;
  const frameSize = rowStride * H;
  const frames: Uint8Array[] = [];

  for (let i = 0; i < total; i++) {
    const frame = renderFrame(project, i / fps, map, OFFLINE_AUDIO);
    const rgba = new Uint8ClampedArray(cols * rows * 4);
    for (let j = 0, k = 0; j < cols * rows; j++, k += 3) {
      rgba[j * 4] = frame[k]; rgba[j * 4 + 1] = frame[k + 1]; rgba[j * 4 + 2] = frame[k + 2]; rgba[j * 4 + 3] = 255;
    }
    sctx.putImageData(new ImageData(rgba, cols, rows), 0, 0);
    bctx.clearRect(0, 0, W, H);
    bctx.drawImage(small, 0, 0, W, H);
    const data = bctx.getImageData(0, 0, W, H).data;

    // Bottom-up BGR24, DWORD-aligned rows.
    const buf = new Uint8Array(frameSize);
    for (let y = 0; y < H; y++) {
      const srcRow = (H - 1 - y) * W * 4;
      const dstRow = y * rowStride;
      for (let x = 0; x < W; x++) {
        const s = srcRow + x * 4;
        const d = dstRow + x * 3;
        buf[d] = data[s + 2];     // B
        buf[d + 1] = data[s + 1]; // G
        buf[d + 2] = data[s];     // R
      }
    }
    frames.push(buf);
    opts.onProgress?.(i + 1, total, "render");
    if (i % 4 === 3) await tick();
  }

  const moviData = 4 + frames.reduce((sum, f) => sum + 8 + f.length + (f.length & 1), 0);
  const moviListSize = 4 + moviData;
  const hdrlSize = 4 + (4 + 56) + (4 + 56 + 4 + 40); // avih + strl(strh+strf)
  // avih 56, strh 56, strf 40
  const riffSize = 4 + (8 + 4 + 56 + 8 + 4 + 56 + 8 + 40) + (8 + moviData) + (8 + total * 16);
  const file = new Uint8Array(8 + riffSize);
  const view = new DataView(file.buffer);
  let pos = 0;
  const fourcc = (s: string) => { for (let i = 0; i < 4; i++) file[pos++] = s.charCodeAt(i); };
  const u32 = (v: number) => { view.setUint32(pos, v >>> 0, true); pos += 4; };
  const u16 = (v: number) => { view.setUint16(pos, v & 0xffff, true); pos += 2; };

  fourcc("RIFF"); u32(riffSize); fourcc("AVI ");
  // hdrl
  fourcc("LIST"); u32(4 + 56 + 8 + 4 + 56 + 8 + 40); fourcc("hdrl");
  fourcc("avih"); u32(56);
  u32(Math.round(1e6 / fps));   // dwMicroSecPerFrame
  u32(W * H * 3 * fps);         // dwMaxBytesPerSec
  u32(0);                       // dwPaddingGranularity
  u32(0x10);                    // dwFlags (AVIF_HASINDEX)
  u32(total);                   // dwTotalFrames
  u32(0);                       // dwInitialFrames
  u32(1);                       // dwStreams
  u32(frameSize);               // dwSuggestedBufferSize
  u32(W); u32(H);
  u32(0); u32(0); u32(0); u32(0); // dwReserved

  // strl
  fourcc("LIST"); u32(4 + 56 + 8 + 40); fourcc("strl");
  fourcc("strh"); u32(56);
  fourcc("vids"); fourcc("DIB "); // handler
  u32(0); u16(0); u16(0);
  u32(0);
  u32(1); u32(fps);            // dwScale, dwRate
  u32(0); u32(total);
  u32(frameSize);
  u32(0xffffffff); u32(0);
  u16(0); u16(0); u16(W); u16(H);

  fourcc("strf"); u32(40);
  u32(40); u32(W); u32(H);
  u16(1); u16(24);
  u32(0); // BI_RGB
  u32(frameSize);
  u32(0); u32(0);
  u32(0); u32(0);

  // movi
  fourcc("LIST"); u32(moviData); fourcc("movi");
  const moviBase = pos - 4;
  const offsets: number[] = [];
  for (const f of frames) {
    offsets.push(pos - moviBase);
    fourcc("00db"); u32(f.length);
    file.set(f, pos);
    pos += f.length;
    if (f.length & 1) file[pos++] = 0;
  }

  // idx1
  fourcc("idx1"); u32(total * 16);
  for (let i = 0; i < total; i++) {
    fourcc("00db");
    u32(0x10);
    u32(offsets[i]);
    u32(frames[i].length);
  }

  download(new Blob([file], { type: "video/x-msvideo" }), `${safeName(project.name)}_uncompressed.avi`);
}
