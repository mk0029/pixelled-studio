import type { EffectId } from "@/types/project";
import { compileExpression, type ExprVars } from "./expression";

export interface ShaderContext {
  x: number;
  y: number;
  nx: number;
  ny: number;
  t: number;
  w: number;
  h: number;
  /** Aspect-corrected centred coordinates. Circles stay circular at any grid size. */
  aspect: number;
  cx: number;
  cy: number;
  r: number;
  i: number;
  density: number;
  angle: number;
  /** Percentage of pixels that twinkle at any instant. */
  sparkleDensity?: number;
  /** Flashes per second. */
  sparkleRate?: number;
  /** Source string for the custom expression shader. */
  expression?: string;
}

const exprCache = new Map<string, (v: ExprVars) => number>();
function expressionFor(src: string): (v: ExprVars) => number {
  let fn = exprCache.get(src);
  if (!fn) {
    fn = compileExpression(src);
    exprCache.set(src, fn);
  }
  return fn;
}

export const hash2 = (x: number, y: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

export const fract = (v: number) => v - Math.floor(v);
const wrap01 = (v: number) => fract(v + 2);

/** Rotate around the grid centre so 0/90/180/270 stay aligned with the matrix. */
export function rotateUV(nx: number, ny: number, angle: number): [number, number] {
  const a = (angle * Math.PI) / 180;
  const ca = Math.cos(a), sa = Math.sin(a);
  const dx = nx - 0.5, dy = ny - 0.5;
  return [0.5 + dx * ca + dy * sa, 0.5 - dx * sa + dy * ca];
}

/** Scale factors that turn normalised deltas into aspect-corrected deltas. */
export function aspectScale(c: ShaderContext): [number, number] {
  return c.aspect >= 1 ? [1, 1 / c.aspect] : [c.aspect, 1];
}

/**
 * Aspect-corrected centred coordinates for any matrix size.
 * Normalised so the radius range stays comparable across 30x8 and 100x100.
 */
export function polarCoords(nx: number, ny: number, w: number, h: number) {
  const aspect = h > 0 ? w / h : 1;
  const scale = Math.max(aspect, 1 / aspect);
  const cx = ((nx - 0.5) * (aspect >= 1 ? aspect : 1)) / scale;
  const cy = ((ny - 0.5) * (aspect < 1 ? 1 / aspect : 1)) / scale;
  return { aspect, cx, cy, r: Math.hypot(cx, cy) };
}

/** Returns 0..1 intensity for one pixel at one instant. */
export function sampleShader(effect: EffectId, c: ShaderContext): number {
  const [u, v] = rotateUV(c.nx, c.ny, c.angle);
  const d = c.density;
  const t = c.t;
  const { aspect, cx, cy, r } = polarCoords(u, v, c.w, c.h);
  // Pixel-space equivalents of the rotated UVs for hash-based patterns.
  const px = u * Math.max(0, c.w - 1);
  const py = v * Math.max(0, c.h - 1);

  switch (effect) {
    case "sweep": {
      const p = wrap01(t * 0.28);
      return Math.max(0, 1 - Math.abs(u - p) * 9 * d);
    }
    case "chase": {
      const f = wrap01(u * 2 * d - t * 1.4);
      return Math.pow(1 - f, 7);
    }
    case "bounce": {
      const bx = Math.abs(wrap01(t * 0.42) * 2 - 1);
      return Math.max(0, 1 - Math.hypot(u - bx, v - 0.5) * 5 * d);
    }
    case "wave":
      return (Math.sin((u * 9 * d - t * 3) * Math.PI) * Math.cos((v * 6 * d + t * 1.6) * Math.PI) + 1) / 2;
    case "plasma":
      return (Math.sin(u * 12 * d + t) + Math.sin(v * 9 * d - t) + Math.sin((u + v) * 7 * d + t / 2) + 3) / 6;
    case "vortex": {
      const ang = Math.atan2(cy, cx);
      return (Math.sin(ang * 3 - r * 22 * d + t * 3) + 1) / 2 * Math.max(0, 1 - r);
    }
    case "radar": {
      const ang = Math.atan2(cy, cx);
      const beam = wrap01(t * 0.22);
      let diff = Math.abs(wrap01(ang / (2 * Math.PI)) - beam);
      if (diff > 0.5) diff = 1 - diff;
      return Math.max(0, 1 - diff * 16) * Math.max(0, 1 - r * 0.8);
    }
    case "ripple": {
      const phase = wrap01(t * 0.65);
      const ring = Math.abs(r * 2 * d - phase);
      return Math.max(0, 1 - Math.min(ring, 1 - ring) * 22);
    }
    case "pulse":
      return Math.max(0, 1 - Math.abs(r * 2 * d - wrap01(t * 0.4)) * 9);
    case "matrix": {
      const speed = 0.4 + hash2(Math.floor(px / 2), 7) * 1.4;
      const head = wrap01(t * speed + hash2(Math.floor(px / 2), 3));
      const tail = wrap01(head - v * 0.55);
      return hash2(Math.floor(px / 2), Math.floor(t * 12)) > 0.25 ? Math.pow(tail, 3) : 0;
    }
    case "bitwise": {
      const q = Math.max(1, Math.round(4 * d));
      const val = (Math.floor(u * q) ^ Math.floor(v * q)) / q;
      return wrap01(val + t * 0.2) > 0.4 ? 1 : 0.12;
    }
    case "fire": {
      const n = hash2(Math.floor(u * 14 * d), Math.floor(v * 9 * d - t * 5));
      return Math.max(0, (1 - v) * n * (1 - v * 0.35));
    }
    case "sparkle": {
      const density = Math.max(0, Math.min(0.95, (c.sparkleDensity ?? 6) / 100));
      const rate = Math.max(0.5, c.sparkleRate ?? 9);
      return hash2(Math.floor(px * 1.7), Math.floor(py * 1.7) * 31 + Math.floor(t * rate)) > 1 - density ? 1 : 0;
    }
    case "rainbow":
      return 1;
    case "custom": {
      const fn = expressionFor(c.expression ?? "");
      const value = fn({
        x: c.x, y: c.y, nx: c.nx, ny: c.ny, u, v, t, i: c.i,
        r, a: Math.atan2(cy, cx), d, w: c.w, h: c.h, aspect, cx, cy,
      });
      return value > 0 ? (value > 1 ? 1 : value) : 0;
    }
    case "text":
    case "media":
      return 0;
  }
  return 0;
}

export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hh = ((h % 360) + 360) % 360;
  const cc = (1 - Math.abs(2 * l - 1)) * s;
  const x = cc * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = l - cc / 2;
  const [r, g, b] = hh < 60 ? [cc, x, 0] : hh < 120 ? [x, cc, 0] : hh < 180 ? [0, cc, x]
    : hh < 240 ? [0, x, cc] : hh < 300 ? [x, 0, cc] : [cc, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/./g, "$&$&") : h, 16);
  if (Number.isNaN(n)) return [255, 255, 255];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
