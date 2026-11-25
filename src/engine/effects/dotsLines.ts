import type { Layer } from "@/types/project";
import { hexToRgb, hslToRgb } from "../mathShaders";

type RGB = [number, number, number];

const mod = (v: number, n: number) => ((v % n) + n) % n;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const bounce = (v: number, span: number) => {
  const s = Math.max(1, span);
  const p = mod(v, s * 2);
  return p <= s ? p : s * 2 - p;
};
const hash = (x: number, y: number) => {
  const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return v - Math.floor(v);
};

/** Renders a stackable dots / lines layer into an RGBA buffer. */
export function renderDotsLinesLayer(layer: Layer, cols: number, rows: number, time: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(cols * rows * 4);
  if (cols <= 0 || rows <= 0) return out;

  const mode = layer.dotsMode ?? "dots";
  const layout = layer.dotsLayout ?? "grid";
  const count = clamp(Math.round(layer.dotsCount ?? 8), 1, 64);
  const thick = clamp(Math.round(layer.dotsThickness ?? 2), 1, 16);
  const len = clamp(Math.round(layer.dotsLength ?? 8), 1, 64);
  const gap = clamp(Math.round(layer.dotsSpacing ?? 4), 1, 32);
  const speed = Math.max(0, layer.dotsSpeed ?? 1);
  const effect = layer.dotsEffect ?? "solid";
  const colorMode = layer.dotsColorMode ?? "solid";
  const dir = layer.dotsDirection ?? "right";
  const pingPong = layer.dotsBounce ?? false;

  const centerX = (cols - 1) / 2;
  const centerY = (rows - 1) / 2;
  const maxR = Math.hypot(centerX, centerY) || 1;
  const travel = time * speed * 4;
  const radialStep = Math.max(1, maxR / count);
  const radialTravel = pingPong ? bounce(travel, radialStep) : mod(travel, radialStep);

  const colCount = Math.max(1, Math.round((count * cols) / rows));
  const rowCount = Math.max(1, count);
  const colStep = cols / colCount;
  const rowStep = rows / rowCount;
  const diagStep = Math.max(1, (cols + rows) / count);

  const axisLen = dir === "up" || dir === "down" ? rows : cols;
  const axisTravel = pingPong ? bounce(travel, axisLen) : mod(travel, axisLen);
  let dx = 0, dy = 0;
  if (dir === "left") dx = -axisTravel;
  else if (dir === "right") dx = axisTravel;
  else if (dir === "up") dy = -axisTravel;
  else if (dir === "down") dy = axisTravel;
  else if (dir === "diag-ul") { dx = -axisTravel; dy = -axisTravel; }
  else if (dir === "diag-ur") { dx = axisTravel; dy = -axisTravel; }
  else if (dir === "diag-dl") { dx = -axisTravel; dy = axisTravel; }
  else if (dir === "diag-dr") { dx = axisTravel; dy = axisTravel; }

  const baseColor = hexToRgb(layer.color || "#ffffff");
  const altColor = hexToRgb(layer.gradient?.[1] || "#9a7cff");
  const colorAt = (x: number, y: number): RGB => {
    if (colorMode === "rainbow") return hslToRgb(mod((x + y) * 7 + time * 60, 360), 1, 0.55);
    if (colorMode === "cycle") return hslToRgb(mod(time * 60, 360), 1, 0.55);
    if (colorMode === "dual") {
      const f = mod((x + y) / Math.max(1, cols + rows) + time * 0.1, 1);
      return [
        baseColor[0] + (altColor[0] - baseColor[0]) * f,
        baseColor[1] + (altColor[1] - baseColor[1]) * f,
        baseColor[2] + (altColor[2] - baseColor[2]) * f,
      ];
    }
    return baseColor;
  };

  const alphaAt = (x: number, y: number, cellX: number, cellY: number): number => {
    if (effect === "blink") return Math.floor(time * 4) % 2 === 0 ? 1 : 0;
    if (effect === "pulse") return 0.25 + 0.75 * (Math.sin(time * Math.PI * 2) * 0.5 + 0.5);
    if (effect === "chase") {
      const radial = dir === "expand" || dir === "converge";
      const along = dir === "up" || dir === "down" ? y : radial
        ? Math.hypot(x - centerX, y - centerY) : x;
      return mod(along - (radial ? radialTravel : axisTravel), len + gap) < len ? 1 : 0;
    }
    if (effect === "twinkle") {
      const seed = hash(cellX, cellY);
      return seed > 0.55 && Math.sin(time * 3 + seed * 12) > -0.2 ? 1 : 0;
    }
    return 1;
  };

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const u = x + dx, v = y + dy;
      const ux = Math.floor(u / colStep), uy = Math.floor(v / rowStep);
      const localX = u - ux * colStep, localY = v - uy * rowStep;
      const radius = Math.hypot(x - centerX, y - centerY);
      let on = false;
      let cellX = ux, cellY = uy;

      switch (layout) {
        case "checkerboard": {
          if ((ux + uy) % 2 !== 0) break;
          const size = clamp(Math.min(colStep, rowStep) - gap, 1, thick);
          on = Math.abs(localX - colStep / 2) < size / 2 && Math.abs(localY - rowStep / 2) < size / 2;
          break;
        }
        case "hstrips": {
          const bands = Math.max(1, rowStep - gap);
          const lineThickness = Math.min(thick, bands);
          cellY = Math.floor(v / rowStep);
          on = localY < lineThickness && Math.abs(u - centerX) <= len / 2;
          break;
        }
        case "vstrips": {
          const bands = Math.max(1, colStep - gap);
          const lineThickness = Math.min(thick, bands);
          cellX = Math.floor(u / colStep);
          on = localX < lineThickness && Math.abs(v - centerY) <= len / 2;
          break;
        }
        case "diag": {
          cellX = Math.floor(mod(u + v, diagStep) / diagStep);
          on = mod(u + v, diagStep) < Math.min(thick, Math.max(1, diagStep - gap));
          break;
        }
        case "border": {
          const bx = x + dx, by = y + dy;
          const inset = Math.min(bx, by, cols - 1 - bx, rows - 1 - by);
          cellX = cellY = Math.floor(inset / (thick + gap));
          on = cellX < count && mod(inset, thick + gap) < thick;
          break;
        }
        case "scatter": {
          on = hash(ux, uy) < count / (colCount * rowCount);
          const size = clamp(Math.min(colStep, rowStep) - gap, 1, thick);
          on = on && Math.abs(localX - colStep / 2) < size / 2 && Math.abs(localY - rowStep / 2) < size / 2;
          break;
        }
        default: {
          const size = clamp(Math.min(colStep, rowStep) - gap, 1, thick);
          if (mode === "dots") {
            on = Math.abs(localX - colStep / 2) < size / 2 && Math.abs(localY - rowStep / 2) < size / 2;
          } else {
            const lineLen = Math.min(len, Math.max(1, colStep));
            on = localY >= (rowStep - size) / 2 && localY < (rowStep + size) / 2
              && localX >= (colStep - lineLen) / 2 && localX < (colStep + lineLen) / 2;
          }
        }
      }

      if (!on) continue;

      if (dir === "expand" || dir === "converge") {
        const phase = mod(radius + (dir === "expand" ? -radialTravel : radialTravel), radialStep);
        if (phase >= Math.min(thick, Math.max(1, radialStep - gap))) continue;
      }

      if (mode === "dashed") {
        const radial = dir === "expand" || dir === "converge";
        const along = dir === "up" || dir === "down" ? v : radial ? radius : x;
        if (mod(along - (radial ? radialTravel : axisTravel), len + gap) >= len) continue;
      }

      const alpha = alphaAt(x, y, cellX, cellY);
      if (alpha <= 0) continue;
      const [r, g, b] = colorAt(x, y);
      const i = (y * cols + x) * 4;
      out[i] = r; out[i + 1] = g; out[i + 2] = b; out[i + 3] = Math.round(alpha * 255);
    }
  }
  return out;
}
