// Crisp multi-frame pixel-art sprite engine (minimal starter set).

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

const HEART: SpriteDef = {
  id: "heart",
  name: "Red Heart",
  category: "Hearts & Love",
  frames: [
    { w: 5, h: 5, pixels: [[0,1,1,1,0],[1,1,1,1,1],[1,1,1,1,1],[0,1,1,1,0],[0,0,1,0,0]], palette: ["#ff3366"] },
    { w: 5, h: 5, pixels: [[0,1,1,1,0],[1,1,1,1,1],[1,1,1,1,1],[0,1,1,1,0],[0,0,1,0,0]], palette: ["#ff6699"] },
  ],
};

export const SPRITES: SpriteDef[] = [HEART];

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
  const frame = sprite.frames[Math.floor(time * speed * 4) % sprite.frames.length];
  const out = new Uint8ClampedArray(cols * rows * 4);
  const flip = dir === "left" || dir === "up";
  for (let i = 0; i < count; i++) {
    const baseX = Math.floor((i / Math.max(1, count - 1)) * Math.max(1, cols - frame.w * scale));
    const baseY = Math.floor(rows / 2 - (frame.h * scale) / 2);
    for (let fy = 0; fy < frame.h; fy++) {
      for (let fx = 0; fx < frame.w; fx++) {
        const idx = frame.pixels[fy][fx];
        if (idx === 0) continue;
        const color = frame.palette[idx - 1] || "#ffffff";
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++) {
            const x = baseX + (flip ? (frame.w - 1 - fx) * scale + sx : fx * scale + sx);
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
