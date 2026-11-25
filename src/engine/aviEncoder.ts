import { renderFrame } from "./compositor";
import { preloadMedia } from "./mediaRenderer";
import { exportFramesToAvi } from "@/lib/aviExporter";
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
 * LEDEdit interchange: one BGR24 pixel per LED at the exact matrix size.
 * Rendering uses an offscreen canvas so preview scaling can never leak in.
 */
export async function exportAviUncompressed(project: Project, _map: WiringMap, opts: ExportOptions): Promise<void> {
  await preloadMedia(project);
  const { preloadProjectFonts } = await import("./fontFamilies");
  await preloadProjectFonts(project);
  const { cols, rows } = project.hardware;
  const total = frameCount(project);
  const fps = Math.max(1, Math.round(project.fps));
  const canvas = document.createElement("canvas");
  canvas.width = cols;
  canvas.height = rows;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = false;

  const frames: ImageData[] = [];
  for (let i = 0; i < total; i++) {
    const frame = renderFrame(project, i / fps, undefined, OFFLINE_AUDIO);
    const rgba = new Uint8ClampedArray(cols * rows * 4);
    for (let j = 0, k = 0; j < cols * rows; j++, k += 3) {
      rgba[j * 4] = frame[k];
      rgba[j * 4 + 1] = frame[k + 1];
      rgba[j * 4 + 2] = frame[k + 2];
      rgba[j * 4 + 3] = 255;
    }
    ctx.putImageData(new ImageData(rgba, cols, rows), 0, 0);
    frames.push(ctx.getImageData(0, 0, cols, rows));
    opts.onProgress?.(i + 1, total, "render");
    if (i % 4 === 3) await tick();
  }

  download(exportFramesToAvi(frames, cols, rows, fps), `${safeName(project.name)}_lededit.avi`);
}
