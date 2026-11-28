// Offline character presets rendered as indexed pixel frames — no external assets.
import {
  createDefaultSpriteCharacterConfig, normalizeSpriteCharacterPresetId,
  renderSpriteCharacterRGBA, SPRITE_CHARACTER_PRESETS,
} from "@/lib/spriteCharacterEngine";

export { SPRITE_CHARACTER_PRESETS as CHARACTER_VIDEO_PRESETS };

export interface SpriteFrame {
  w: number;
  h: number;
  // indexed palette: 0 = transparent, 1..n = color indices
  pixels: number[][];
  palette: string[];
}

export interface SpriteDef {
  id: string;
  name: string;
  category: string;
  frames: SpriteFrame[];
}

function frame(rows: string[], palette: string[]): SpriteFrame {
  return {
    w: rows[0].length,
    h: rows.length,
    pixels: rows.map((row) => [...row].map((ch) => (ch === "." ? 0 : Math.min(palette.length, Number(ch))))),
    palette,
  };
}

const HEART: SpriteDef = {
  id: "heart",
  name: "Beating Heart",
  category: "Hearts & Love",
  frames: [
    frame(["01110", "11111", "11111", "01110", "00100"], ["#ff3366"]),
    frame(["0111110", "1111111", "1111111", "0111110", "0011100", "0001000"], ["#ff6699"]),
  ],
};

export const SPRITES: SpriteDef[] = [HEART];

/** Flat indexed sprite renderer used by the legacy "sprites" effect. */
export function renderSpriteLayer(
  type: string,
  cols: number,
  rows: number,
  time: number,
  count: number,
  scale: number,
  speed: number,
  dir: string,
): Uint8ClampedArray | null {
  const sprite = SPRITES.find((s) => s.id === type) ?? SPRITES[0];
  const frameData = sprite.frames[Math.floor(time * speed * 4) % sprite.frames.length];
  const out = new Uint8ClampedArray(cols * rows * 4);
  const flip = dir === "left" || dir === "up";
  for (let i = 0; i < count; i++) {
    const baseX = Math.floor((i / Math.max(1, count - 1)) * Math.max(1, cols - frameData.w * scale));
    const baseY = Math.floor(rows / 2 - (frameData.h * scale) / 2);
    for (let fy = 0; fy < frameData.h; fy++) {
      for (let fx = 0; fx < frameData.w; fx++) {
        const idx = frameData.pixels[fy][fx];
        if (idx === 0) continue;
        const color = frameData.palette[idx - 1] || "#ffffff";
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++) {
            const x = baseX + (flip ? (frameData.w - 1 - fx) * scale + sx : fx * scale + sx);
            const y = baseY + fy * scale + sy;
            if (x < 0 || x >= cols || y < 0 || y >= rows) continue;
            const p = (y * cols + x) * 4;
            out[p] = r; out[p + 1] = g; out[p + 2] = b; out[p + 3] = 255;
          }
        }
      }
    }
  }
  return out;
}

/** Stackable character-video preset renderer backed by the 2D sprite/flora engine. */
export function renderCharacterVideoLayer(
  layer: import("@/types/project").Layer,
  cols: number,
  rows: number,
  time: number,
  fps = 30,
): Uint8ClampedArray {
  const presetId = normalizeSpriteCharacterPresetId(layer.spriteCharacter?.presetId ?? layer.spriteType);
  const config = layer.spriteCharacter
    ? { ...layer.spriteCharacter, presetId }
    : createDefaultSpriteCharacterConfig(presetId);
  if (!layer.spriteCharacter) {
    config.scale = Math.max(0.5, Math.min(4, layer.mediaScale ?? 1));
    config.xOffset = layer.mediaOffsetX ?? 0;
    config.yOffset = layer.mediaOffsetY ?? 0;
    config.animSpeed = Math.max(0.25, Math.min(3, layer.mediaSpeed ?? 1));
    config.flipX = !!layer.mediaFlipX;
  }

  const out = renderSpriteCharacterRGBA(cols, rows, Math.round(Math.max(0, time) * fps), fps, config);
  const brightness = Math.max(0, layer.mediaBrightness ?? 100) / 100;
  const contrast = Math.max(0, layer.mediaContrast ?? 100) / 100;
  const saturation = Math.max(0, layer.mediaSaturation ?? 100) / 100;
  const silhouette = layer.mediaSilhouette === true;
  const clamp = (v: number) => Math.max(0, Math.min(255, v));

  for (let p = 0; p < out.length; p += 4) {
    if (out[p + 3] === 0) continue;
    let r = out[p], g = out[p + 1], b = out[p + 2];
    if (silhouette) {
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      r = g = b = lum >= Math.max(0, Math.min(255, layer.mediaThreshold ?? 0)) ? 255 * brightness : 0;
    } else {
      r = (r - 128) * contrast + 128 + (brightness - 1) * 128;
      g = (g - 128) * contrast + 128 + (brightness - 1) * 128;
      b = (b - 128) * contrast + 128 + (brightness - 1) * 128;
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = gray + (r - gray) * saturation;
      g = gray + (g - gray) * saturation;
      b = gray + (b - gray) * saturation;
    }
    out[p] = clamp(r);
    out[p + 1] = clamp(g);
    out[p + 2] = clamp(b);
  }
  return out;
}
