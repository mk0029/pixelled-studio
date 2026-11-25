import type { Layer, Project } from "@/types/project";

interface MediaEntry {
  img: HTMLImageElement;
  ready: boolean;
  frames: Map<string, Uint8ClampedArray>;
  cropCache: Map<string, { x: number; y: number; w: number; h: number }>;
}

const cache = new Map<string, MediaEntry>();
let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;

function entryFor(src: string): MediaEntry {
  let entry = cache.get(src);
  if (!entry) {
    const img = new Image();
    const e: MediaEntry = { img, ready: false, frames: new Map(), cropCache: new Map() };
    img.onload = () => { e.ready = true; };
    img.onerror = () => { e.ready = false; };
    img.src = src;
    cache.set(src, e);
    entry = e;
  }
  return entry;
}

function scratch(cols: number, rows: number): CanvasRenderingContext2D | null {
  if (typeof document === "undefined") return null;
  if (!canvas) {
    canvas = document.createElement("canvas");
    ctx = canvas.getContext("2d", { willReadFrequently: true });
  }
  if (!canvas || !ctx) return null;
  canvas.width = cols;
  canvas.height = rows;
  return ctx;
}

function srcDims(layer: Layer, cols: number, rows: number): { w: number; h: number } {
  const w = layer.mediaSrcW && layer.mediaSrcW > 0 ? layer.mediaSrcW : cols;
  const h = layer.mediaSrcH && layer.mediaSrcH > 0 ? layer.mediaSrcH : rows;
  return { w, h };
}

/** Pixels for one media layer. */
export function sampleMedia(layer: Layer, cols: number, rows: number, time: number): Uint8ClampedArray | null {
  const src = layer.mediaSrc;
  if (!src) return null;
  const entry = entryFor(src);
  if (!entry.ready) {
    if (entry.img.complete && entry.img.naturalWidth) entry.ready = true;
    else return null;
  }
  const frames = Math.max(0, Math.floor(layer.mediaFrames ?? 0));
  const rate = (layer.mediaFps || 12) * Math.max(0.05, layer.mediaSpeed ?? 1);
  let frame = 0;
  if (frames > 0) {
    const idx = Math.floor(time * rate);
    const dir = layer.mediaDirection ?? "forward";
    if (dir === "reverse") frame = ((frames - (idx % frames)) % frames + frames) % frames;
    else if (dir === "pingpong") { const cycle = Math.max(1, frames * 2 - 2); const pos = ((idx % cycle) + cycle) % cycle; frame = pos < frames ? pos : cycle - pos; }
    else frame = ((idx % frames) + frames) % frames;
  }

  const { w: srcW, h: srcH } = srcDims(layer, cols, rows);
  const trim = layer.mediaTrimBlack === true;
  const thresh = Math.max(0, Math.min(255, layer.mediaTrimThreshold ?? 15));

  // Compute crop (cached). Draw sprite sheet frame to an offscreen canvas to read pixels.
  let cropX = 0, cropY = 0, cropW = srcW, cropH = srcH;
  if (trim) {
    const cacheKey = `${srcW}x${srcH}:${frames}:${thresh}`;
    let cached = entry.cropCache.get(cacheKey);
    if (!cached) {
      // build offscreen canvas of the full sprite sheet, read pixels, find dead borders across all frames
      const fw = srcW * Math.max(1, frames);
      const fh = srcH;
      const oc = document.createElement("canvas");
      oc.width = fw; oc.height = fh;
      const octx = oc.getContext("2d", { willReadFrequently: true })!;
      octx.drawImage(entry.img, 0, 0);
      const data = octx.getImageData(0, 0, fw, fh).data;
      const colDead = new Array(srcW).fill(true);
      const rowDead = new Array(srcH).fill(true);
      for (let f = 0; f < Math.max(1, frames); f++) {
        for (let y = 0; y < srcH; y++) {
          for (let x = 0; x < srcW; x++) {
            const q = ((y * fw + (f * srcW + x)) * 4);
            if (data[q] + data[q + 1] + data[q + 2] > thresh) {
              colDead[x] = false; rowDead[y] = false;
            }
          }
        }
      }
      let minX = 0, maxX = srcW - 1, minY = 0, maxY = srcH - 1;
      while (minX < srcW - 1 && colDead[minX]) minX++;
      while (maxX > minX && colDead[maxX]) maxX--;
      while (minY < srcH - 1 && rowDead[minY]) minY++;
      while (maxY > minY && rowDead[maxY]) maxY--;
      if (maxX >= minX && maxY >= minY && (minX > 0 || maxX < srcW - 1 || minY > 0 || maxY < srcH - 1)) {
        cached = { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
      } else {
        cached = { x: 0, y: 0, w: srcW, h: srcH };
      }
      entry.cropCache.set(cacheKey, cached);
    }
    cropX = cached.x; cropY = cached.y; cropW = cached.w; cropH = cached.h;
  }

  const swap = layer.mediaChannelSwap === true;
  const fit = layer.mediaFitMode ?? "stretch";
  const autoRotate = layer.mediaAutoRotate === true;
  const rotation = (layer.mediaRotation ?? 0) + (autoRotate ? time * (layer.mediaRotateSpeed ?? 60) : 0);

  const sx = Math.max(0.05, Math.min(4, layer.mediaScale ?? 1));
  const sy = Math.max(0.05, Math.min(4, layer.mediaScaleY ?? layer.mediaScale ?? 1));

  let dw: number, dh: number, ox: number, oy: number;
  if (fit === "center") {
    const fitScale = Math.min(cols / cropW, rows / cropH);
    dw = Math.max(1, Math.round(cropW * fitScale * sx));
    dh = Math.max(1, Math.round(cropH * fitScale * sy));
    ox = Math.round((cols - dw) / 2 + (layer.mediaOffsetX ?? 0));
    oy = Math.round((rows - dh) / 2 + (layer.mediaOffsetY ?? 0));
  } else if (fit === "tile") {
    dw = Math.max(1, Math.round(cropW * sx));
    dh = Math.max(1, Math.round(cropH * sy));
    ox = Math.round((layer.mediaOffsetX ?? 0));
    oy = Math.round((layer.mediaOffsetY ?? 0));
  } else {
    // stretch: fill width; height follows mediaScaleY (default 1 = full) so users can adjust height
    const sy = Math.max(0.05, Math.min(4, layer.mediaScaleY ?? layer.mediaScale ?? 1));
    dw = cols;
    dh = Math.max(1, Math.round(rows * sy));
    ox = Math.round((layer.mediaOffsetX ?? 0));
    oy = Math.round((rows - dh) / 2 + (layer.mediaOffsetY ?? 0));
  }

  const key = `${cols}x${rows}:${frame}:${srcW}x${srcH}:${cropX},${cropY},${cropW},${cropH}:${swap}:${fit}:${sx}:${sy}:${layer.mediaOffsetX}:${layer.mediaOffsetY}:${layer.mediaFlipX}:${layer.mediaFlipY}:${rotation}:${layer.mediaSmoothing}:${thresh}`;
  // shortcut: spinning changes rotation every frame, so caching those frames would only thrash the 512-entry cache
  const cachedFrame = autoRotate ? undefined : entry.frames.get(key);
  if (cachedFrame) return cachedFrame;

  const c = scratch(cols, rows);
  if (!c) return null;
  c.clearRect(0, 0, cols, rows);

  c.imageSmoothingEnabled = frames === 0 ? (layer.mediaSmoothing !== false) : false;
  c.save();
  if (layer.mediaFlipX || layer.mediaFlipY || rotation) {
    c.translate(ox + dw / 2, oy + dh / 2);
    if (rotation) {
      c.rotate((rotation * Math.PI) / 180);
    }
    c.scale(layer.mediaFlipX ? -1 : 1, layer.mediaFlipY ? -1 : 1);
    c.translate(-(ox + dw / 2), -(oy + dh / 2));
  }

  const srcFrameX = frame * srcW;
  if (fit === "tile") {
    for (let y = oy; y < rows; y += dh) {
      for (let x = ox; x < cols; x += dw) {
        c.drawImage(entry.img, srcFrameX + cropX, cropY, cropW, cropH, x, y, dw, dh);
      }
    }
  } else {
    c.drawImage(entry.img, srcFrameX + cropX, cropY, cropW, cropH, ox, oy, dw, dh);
  }
  c.restore();

  if (swap) {
    const data = c.getImageData(0, 0, cols, rows);
    for (let i = 0; i < cols * rows; i++) {
      const q = i * 4;
      const r = data.data[q];
      data.data[q] = data.data[q + 2];
      data.data[q + 2] = r;
    }
    c.putImageData(data, 0, 0);
  }

  const out = new Uint8ClampedArray(c.getImageData(0, 0, cols, rows).data);
  if (!autoRotate) {
    entry.frames.set(key, out);
    if (entry.frames.size > 512) entry.frames.clear();
  }
  return out;
}

/** Exporters call this once so data-URL media is decoded before frame 0. */
export async function preloadMedia(project: Project): Promise<void> {
  const sources = new Set(
    project.layers.filter((l) => l.effect === "media" && l.mediaSrc).map((l) => l.mediaSrc!),
  );
  await Promise.all(
    [...sources].map(
      (src) =>
        new Promise<void>((resolve) => {
          const entry = entryFor(src);
          if (entry.ready) return resolve();
          if (entry.img.complete) {
            entry.ready = entry.img.naturalWidth > 0;
            return resolve();
          }
          const done = () => {
            entry.ready = entry.img.naturalWidth > 0;
            resolve();
          };
          entry.img.addEventListener("load", done, { once: true });
          entry.img.addEventListener("error", done, { once: true });
          setTimeout(done, 3000);
        }),
    ),
  );
}
