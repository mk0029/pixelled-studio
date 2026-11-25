// Offline character presets rendered as indexed pixel frames — no external assets.

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

const BHANGRA: SpriteDef = {
  id: "bhangra-silhouette",
  name: "Dancing Bhangra Silhouette",
  category: "Dance",
  frames: [
    frame([
      "..1........1..",
      "...1..11..1...",
      "....111111....",
      ".....1111.....",
      "......11......",
      "....111111....",
      "....11..11....",
      "....1....1....",
      "...11....11...",
      "...1......1...",
      "..11......11..",
      "..1........1..",
    ], ["#ffffff"]),
    frame([
      "........11....",
      "...1....11....",
      "..11..11111...",
      "....111111....",
      ".....1111.....",
      "......11......",
      "....111111....",
      "....11..11....",
      "...11....11...",
      "..11......11..",
      "..1........1..",
      ".11........11.",
    ], ["#ffffff"]),
  ],
};

const DANDIYA: SpriteDef = {
  id: "dandiya-couple",
  name: "Dandiya Couple",
  category: "Dance",
  frames: [
    frame([
      "1............1",
      ".1...1111...1.",
      "..1..1221..1..",
      "...1.1221.1...",
      "....112211....",
      ".....1221.....",
      "....112211....",
      "...11.22.11...",
      "..1...22...1..",
      ".1....22....1.",
      "1.....22.....1",
      "......22......",
    ], ["#ffffff", "#ff5c8a"]),
    frame([
      "..1........1..",
      "...1..11..1...",
      "....112211....",
      ".....1221.....",
      "....112211....",
      "...11.22.11...",
      "..1...22...1..",
      ".1....22....1.",
      "1.....22.....1",
      "......22......",
      ".....1..1.....",
      "....1....1....",
    ], ["#ffffff", "#ff5c8a"]),
  ],
};

const KALASH: SpriteDef = {
  id: "kalash-swastik",
  name: "Wedding Kalash & Swastik",
  category: "Wedding",
  frames: [
    frame([
      "......11......",
      ".....1111.....",
      "....111111....",
      "....111111....",
      ".....1111.....",
      "....111111....",
      "...11111111...",
      "..1111111111..",
      "..1111111111..",
      "...11111111...",
      "....111111....",
      ".....1111.....",
    ], ["#ffcc66"]),
    frame([
      "......22......",
      ".....2222.....",
      "....222222....",
      "....222222....",
      ".....2222.....",
      "....222222....",
      "...22222222...",
      "..2222222222..",
      "..2222222222..",
      "...22222222...",
      "....222222....",
      ".....2222.....",
    ], ["#ffcc66", "#ffef9f"]),
  ],
};

export const SPRITES: SpriteDef[] = [HEART];
export const CHARACTER_VIDEO_PRESETS: SpriteDef[] = [BHANGRA, DANDIYA, KALASH, HEART];

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

/** Nearest-neighbour preset renderer for stackable character-video layers. */
export function renderCharacterVideoLayer(
  layer: import("@/types/project").Layer,
  cols: number,
  rows: number,
  time: number,
): Uint8ClampedArray {
  const preset = CHARACTER_VIDEO_PRESETS.find((p) => p.id === layer.spriteType) ?? CHARACTER_VIDEO_PRESETS[0];
  const speed = Math.max(0.25, Math.min(3, layer.mediaSpeed ?? 1));
  const current = preset.frames[Math.floor(Math.max(0, time) * speed * 8) % preset.frames.length];
  const scale = Math.max(0.1, Math.min(3, layer.mediaScale ?? 1));
  const out = new Uint8ClampedArray(cols * rows * 4);
  const drawW = Math.max(1, current.w * scale);
  const drawH = Math.max(1, current.h * scale);
  const ox = cols / 2 - drawW / 2 + (layer.mediaOffsetX ?? 0);
  const oy = rows / 2 - drawH / 2 + (layer.mediaOffsetY ?? 0);
  const brightness = Math.max(0, layer.mediaBrightness ?? 100) / 100;
  const contrast = Math.max(0, layer.mediaContrast ?? 100) / 100;
  const saturation = Math.max(0, layer.mediaSaturation ?? 100) / 100;
  const silhouette = layer.mediaSilhouette === true;

  for (let y = 0; y < Math.ceil(drawH); y++) {
    for (let x = 0; x < Math.ceil(drawW); x++) {
      const fx = Math.min(current.w - 1, Math.floor(x / scale));
      const fy = Math.min(current.h - 1, Math.floor(y / scale));
      const idx = current.pixels[fy][fx];
      if (!idx) continue;
      const color = current.palette[idx - 1] || "#ffffff";
      let r = parseInt(color.slice(1, 3), 16);
      let g = parseInt(color.slice(3, 5), 16);
      let b = parseInt(color.slice(5, 7), 16);
      if (!silhouette) {
        r = (r - 128) * contrast + 128 + (brightness - 1) * 128;
        g = (g - 128) * contrast + 128 + (brightness - 1) * 128;
        b = (b - 128) * contrast + 128 + (brightness - 1) * 128;
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        r = gray + (r - gray) * saturation;
        g = gray + (g - gray) * saturation;
        b = gray + (b - gray) * saturation;
      } else {
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        r = g = b = lum >= Math.max(0, Math.min(255, layer.mediaThreshold ?? 0)) ? 255 * brightness : 0;
      }
      const px = Math.floor(ox + (layer.mediaFlipX ? drawW - 1 - x : x));
      const py = Math.floor(oy + y);
      if (px < 0 || px >= cols || py < 0 || py >= rows) continue;
      const p = (py * cols + px) * 4;
      out[p] = Math.max(0, Math.min(255, r));
      out[p + 1] = Math.max(0, Math.min(255, g));
      out[p + 2] = Math.max(0, Math.min(255, b));
      out[p + 3] = 255;
    }
  }
  return out;
}
