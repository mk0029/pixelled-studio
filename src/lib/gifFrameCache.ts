export interface DecodedGifData {
  frames: HTMLCanvasElement[];
  durationsMs: number[];
  totalDurationMs: number;
  width: number;
  height: number;
}

const gifCache = new Map<string, DecodedGifData>();

export async function decodeAnimatedGif(url: string): Promise<DecodedGifData> {
  const cached = gifCache.get(url);
  if (cached) return cached;

  let buffer: ArrayBuffer | null = null;
  try {
    const response = await fetch(url);
    buffer = await response.arrayBuffer();
  } catch {
    buffer = null;
  }

  if (buffer && typeof window !== "undefined" && "ImageDecoder" in window) {
    try {
      const decoder = new (window as any).ImageDecoder({ data: buffer, type: "image/gif" });
      await decoder.tracks.ready;
      const track = decoder.tracks.selectedTrack;
      const count = Math.max(1, track?.frameCount || 1);

      const frames: HTMLCanvasElement[] = [];
      const durationsMs: number[] = [];
      let width = 32;
      let height = 32;

      for (let i = 0; i < count; i++) {
        const result = await decoder.decode({ frameIndex: i });
        const frame = result.image;
        width = frame.displayWidth || frame.codedWidth || 32;
        height = frame.displayHeight || frame.codedHeight || 32;

        const c = document.createElement("canvas");
        c.width = width;
        c.height = height;
        const ctx = c.getContext("2d")!;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(frame, 0, 0);

        const durMs = Math.max(20, Math.round((frame.duration || 100000) / 1000));
        frames.push(c);
        durationsMs.push(durMs);
        frame.close();
      }
      decoder.close();

      const totalDurationMs = durationsMs.reduce((a, b) => a + b, 0) || 100;
      const decoded: DecodedGifData = { frames, durationsMs, totalDurationMs, width, height };
      gifCache.set(url, decoded);
      return decoded;
    } catch {
      // fall through
    }
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth || 32;
      c.height = img.naturalHeight || 32;
      const ctx = c.getContext("2d")!;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0);
      const decoded: DecodedGifData = {
        frames: [c],
        durationsMs: [100],
        totalDurationMs: 100,
        width: c.width,
        height: c.height,
      };
      gifCache.set(url, decoded);
      resolve(decoded);
    };
    img.onerror = reject;
    img.src = url;
  });
}

import type { Project } from "@/types/project";

export async function preloadEmojiGifs(project: Project): Promise<void> {
  const layers = project.layers.filter((l: any) => l.effect === "character-video" && l.characterSourceType === "emoji" && l.emojiCharacter);
  for (const layer of layers) {
    for (const item of (layer as any).emojiCharacter.items ?? []) {
      if (item.sourceType === "gif" && item.gifUrl) await decodeAnimatedGif(item.gifUrl);
    }
  }
}

export function getCachedGif(url: string): DecodedGifData | undefined {
  return gifCache.get(url);
}

export function getGifFrameAtTime(gif: DecodedGifData, elapsedMs: number): HTMLCanvasElement {
  if (gif.frames.length <= 1) return gif.frames[0];
  const modTime = ((elapsedMs % gif.totalDurationMs) + gif.totalDurationMs) % gif.totalDurationMs;
  let acc = 0;
  for (let i = 0; i < gif.frames.length; i++) {
    acc += gif.durationsMs[i];
    if (modTime < acc) return gif.frames[i];
  }
  return gif.frames[gif.frames.length - 1];
}
