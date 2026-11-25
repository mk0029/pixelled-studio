import type { Layer } from "@/types/project";
import { hexToRgb, hslToRgb } from "../mathShaders";

type RGB = [number, number, number];
type Vec = [number, number];

const TAU = Math.PI * 2;
const mod = (v: number, n: number) => ((v % n) + n) % n;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const bounce = (v: number, span: number) => {
  const s = Math.max(1, span);
  const p = mod(v, s * 2);
  return p <= s ? p : s * 2 - p;
};
const hash = (x: number, y: number, z = 0) => {
  const v = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return v - Math.floor(v);
};

interface DotParticle {
  x: number;
  y: number;
  size: number;
  speed: number;
  phase: number;
  seed: number;
  pick: number;
}

function put(out: Uint8ClampedArray, cols: number, rows: number, x: number, y: number, c: RGB, alpha: number) {
  if (x < 0 || y < 0 || x >= cols || y >= rows || alpha <= 0) return;
  const i = (y * cols + x) * 4;
  if (alpha <= out[i + 3] / 255) return;
  out[i] = c[0]; out[i + 1] = c[1]; out[i + 2] = c[2];
  out[i + 3] = Math.round(alpha * 255);
}

function paintDot(out: Uint8ClampedArray, cols: number, rows: number,
  x: number, y: number, size: number, c: RGB, alpha: number, glow: boolean) {
  const r = Math.floor(size / 2);
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) put(out, cols, rows, Math.round(x) + dx, Math.round(y) + dy, c, alpha);
  }
  if (!glow) return;
  const outer = r + 1;
  for (let dy = -outer; dy <= outer; dy++) {
    for (let dx = -outer; dx <= outer; dx++) {
      if (Math.abs(dx) <= r && Math.abs(dy) <= r) continue;
      const edge = Math.abs(dx) === outer || Math.abs(dy) === outer;
      put(out, cols, rows, Math.round(x) + dx, Math.round(y) + dy, c, alpha * (edge ? 0.1 : 0.24));
    }
  }
}

function sparseStamp(size: number): boolean[] {
  return Array.from({ length: size * size }, (_, i) => i % 9 === 0);
}

function stampParticles(layer: Layer, cols: number, rows: number, variance: number): DotParticle[] {
  const size = layer.dotsStampSize === 16 ? 16 : 8;
  const bits = Array.isArray(layer.dotsStamp) && layer.dotsStamp.length === size * size
    ? layer.dotsStamp : sparseStamp(size);
  const tile = layer.dotsTile ?? true;
  const tilesX = tile ? Math.ceil(cols / size) : 1;
  const tilesY = tile ? Math.ceil(rows / size) : 1;
  const originX = tile ? 0 : (cols - size) / 2;
  const originY = tile ? 0 : (rows - size) / 2;
  const particles: DotParticle[] = [];

  for (let ty = 0; ty < tilesY; ty++) {
    for (let tx = 0; tx < tilesX; tx++) {
      for (let sy = 0; sy < size; sy++) {
        for (let sx = 0; sx < size; sx++) {
          const i = sy * size + sx;
          if (!bits[i]) continue;
          const seed = hash(i, size);
          particles.push({
            x: originX + tx * size + sx,
            y: originY + ty * size + sy,
            size: 1,
            speed: 1 + (seed * 2 - 1) * variance,
            phase: seed * TAU,
            seed,
            pick: seed,
          });
        }
      }
    }
  }
  return particles;
}

function scatterParticles(layer: Layer, cols: number, rows: number, variance: number): DotParticle[] {
  const count = clamp(Math.round(layer.dotsCount ?? 80), 1, 500);
  const seed = Math.floor(layer.dotsSeed ?? 1);
  const distribution = layer.dotsDistribution ?? "scatter";
  const randomSize = layer.dotsSizeRandom ?? false;
  const sizeMin = clamp(Math.round(layer.dotsSizeMin ?? 1), 1, 8);
  const sizeMax = clamp(Math.round(layer.dotsSizeMax ?? 3), sizeMin, 8);
  const centerX = (cols - 1) / 2;
  const centerY = (rows - 1) / 2;
  const particles: DotParticle[] = [];

  for (let i = 0; i < count; i++) {
    const a = hash(seed, i * 3 + 1);
    const b = hash(seed, i * 3 + 2);
    const c = hash(seed, i * 3 + 3);
    const d = hash(seed, i * 3 + 4);
    let x = a * cols;
    let y = b * rows;

    if (distribution === "cluster") {
      const angle = a * TAU;
      const radius = Math.sqrt(b);
      x = centerX + Math.cos(angle) * radius * cols * 0.25;
      y = centerY + Math.sin(angle) * radius * rows * 0.3;
    } else if (distribution === "wave") {
      x = a * cols;
      y = centerY + Math.sin(x * 0.35 + b * TAU) * rows * 0.3 + (c - 0.5) * rows * 0.12;
    }

    particles.push({
      x: mod(x, cols),
      y: mod(y, rows),
      size: randomSize ? Math.round(sizeMin + c * (sizeMax - sizeMin)) : sizeMin,
      speed: Math.max(0.1, 1 + (d * 2 - 1) * variance),
      phase: c * TAU,
      seed: d,
      pick: i / count,
    });
  }
  return particles;
}

function directionVector(dir: string): Vec {
  const diag = 1 / Math.SQRT2;
  switch (dir) {
    case "up": return [0, -1];
    case "down": return [0, 1];
    case "left": return [-1, 0];
    case "right": return [1, 0];
    case "diag-ul": return [-diag, -diag];
    case "diag-ur": return [diag, -diag];
    case "diag-dl": return [-diag, diag];
    case "diag-dr": return [diag, diag];
    default: return [0, 0];
  }
}

function particlePosition(p: DotParticle, distance: number, dir: string,
  cols: number, rows: number, wrap: boolean, jitter: number, phaseTime: number): Vec {
  const wobble = Math.sin(phaseTime * (1.4 + p.seed * 2) + p.phase) * (jitter / 100) * 2;
  const centerX = (cols - 1) / 2;
  const centerY = (rows - 1) / 2;
  const maxR = Math.hypot(centerX, centerY) || 1;
  const d = distance * p.speed;

  if (dir === "radial-out" || dir === "radial-in" || dir === "expand" || dir === "converge") {
    const sign = dir === "radial-in" || dir === "converge" ? -1 : 1;
    const dx = p.x - centerX;
    const dy = p.y - centerY;
    const angle = Math.atan2(dy, dx);
    const r0 = Math.hypot(dx, dy);
    const r = wrap ? mod(r0 + sign * d, maxR) : bounce(r0 + sign * d, maxR);
    return [centerX + Math.cos(angle) * r, centerY + Math.sin(angle) * r];
  }

  if (dir === "drift") {
    const angle = p.phase + phaseTime * (0.2 + p.seed * 0.5);
    const x = p.x + Math.cos(angle) * d + wobble;
    const y = p.y + Math.sin(angle) * d + wobble;
    return wrap ? [mod(x, cols), mod(y, rows)] : [bounce(x, cols), bounce(y, rows)];
  }

  const [vx, vy] = directionVector(dir);
  const x = p.x + vx * d - vy * wobble;
  const y = p.y + vy * d + vx * wobble;
  return wrap ? [mod(x, cols), mod(y, rows)] : [bounce(x, cols), bounce(y, rows)];
}

function blinkAlpha(layer: Layer, p: DotParticle, time: number): number {
  const mode = layer.dotsBlinkMode ?? "none";
  if (mode === "sync") return Math.floor(time * 4) % 2 === 0 ? 1 : 0;
  if (mode === "twinkle") return 0.15 + 0.85 * (Math.sin(time * (2 + p.seed * 3) + p.phase) * 0.5 + 0.5);
  if (mode === "sparkle") {
    const phase = mod(time * (0.7 + p.seed * 2) + p.phase, 1);
    return phase > 0.85 ? (phase - 0.85) / 0.15 : 0.04;
  }
  return 1;
}

/** Stateless particle/stamp renderer shared by live preview and AVI export. */
export function renderDotGenerator(layer: Layer, cols: number, rows: number, time: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(cols * rows * 4);
  if (cols <= 0 || rows <= 0) return out;

  const generator = layer.dotsGenerator ?? "particles";
  const variance = clamp((layer.dotsSpeedVariance ?? 20) / 100, 0, 1);
  const particles = generator === "stamp"
    ? stampParticles(layer, cols, rows, variance)
    : scatterParticles(layer, cols, rows, variance);

  const dir = layer.dotsParticleDirection ?? "down";
  const speed = clamp(layer.dotsParticleSpeed ?? 30, 0, 100);
  const pps = (speed / 100) * Math.max(cols, rows);
  const distance = time * pps;
  const phaseTime = pps > 0 ? time : 0;
  const wrap = layer.dotsWrap ?? true;
  const jitter = clamp(layer.dotsJitter ?? 0, 0, 100);
  const trail = clamp(Math.round(layer.dotsTrail ?? 0), 0, 20);
  const glow = layer.dotsGlow ?? false;
  const colorMode = layer.dotsColorMode ?? "single";
  const palette = layer.dotsPalette?.length ? layer.dotsPalette : [layer.color || "#ffffff"];
  const baseColor = hexToRgb(layer.color || "#ffffff");

  const colorOf = (p: DotParticle, x: number, y: number): RGB => {
    if (colorMode === "palette") return hexToRgb(palette[Math.floor(p.pick * palette.length) % palette.length]);
    if (colorMode === "rainbow" || colorMode === "cycle") {
      return hslToRgb(mod(p.pick * 360 + time * 60, 360), 1, 0.55);
    }
    if (colorMode === "gradient" || colorMode === "dual") {
      return hslToRgb(mod(((x + y) / Math.max(1, cols + rows)) * 240 + time * 25, 360), 1, 0.55);
    }
    return baseColor;
  };

  for (const p of particles) {
    const blink = blinkAlpha(layer, p, time);
    if (blink <= 0) continue;

    if (pps > 0) {
      for (let k = trail; k >= 1; k--) {
        const [tx, ty] = particlePosition(p, distance - k, dir, cols, rows, wrap, jitter, phaseTime);
        const fade = Math.pow(1 - k / (trail + 1), 1.6);
        const c = colorOf(p, tx, ty);
        paintDot(out, cols, rows, tx, ty, p.size, c, blink * fade, false);
      }
    }

    const [x, y] = particlePosition(p, distance, dir, cols, rows, wrap, jitter, phaseTime);
    if (x < -2 || y < -2 || x > cols + 1 || y > rows + 1) continue;
    paintDot(out, cols, rows, x, y, p.size, colorOf(p, x, y), blink, glow);
  }
  return out;
}

/** Renders a stackable dots / lines layer into an RGBA buffer. */
export function renderDotsLinesLayer(layer: Layer, cols: number, rows: number, time: number): Uint8ClampedArray {
  if ((layer.dotsGenerator ?? "classic") !== "classic") return renderDotGenerator(layer, cols, rows, time);
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
