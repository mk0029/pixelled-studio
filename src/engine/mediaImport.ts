import type { WiringMap } from "./wiringMapper";
import { parseSfx } from "./sfxParser";

export interface ImportedMedia {
  src: string;
  frames: number;
  fps: number;
  type: "image" | "video" | "gif" | "webm" | "swf" | "sfx";
  srcW?: number;
  srcH?: number;
  cropX?: number;
  cropY?: number;
  cropW?: number;
  cropH?: number;
}

export type ImportStatus = (message: string) => void;

const MAX_FRAMES = 360;
const LED_FRAME_BYTES = 6 * 512;
const LED_SLOTS = 1024;

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function canvas2d(w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, w);
  canvas.height = Math.max(1, h);
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  return { canvas, ctx };
}

function packFrames(frames: ImageData[], cols: number, rows: number): string {
  const { canvas, ctx } = canvas2d(cols * frames.length, rows);
  frames.forEach((frame, i) => ctx.putImageData(frame, i * cols, 0));
  return canvas.toDataURL("image/png");
}

function drawFrame(source: CanvasImageSource, ctx: CanvasRenderingContext2D, cols: number, rows: number): ImageData {
  ctx.clearRect(0, 0, cols, rows);
  ctx.drawImage(source, 0, 0, cols, rows);
  return ctx.getImageData(0, 0, cols, rows);
}

/** Still image: keep the source resolution, the renderer samples it per LED. */
export function importImageFile(file: File): Promise<ImportedMedia> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ src: String(reader.result), frames: 0, fps: 0, type: "image" });
    reader.onerror = () => reject(new Error("Could not read the image"));
    reader.readAsDataURL(file);
  });
}

/** Animated video import: sample frames from an mp4/webm clip. */
export async function importVideo(file: File, cols: number, rows: number, onStatus?: ImportStatus): Promise<ImportedMedia> {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = url;
    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error("Could not decode the video"));
      setTimeout(() => reject(new Error("Video decode timed out")), 10000);
    });
    const duration = Math.max(0.2, Math.min(video.duration || 1, 15));
    const fps = 12;
    const total = Math.max(1, Math.min(MAX_FRAMES, Math.floor(duration * fps)));
    const step = duration / total;
    const { canvas, ctx } = canvas2d(cols, rows);
    const frames: ImageData[] = [];
    for (let i = 0; i < total; i++) {
      onStatus?.(`Sampling video ${i + 1}/${total}…`);
      video.currentTime = i * step;
      await new Promise<void>((resolve) => { video.onseeked = () => resolve(); setTimeout(resolve, 500); });
      ctx.clearRect(0, 0, cols, rows);
      ctx.drawImage(video, 0, 0, cols, rows);
      frames.push(ctx.getImageData(0, 0, cols, rows));
    }
    return { src: packFrames(frames, cols, rows), frames: frames.length, fps, type: "video", srcW: cols, srcH: rows };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Video import contributes one still frame; full video sampling is out of scope. */
export async function importVideoStill(file: File, cols: number, rows: number): Promise<ImportedMedia> {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = url;
    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error("Could not decode the video"));
      setTimeout(() => reject(new Error("Video decode timed out")), 8000);
    });
    video.currentTime = Math.min(0.1, (video.duration || 0) / 2);
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve();
      setTimeout(resolve, 1500);
    });
    const w = Math.min(640, video.videoWidth || cols);
    const h = Math.max(1, Math.round(w * (video.videoHeight || rows) / (video.videoWidth || cols)));
    const { canvas, ctx } = canvas2d(w, h);
    ctx.drawImage(video, 0, 0, w, h);
    return { src: canvas.toDataURL("image/png"), frames: 0, fps: 0, type: "video" };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Animated GIF decoded through ImageDecoder into a grid-sized sprite sheet. */
export async function importGif(file: File, cols: number, rows: number, onStatus?: ImportStatus): Promise<ImportedMedia> {
  const ImageDecoderCtor = (window as unknown as { ImageDecoder?: any }).ImageDecoder;
  if (!ImageDecoderCtor) throw new Error("Animated GIF import needs Chrome or Edge");
  const decoder = new ImageDecoderCtor({ data: await file.arrayBuffer(), type: "image/gif" });
  try {
    await decoder.tracks.ready;
    const track = decoder.tracks.selectedTrack;
    const count: number = track?.frameCount ?? 0;
    if (!count) throw new Error("No GIF frames found");
    const step = Math.max(1, Math.ceil(count / MAX_FRAMES));
    const { ctx } = canvas2d(cols, rows);
    const frames: ImageData[] = [];
    let duration = 0;
    for (let i = 0; i < count; i += step) {
      onStatus?.(`Decoding GIF ${frames.length + 1}/${Math.ceil(count / step)}…`);
      const { image } = await decoder.decode({ frameIndex: i });
      duration += (image.duration ?? 0) / 1e6;
      frames.push(drawFrame(image, ctx, cols, rows));
      image.close();
    }
    const fps = duration > 0 ? clamp(frames.length / duration, 2, 30) : 10;
    return { src: packFrames(frames, cols, rows), frames: frames.length, fps: Math.round(fps * 10) / 10, type: "gif" };
  } finally {
    decoder.close?.();
  }
}

let rufflePromise: Promise<any> | null = null;

function loadRuffle(): Promise<any> {
  const w = window as unknown as { RufflePlayer?: any };
  if (w.RufflePlayer) return Promise.resolve(w.RufflePlayer);
  if (rufflePromise) return rufflePromise;
  rufflePromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = new URL("ruffle/ruffle.js", document.baseURI).href;
    script.async = true;
    script.onload = () => {
      if (w.RufflePlayer) resolve(w.RufflePlayer);
      else reject(new Error("Flash player did not initialise"));
    };
    script.onerror = () => reject(new Error("Could not load the SWF player"));
    document.head.appendChild(script);
  });
  return rufflePromise;
}

/** Ruffle exposes loaded metadata as a property; polling avoids event timing quirks. */
async function waitForMetadata(player: any, timeout: number): Promise<any> {
  const end = performance.now() + timeout;
  while (performance.now() < end) {
    if (player.metadata) return player.metadata;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("This SWF did not report movie metadata");
}

function findRuffleCanvas(player: HTMLElement): HTMLCanvasElement | null {
  return ((player.shadowRoot ?? player) as ParentNode).querySelector("canvas");
}

async function waitForCanvas(player: HTMLElement, timeout: number): Promise<HTMLCanvasElement> {
  const end = performance.now() + timeout;
  while (performance.now() < end) {
    const canvas = findRuffleCanvas(player);
    if (canvas) return canvas;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("The Flash player did not expose a canvas");
}

/**
 * Real SWF import through the self-hosted Ruffle player. Flash has no seek API,
 * so the movie is played once in real time and sampled at the project frame rate.
 * shortcut: real-time capture can drop frames on slow machines, upgrade if Ruffle
 * exposes deterministic frame stepping.
 */
export async function importSwf(
  source: File | string,
  cols: number,
  rows: number,
  projectDuration: number,
  projectFps: number,
  onStatus?: ImportStatus,
  signal?: AbortSignal,
): Promise<ImportedMedia> {
  onStatus?.("Loading Flash player…");
  const RufflePlayer = await loadRuffle();
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;inset:0;z-index:90;display:grid;place-items:center;background:rgba(0,0,0,.72)";
  overlay.innerHTML = `
    <div style="width:min(90vw,620px);border:1px solid #3f3f46;border-radius:12px;background:#09090b;padding:12px;box-shadow:0 24px 80px #000">
      <div style="display:flex;align-items:center;justify-content:space-between;color:#e4e4e7;font:600 12px/1.3 ui-sans-serif,system-ui;margin-bottom:8px">
        <div>Importing ${typeof source === "string" ? source.split("/").pop() ?? source : source.name}</div>
        <button id="swf-cancel" style="width:24px;height:24px;border:1px solid #3f3f46;border-radius:6px;background:#18181b;color:#e4e4e7;cursor:pointer;font-size:16px;line-height:1;padding:0;display:flex;align-items:center;justify-content:center">×</button>
      </div>
      <div style="background:#000;border-radius:6px;overflow:hidden" data-stage></div>
      <div style="height:4px;background:#27272a;border-radius:99px;margin-top:10px;overflow:hidden">
        <div style="height:100%;width:0;background:#2dd4bf;transition:width .1s" data-bar></div>
      </div>
      <div style="color:#71717a;font:10px/1.4 ui-monospace,monospace;margin-top:6px" data-status></div>
    </div>`;
  overlay.querySelector("div")!.firstChild!.textContent = `Importing ${typeof source === "string" ? source.split("/").pop() ?? source : source.name}`;
  const stage = overlay.querySelector("[data-stage]") as HTMLElement;
  // Match the LED matrix aspect so Ruffle's exactFit stage fills every column.
  stage.style.aspectRatio = `${cols} / ${rows}`;
  const bar = overlay.querySelector("[data-bar]") as HTMLElement;
  const statusEl = overlay.querySelector("[data-status]") as HTMLElement;
  const cancelBtn = overlay.querySelector("#swf-cancel") as HTMLButtonElement | null;
  let cancelled = false;
  const setStatus = (text: string) => {
    statusEl.textContent = text;
    onStatus?.(text);
  };
  const abort = () => {
    cancelled = true;
    setStatus("Cancelled.");
    if (cancelBtn) {
      cancelBtn.setAttribute("disabled", "true");
      cancelBtn.textContent = "✓";
    }
  };
  cancelBtn?.addEventListener("click", abort);
  signal?.addEventListener("abort", abort, { once: true });

  document.body.appendChild(overlay);
  const url = typeof source === "string" ? source : URL.createObjectURL(source);
  let player: any = null;
  try {
    setStatus("Starting Flash player…");
    const ruffle = RufflePlayer.newest?.();
    if (!ruffle) throw new Error("The Flash player is not ready");
    player = ruffle.createPlayer();
    player.style.cssText = "display:block;width:100%;height:100%;background:#000";
    player.config = {
      autoplay: "off",
      preferredRenderer: "canvas",
      scale: "exactFit",
      letterbox: "off",
      wmode: "transparent",
      backgroundColor: "#000000",
      unmuteOverlay: "hidden",
      splashScreen: false,
      warnOnUnsupportedContent: false,
      contextMenu: "off",
      logLevel: "error",
    };
    stage.appendChild(player);

    // Both Ruffle events fire together once the movie is fully loaded; polling
    // the metadata property is simpler and robust against missed events.
    await player.load({ url });
    const meta = await waitForMetadata(player, 20000);
    if (!meta?.width || !meta?.height) throw new Error("This SWF has no stage metadata");
    player.volume = 0;
    const canvas = await waitForCanvas(player, 5000);
    await new Promise((r) => setTimeout(r, 250));

    const captureFps = Math.round(clamp(projectFps, 5, 30));
    const movieSeconds = meta.frameRate > 0 ? meta.numFrames / meta.frameRate : projectDuration;
    const seconds = Math.max(0.2, Math.min(movieSeconds, projectDuration, 15));
    const total = Math.max(1, Math.min(MAX_FRAMES, Math.floor(seconds * captureFps)));
    const { ctx } = canvas2d(cols, rows);
    ctx.imageSmoothingEnabled = false;
    const frames: ImageData[] = [];
    const interval = 1 / captureFps;
    const start = performance.now();
    setStatus("Starting capture…");
    player.play();

    await new Promise<void>((resolve) => {
      let stopped = false;
      const finish = () => {
        if (stopped) return;
        stopped = true;
        clearTimeout(watchdog);
        resolve();
      };
      // Watchdog: a background tab can suspend rAF, and the overlay must not hang forever.
      const watchdog = setTimeout(finish, (seconds + 5) * 1000);
      const tick = (now: number) => {
        if (stopped || cancelled) return;
        const elapsed = (now - start) / 1000;
        while (frames.length < total && elapsed >= frames.length * interval) {
          ctx.clearRect(0, 0, cols, rows);
          if (canvas.width && canvas.height) ctx.drawImage(canvas, 0, 0, cols, rows);
          frames.push(ctx.getImageData(0, 0, cols, rows));
          bar.style.width = `${Math.min(100, (frames.length / total) * 100)}%`;
          setStatus(`Capturing Flash frame ${frames.length}/${total}…`);
        }
        if (frames.length >= total || elapsed > seconds + 1) finish();
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    if (cancelled) throw new DOMException("Import cancelled", "AbortError");
    player.pause();
    if (!frames.length) throw new Error("No SWF frames were captured");
    setStatus("Packing frames…");
    return { src: packFrames(frames, cols, rows), frames: frames.length, fps: captureFps, type: "swf" };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new Error(error instanceof Error ? error.message : "Could not import the SWF");
  } finally {
    try { player?.pause?.(); } catch { /* ignore */ }
    overlay.remove();
    if (typeof source !== "string") URL.revokeObjectURL(url);
  }
}


export async function importSfx(file: File, cols: number, rows: number, onStatus?: ImportStatus): Promise<ImportedMedia> {
  onStatus?.("Parsing .sfx…");
  const parsed = parseSfx(await file.arrayBuffer());
  const { canvas, ctx } = canvas2d(parsed.srcWidth * parsed.frameCount, parsed.srcHeight);
  const imgData = new ImageData(parsed.frames as unknown as Uint8ClampedArray<ArrayBuffer>, parsed.srcWidth * parsed.frameCount, parsed.srcHeight);
  ctx.putImageData(imgData, 0, 0);
  // compute fps default 12 (no fps in header)
  return {
    src: canvas.toDataURL("image/png"),
    frames: parsed.frameCount,
    fps: 12,
    type: "sfx",
    srcW: parsed.srcWidth,
    srcH: parsed.srcHeight,
    cropX: parsed.cropX,
    cropY: parsed.cropY,
    cropW: parsed.cropW,
    cropH: parsed.cropH,
  };
}
