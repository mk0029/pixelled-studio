import type { ShaderContext } from "./mathShaders";
import { aspectScale, hash2, fract } from "./mathShaders";

export interface MathEffect {
  id: string;
  name: string;
  category: string;
  description: string;
  fn: (c: ShaderContext) => number;
}

export const MATH_CATEGORIES = [
  "Trigonometric & Wave",
  "Polar, Spiral & Vortex",
  "Bitwise & Boolean Logic",
  "Cellular Automata",
  "Particle Physics",
  "Noise & Fluid Fields",
  "Geometric Scanners",
  "Custom Formula",
] as const;

const TAU = Math.PI * 2;
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Cell counts grow with the matrix so cellular patterns stay dense on 100x100. */
function cellCounts(c: ShaderContext, baseX: number, baseY: number) {
  return [Math.max(baseX, Math.round(c.w * 0.8)), Math.max(baseY, Math.round(c.h * 0.8))] as const;
}

type K = (c: ShaderContext, m: number) => number;

const kernels: { name: string; category: string; fn: K }[] = [
  // Trigonometric & Wave (4 variants each)
  { name: "Dual-Sine Cross", category: "Trigonometric & Wave", fn: (c, m) => {
    const u = c.nx, v = c.ny, t = c.t, d = c.density;
    return (Math.sin((u * (6 + m) * d - t * (2 + m * 0.3)) * Math.PI) * Math.cos((v * (4 + m) * d + t * 1.3) * Math.PI) + 1) / 2;
  } },
  { name: "Plasma Interference", category: "Trigonometric & Wave", fn: (c, m) => {
    const u = c.nx, v = c.ny, t = c.t, d = c.density;
    return (Math.sin(u * (10 + m * 2) * d + t) + Math.sin(v * (8 + m) * d - t) + Math.sin((u + v) * (6 + m) * d + t / 2) + 3) / 6;
  } },
  { name: "Standing Wave Grid", category: "Trigonometric & Wave", fn: (c, m) => {
    const u = c.nx, v = c.ny, t = c.t, d = c.density;
    return (Math.sin(u * (12 + m * 3) * d) * Math.cos(t * (1.5 + m * 0.4)) + Math.sin(v * (9 + m * 2) * d) * Math.cos(t * (1.2 + m * 0.3)) + 2) / 4;
  } },
  { name: "Diagonal Cosine Ripples", category: "Trigonometric & Wave", fn: (c, m) => {
    const u = c.nx, v = c.ny, t = c.t, d = c.density;
    return (Math.cos((u + v) * (10 + m * 2) * d - t * (2 + m * 0.5)) + 1) / 2;
  } },
  { name: "Phase-Shifted RGB Waves", category: "Trigonometric & Wave", fn: (c, m) => {
    const u = c.nx, v = c.ny, t = c.t, d = c.density;
    return clamp01(Math.sin(u * (8 + m * 2) * d + t + m) * 0.5 + Math.sin(v * (6 + m) * d - t * 0.7 + m * 1.2) * 0.5 + 0.5);
  } },
  { name: "Moiré Lattice", category: "Trigonometric & Wave", fn: (c, m) => {
    const u = c.nx, v = c.ny, t = c.t, d = c.density;
    const a = Math.sin((u * (14 + m * 3) * d + t) * Math.PI);
    const b = Math.sin((v * (14 + m * 3) * d - t) * Math.PI);
    return (a * b + 1) / 2;
  } },
  { name: "Lissajous Harmonics", category: "Trigonometric & Wave", fn: (c, m) => {
    const u = c.nx, v = c.ny, t = c.t, d = c.density;
    const x = Math.sin((2 + m) * t * 0.6 + Math.PI / 2);
    const y = Math.sin((3 + m) * t * 0.6);
    const [ax, ay] = aspectScale(c);
    return Math.max(0, 1 - Math.hypot(c.cx - x * 0.3 * ax, c.cy - y * 0.3 * ay) * (6 + m));
  } },
  { name: "Heartbeat Pulse Wave", category: "Trigonometric & Wave", fn: (c, m) => {
    const u = c.nx, v = c.ny, t = c.t;
    const beat = Math.pow(Math.sin(t * (2 + m * 0.5)) * 0.5 + 0.5, 4);
    return clamp01(beat * (1 - Math.abs(v - 0.5) * 4) * (0.5 + 0.5 * Math.sin(u * 20)));
  } },
  { name: "FM Carrier Wave", category: "Trigonometric & Wave", fn: (c, m) => {
    const u = c.nx, v = c.ny, t = c.t, d = c.density;
    return (Math.sin(u * (9 + m * 2) * d + Math.sin(v * (4 + m) * d + t) * (2 + m) + t) + 1) / 2;
  } },
  { name: "Triangular Sawtooth", category: "Trigonometric & Wave", fn: (c, m) => {
    const u = c.nx, v = c.ny, t = c.t, d = c.density;
    const s = fract(u * (4 + m) * d + t * (0.8 + m * 0.2));
    return 1 - Math.abs(s * 2 - 1);
  } },
  // Polar, Spiral & Vortex (4 variants each)
  { name: "Archimedean Spiral", category: "Polar, Spiral & Vortex", fn: (c, m) => {
    const cx = c.cx, cy = c.cy, t = c.t, d = c.density;
    const ang = Math.atan2(cy, cx), r = Math.hypot(cx, cy);
    return (Math.sin(r * (18 + m * 4) * d - ang * (2 + m) - t * 2) + 1) / 2 * Math.max(0, 1 - r * 1.2);
  } },
  { name: "Logarithmic Galaxy Vortex", category: "Polar, Spiral & Vortex", fn: (c, m) => {
    const cx = c.cx, cy = c.cy, t = c.t, d = c.density;
    const ang = Math.atan2(cy, cx), r = Math.hypot(cx, cy);
    return (Math.sin(ang * (3 + m) - Math.log(r + 0.05) * (8 + m * 2) * d + t * 2) + 1) / 2 * Math.max(0, 1 - r);
  } },
  { name: "Concentric Shockwave Rings", category: "Polar, Spiral & Vortex", fn: (c, m) => {
    const cx = c.cx, cy = c.cy, t = c.t, d = c.density;
    const r = Math.hypot(cx, cy);
    const phase = fract(t * (0.6 + m * 0.15));
    const ring = Math.abs(r * (2 + m * 0.3) * d - phase);
    return Math.max(0, 1 - Math.min(ring, 1 - ring) * (18 + m * 2)) * Math.max(0, 1 - r);
  } },
  { name: "Polar Rose Curves", category: "Polar, Spiral & Vortex", fn: (c, m) => {
    const cx = c.cx, cy = c.cy, t = c.t;
    const ang = Math.atan2(cy, cx), r = Math.hypot(cx, cy);
    const k = 3 + m;
    const rose = Math.cos(k * ang + t) * 0.25;
    return Math.max(0, 1 - Math.abs(r - Math.abs(rose)) * 12);
  } },
  { name: "Kaleidoscope Mirror", category: "Polar, Spiral & Vortex", fn: (c, m) => {
    const cx = c.cx, cy = c.cy, t = c.t;
    const folds = 4 + m * 2;
    const ang = Math.atan2(cy, cx);
    const sector = (ang + Math.PI) % (Math.PI * 2 / folds);
    const r = Math.hypot(cx, cy);
    return (Math.sin(sector * folds + r * 12 - t * 2) + 1) / 2 * Math.max(0, 1 - r);
  } },
  { name: "Radar Sweep Sonar", category: "Polar, Spiral & Vortex", fn: (c, m) => {
    const cx = c.cx, cy = c.cy, t = c.t;
    const ang = Math.atan2(cy, cx);
    const beam = fract(t * (0.2 + m * 0.05));
    let diff = Math.abs(fract(ang / TAU) - beam);
    if (diff > 0.5) diff = 1 - diff;
    const r = Math.hypot(cx, cy);
    return Math.max(0, 1 - diff * (12 + m * 2)) * Math.max(0, 1 - r * 0.9);
  } },
  { name: "Hypnotic Tunnel Zoom", category: "Polar, Spiral & Vortex", fn: (c, m) => {
    const cx = c.cx, cy = c.cy, t = c.t;
    const r = Math.hypot(cx, cy) + 0.001;
    const ang = Math.atan2(cy, cx);
    return (Math.sin(1 / r * (1 + m * 0.3) + t * 2 + ang * (2 + m)) + 1) / 2 * Math.max(0, 1 - r);
  } },
  { name: "Pinwheel Blades", category: "Polar, Spiral & Vortex", fn: (c, m) => {
    const cx = c.cx, cy = c.cy, t = c.t;
    const ang = Math.atan2(cy, cx), r = Math.hypot(cx, cy);
    return Math.max(0, Math.sin(ang * (4 + m * 2) - t * 3 - r * 6) );
  } },
  { name: "Black Hole Accretion", category: "Polar, Spiral & Vortex", fn: (c, m) => {
    const cx = c.cx, cy = c.cy, t = c.t;
    const r = Math.hypot(cx, cy) + 0.02;
    const ang = Math.atan2(cy, cx);
    return Math.max(0, 1 - r * 2) * 0.3 + (Math.sin(ang * 5 - Math.log(r) * 10 + t * 2) + 1) / 2 * Math.max(0, 1 - r * 1.5) * 0.7;
  } },
  // Bitwise & Boolean Logic
  { name: "Sierpinski XOR", category: "Bitwise & Boolean Logic", fn: (c, m) => {
    const x = Math.floor(c.nx * (8 + m * 4)), y = Math.floor(c.ny * (8 + m * 4));
    const v = (x ^ y) / (16 + m * 4);
    return fract(v + c.t * 0.1) > 0.5 ? 1 : 0.08;
  } },
  { name: "Animated XOR Lattice", category: "Bitwise & Boolean Logic", fn: (c, m) => {
    const x = Math.floor(c.nx * (10 + m * 2)), y = Math.floor(c.ny * (10 + m * 2));
    const v = ((x + Math.floor(c.t * 3)) ^ (y - Math.floor(c.t * 2))) % (12 + m * 2);
    return v > 0 ? 1 : 0.05;
  } },
  { name: "Bitwise AND Lattice", category: "Bitwise & Boolean Logic", fn: (c, m) => {
    const x = Math.floor(c.nx * (8 + m * 4)), y = Math.floor(c.ny * (8 + m * 4));
    const v = (x & y) / (16 + m * 4);
    return fract(v * 3 + c.t * 0.2) > 0.4 ? 1 : 0.1;
  } },
  { name: "Bitwise OR Diamond", category: "Bitwise & Boolean Logic", fn: (c, m) => {
    const x = Math.floor(c.nx * (8 + m * 4)), y = Math.floor(c.ny * (8 + m * 4));
    const v = (x | y) / (16 + m * 4);
    return fract(v * 2 + c.t * 0.15) > 0.5 ? 1 : 0.08;
  } },
  { name: "Modulo Prime Grid", category: "Bitwise & Boolean Logic", fn: (c, m) => {
    const x = Math.floor(c.nx * (12 + m * 2)), y = Math.floor(c.ny * (12 + m * 2));
    const v = (x * y) % (11 + m * 3);
    return v === 0 ? 1 : v / (11 + m * 3);
  } },
  { name: "Gray-Code Counter", category: "Bitwise & Boolean Logic", fn: (c, m) => {
    const x = Math.floor(c.nx * (8 + m * 4));
    const g = x ^ (x >> 1);
    const bit = (g >> (Math.floor(c.t * (2 + m * 0.5)) % 4)) & 1;
    return bit ? 1 : 0.1;
  } },
  { name: "Parity Checkerboard", category: "Bitwise & Boolean Logic", fn: (c, m) => {
    const x = Math.floor(c.nx * (10 + m * 2)), y = Math.floor(c.ny * (10 + m * 2));
    const parity = (x + y) % 2;
    return parity ^ (Math.floor(c.t * (1 + m * 0.3)) % 2) ? 1 : 0.05;
  } },
  { name: "Hamming Distance Field", category: "Bitwise & Boolean Logic", fn: (c, m) => {
    const a = Math.floor(c.nx * 255), b = Math.floor(c.ny * 255);
    let h = a ^ b;
    let cnt = 0;
    while (h) { cnt += h & 1; h >>= 1; }
    return cnt / 8;
  } },
  { name: "Bit-Shift Cascade", category: "Bitwise & Boolean Logic", fn: (c, m) => {
    const x = Math.floor(c.nx * (8 + m * 4));
    const shifted = (x << (Math.floor(c.t * (2 + m)) % 4)) & 15;
    return shifted / 15;
  } },
  // Cellular Automata (approximated as procedural)
  { name: "Conway Life (procedural)", category: "Cellular Automata", fn: (c, m) => {
    const [gx, gy] = cellCounts(c, 24, 16);
    const x = Math.floor(c.nx * gx), y = Math.floor(c.ny * gy);
    const n = hash2(x, y) + hash2(x + 1, y) + hash2(x, y + 1) + hash2(x - 1, y) + hash2(x, y - 1);
    const alive = hash2(x + Math.floor(c.t * (0.5 + m * 0.2)), y + Math.floor(c.t * (0.3 + m * 0.1))) > 0.7;
    return alive && n > 1.5 && n < 3.5 ? 1 : 0.05;
  } },
  { name: "Brian's Brain 3-State", category: "Cellular Automata", fn: (c, m) => {
    const [gx, gy] = cellCounts(c, 20, 12);
    const x = Math.floor(c.nx * gx), y = Math.floor(c.ny * gy);
    const phase = fract(hash2(x, y) + c.t * (0.4 + m * 0.1));
    return phase < 0.33 ? 1 : phase < 0.66 ? 0.5 : 0.05;
  } },
  { name: "Rule 30 Elementary", category: "Cellular Automata", fn: (c, m) => {
    const [gx, gy] = cellCounts(c, 32, 32);
    const row = Math.floor(c.ny * gy + c.t * (4 + m));
    const col = Math.floor(c.nx * gx);
    return hash2(col, row) > 0.5 ? 1 : 0.05;
  } },
  { name: "Rule 90 Sierpinski", category: "Cellular Automata", fn: (c, m) => {
    const [gx, gy] = cellCounts(c, 32, 32);
    const row = Math.floor(c.ny * gy + c.t * (3 + m));
    const col = Math.floor(c.nx * gx);
    const v = (col ^ row) & 1;
    return v ? 1 : 0.05;
  } },
  { name: "Rule 110", category: "Cellular Automata", fn: (c, m) => {
    const [gx, gy] = cellCounts(c, 32, 32);
    const row = Math.floor(c.ny * gy + c.t * (3 + m));
    const col = Math.floor(c.nx * gx);
    return hash2(col, row) > (0.4 + m * 0.05) ? 1 : 0.05;
  } },
  { name: "Cyclic Demon Spirals", category: "Cellular Automata", fn: (c, m) => {
    const [gx, gy] = cellCounts(c, 24, 16);
    const x = Math.floor(c.nx * gx), y = Math.floor(c.ny * gy);
    const phase = fract(hash2(x, y) * 3 + c.t * (0.6 + m * 0.1));
    const states = 4 + m;
    const s = Math.floor(phase * states);
    return (s + 1) / states;
  } },
  { name: "Langton's Ant Swarm", category: "Cellular Automata", fn: (c, m) => {
    const [gx, gy] = cellCounts(c, 20, 12);
    const x = Math.floor(c.nx * gx), y = Math.floor(c.ny * gy);
    const t = c.t * (0.5 + m * 0.1);
    const antX = Math.floor(t) % gx, antY = Math.floor(t * 0.7) % gy;
    return (x === antX && y === antY) ? 1 : hash2(x, y) > 0.85 ? 0.6 : 0.05;
  } },
  { name: "Reaction-Diffusion", category: "Cellular Automata", fn: (c, m) => {
    const u = c.nx, v = c.ny, t = c.t;
    return clamp01(0.5 + 0.3 * Math.sin(u * 20 + t) * Math.cos(v * 15 - t) + 0.2 * Math.sin((u + v) * 10 + t * 2));
  } },
  { name: "Forest Fire Percolation", category: "Cellular Automata", fn: (c, m) => {
    const [gx, gy] = cellCounts(c, 24, 16);
    const x = Math.floor(c.nx * gx), y = Math.floor(c.ny * gy);
    const fire = hash2(x, y) > (0.92 - m * 0.02);
    const tree = hash2(x * 7, y * 13) > 0.3;
    return fire ? 1 : tree ? 0.4 : 0.05;
  } },
  // Particle Physics
  { name: "Matrix Digital Rain", category: "Particle Physics", fn: (c, m) => {
    const px = Math.floor(c.nx * c.w), py = Math.floor(c.ny * c.h);
    const speed = 0.4 + hash2(Math.floor(px / (1 + m)), 7) * 1.4;
    const head = fract(c.t * speed + hash2(Math.floor(px / (1 + m)), 3));
    const tail = fract(head - c.ny * 0.55);
    return hash2(Math.floor(px / (1 + m)), Math.floor(c.t * 12)) > (0.2 + m * 0.05) ? Math.pow(tail, 3) : 0;
  } },
  { name: "Meteor Comet Drops", category: "Particle Physics", fn: (c, m) => {
    const u = c.nx, v = c.ny, t = c.t, d = c.density;
    const lanes = Math.max(3, Math.round(c.w * 0.25 * d));
    const lane = Math.floor(u * lanes);
    const head = fract(t * (0.6 + m * 0.1) * d + hash2(lane, 7));
    const tail = Math.max(6, Math.round(c.h * 0.4));
    return Math.max(0, 1 - Math.abs(v - head) * tail) * Math.max(0, 1 - Math.abs(fract(u * lanes) - 0.5) * 2.2);
  } },
  { name: "Diwali Fountain Sparks", category: "Particle Physics", fn: (c, m) => {
    const u = c.nx, v = c.ny, t = c.t;
    const burst = fract(t * (0.8 + m * 0.2));
    const [, ay] = aspectScale(c);
    const r = Math.hypot(c.cx, c.cy - (0.5 - burst * 0.8) * ay);
    return Math.max(0, 1 - r * (12 + m * 2)) * (1 - burst);
  } },
  { name: "Aerial Fireworks Burst", category: "Particle Physics", fn: (c, m) => {
    const cx = c.cx, cy = c.cy, t = c.t;
    const burst = fract(t * (0.5 + m * 0.1));
    const r = Math.hypot(cx, cy);
    const ang = Math.atan2(cy, cx);
    return burst < 0.6 ? Math.max(0, 1 - Math.abs(r - burst * 0.4) * 20) * (Math.sin(ang * (6 + m * 2) + t * 5) * 0.5 + 0.5) : 0;
  } },
  { name: "Bouncing Elastic Balls", category: "Particle Physics", fn: (c, m) => {
    const u = c.nx, v = c.ny, t = c.t;
    const bx = 0.5 + 0.3 * Math.sin(t * (1.2 + m * 0.3));
    const by = 0.5 + 0.3 * Math.cos(t * (0.9 + m * 0.2));
    const [ax, ay] = aspectScale(c);
    return Math.max(0, 1 - Math.hypot(c.cx - (bx - 0.5) * ax, c.cy - (by - 0.5) * ay) * (8 + m));
  } },
  { name: "Snowfall Drift", category: "Particle Physics", fn: (c, m) => {
    const px = Math.floor(c.nx * c.w), py = Math.floor(c.ny * c.h);
    const flake = hash2(px, Math.floor(c.t * (0.5 + m * 0.2) + py * 0.1));
    return flake > (0.93 - m * 0.02) ? 1 : 0;
  } },
  { name: "Rising Embers", category: "Particle Physics", fn: (c, m) => {
    const u = c.nx, v = c.ny, t = c.t;
    const ember = fract(v * (4 + m) + t * (0.8 + m * 0.2));
    return ember < 0.15 ? Math.max(0, 1 - Math.abs(u - 0.5) * (6 + m)) * (1 - ember / 0.15) : 0;
  } },
  { name: "Starfield Warp", category: "Particle Physics", fn: (c, m) => {
    const cx = c.cx, cy = c.cy, t = c.t;
    const r = Math.hypot(cx, cy) + 0.001;
    const ang = Math.atan2(cy, cx);
    const star = hash2(Math.floor(ang * 10), Math.floor(1 / r * 2));
    return star > (0.95 - m * 0.02) ? Math.max(0, 1 - r) : 0;
  } },
  { name: "Newton Pendulum Wave", category: "Particle Physics", fn: (c, m) => {
    const u = c.nx, v = c.ny, t = c.t;
    let val = 0;
    const [ax, ay] = aspectScale(c);
    for (let i = 0; i < 5 + m; i++) {
      const x = (i + 0.5) / (6 + m);
      const y = 0.5 + 0.3 * Math.sin(t * (1 + i * 0.1) + i);
      val = Math.max(val, Math.max(0, 1 - Math.hypot(c.cx - (x - 0.5) * ax, c.cy - (y - 0.5) * ay) * 15));
    }
    return val;
  } },
  { name: "Raindrop Ripples", category: "Particle Physics", fn: (c, m) => {
    const u = c.nx, v = c.ny, t = c.t;
    const drop = fract(t * (0.4 + m * 0.1));
    const [ax, ay] = aspectScale(c);
    const dropX = 0.3 + 0.4 * hash2(Math.floor(t * 2), 1);
    const dropY = 0.3 + 0.4 * hash2(1, Math.floor(t * 2));
    const r = Math.hypot(c.cx - (dropX - 0.5) * ax, c.cy - (dropY - 0.5) * ay);
    const ring = Math.abs(r - drop * 0.4);
    return Math.max(0, 1 - ring * 20) * (1 - drop);
  } },
  // Noise & Fluid Fields
  { name: "Perlin Flow Field", category: "Noise & Fluid Fields", fn: (c, m) => {
    const u = c.nx, v = c.ny, t = c.t;
    return clamp01(0.5 + 0.4 * Math.sin(u * (6 + m) + v * (4 + m) + t) * Math.cos(v * (6 + m) - u * (3 + m) + t * 0.7));
  } },
  { name: "fBm Clouds", category: "Noise & Fluid Fields", fn: (c, m) => {
    const u = c.nx, v = c.ny, t = c.t;
    let val = 0, amp = 0.5;
    for (let o = 0; o < 4 + m; o++) {
      val += amp * (Math.sin(u * (4 << o) + t * (0.5 + o * 0.2)) * Math.cos(v * (4 << o) - t * 0.3));
      amp *= 0.5;
    }
    return clamp01((val + 1) / 2);
  } },
  { name: "Procedural Fire Heat-Map", category: "Noise & Fluid Fields", fn: (c, m) => {
    const u = c.nx, v = c.ny, t = c.t;
    const n = hash2(Math.floor(u * (12 + m * 2)), Math.floor(v * (8 + m) - t * (4 + m)));
    return Math.max(0, (1 - v) * n * (1 - v * 0.3));
  } },
  { name: "Water Caustics", category: "Noise & Fluid Fields", fn: (c, m) => {
    const u = c.nx, v = c.ny, t = c.t;
    return clamp01(0.5 + 0.4 * Math.sin(u * 12 + Math.sin(v * 8 + t) * 2 + t) * Math.cos(v * 10 + Math.sin(u * 6 - t) * 2 - t * 0.7));
  } },
  { name: "Lava Lamp Metaballs", category: "Noise & Fluid Fields", fn: (c, m) => {
    const u = c.nx, v = c.ny, t = c.t;
    let val = 0;
    const [ax, ay] = aspectScale(c);
    for (let i = 0; i < 3 + m; i++) {
      const bx = 0.5 + 0.3 * Math.sin(t * (0.6 + i * 0.2) + i);
      const by = 0.5 + 0.3 * Math.cos(t * (0.5 + i * 0.15) + i * 1.3);
      val += 0.02 / (Math.hypot(c.cx - (bx - 0.5) * ax, c.cy - (by - 0.5) * ay) + 0.02);
    }
    return clamp01(val - 0.5);
  } },
  { name: "Voronoi Stained Glass", category: "Noise & Fluid Fields", fn: (c, m) => {
    const u = c.nx, v = c.ny, t = c.t;
    const cellX = Math.floor(u * (6 + m));
    const cellY = Math.floor(v * (6 + m));
    const d = hash2(cellX, cellY);
    const edge = Math.min(fract(u * (6 + m)), fract(v * (6 + m)));
    return edge < 0.05 ? 1 : d * 0.6 + 0.2;
  } },
  { name: "Electric Arc Lightning", category: "Noise & Fluid Fields", fn: (c, m) => {
    const u = c.nx, v = c.ny, t = c.t;
    const bolt = Math.abs(v - (0.5 + 0.3 * Math.sin(u * (8 + m * 2) + t * 4)));
    return bolt < (0.03 + m * 0.005) ? 1 : Math.max(0, 1 - bolt * 10) * 0.3;
  } },
  // Geometric Scanners
  { name: "Knight Rider Scanner", category: "Geometric Scanners", fn: (c, m) => {
    const u = c.nx, t = c.t;
    const pos = Math.abs(fract(t * (0.5 + m * 0.1)) * 2 - 1);
    return Math.max(0, 1 - Math.abs(u - pos) * (12 + m * 2));
  } },
  { name: "Crosshair Laser Sweep", category: "Geometric Scanners", fn: (c, m) => {
    const u = c.nx, v = c.ny, t = c.t;
    const xbeam = Math.abs(u - fract(t * (0.7 + m * 0.1)));
    const ybeam = Math.abs(v - fract(t * (0.5 + m * 0.1) + 0.3));
    return (xbeam < 0.02 ? 1 : 0) + (ybeam < 0.02 ? 1 : 0) > 0 ? 1 : 0.05;
  } },
  { name: "Expanding Diamond Frame", category: "Geometric Scanners", fn: (c, m) => {
    const u = c.nx, v = c.ny, t = c.t;
    const d = Math.abs(c.cx) + Math.abs(c.cy);
    const phase = fract(t * (0.6 + m * 0.1));
    return Math.abs(d - phase * 0.5) < 0.02 ? 1 : 0.05;
  } },
  { name: "Rotating Wireframe Cube", category: "Geometric Scanners", fn: (c, m) => {
    const u = c.nx, v = c.ny, t = c.t;
    const a = t * (0.6 + m * 0.1);
    const ca = Math.cos(a), sa = Math.sin(a);
    const x = c.cx * ca - c.cy * sa;
    const y = c.cx * sa + c.cy * ca;
    return (Math.abs(x) < 0.02 || Math.abs(y) < 0.02) ? 1 : 0.05;
  } },
  { name: "Checkerboard Flip", category: "Geometric Scanners", fn: (c, m) => {
    const x = Math.floor(c.nx * (8 + m * 2)), y = Math.floor(c.ny * (8 + m * 2));
    const flip = Math.floor(c.t * (1 + m * 0.3)) % 2;
    return ((x + y + flip) % 2 === 0) ? 1 : 0.1;
  } },
  { name: "Diagonal Barberpole", category: "Geometric Scanners", fn: (c, m) => {
    const u = c.nx, v = c.ny, t = c.t;
    return fract((u + v) * (6 + m) - t * (1.5 + m * 0.3)) > 0.5 ? 1 : 0.1;
  } },
  { name: "DNA Double Helix", category: "Geometric Scanners", fn: (c, m) => {
    const u = c.nx, v = c.ny, t = c.t;
    const strand1 = 0.5 + 0.3 * Math.sin(v * (8 + m * 2) + t * (1.5 + m * 0.3));
    const strand2 = 0.5 - 0.3 * Math.sin(v * (8 + m * 2) + t * (1.5 + m * 0.3));
    const d1 = Math.abs(u - strand1), d2 = Math.abs(u - strand2);
    return Math.max(0, 1 - Math.min(d1, d2) * 15);
  } },
  { name: "Equalizer Spectrum Bars", category: "Geometric Scanners", fn: (c, m) => {
    const u = c.nx, v = c.ny, t = c.t;
    const bar = Math.floor(u * (8 + m * 2));
    const h = 0.3 + 0.6 * Math.abs(Math.sin(bar * 0.7 + t * (2 + m * 0.3)));
    return v > 1 - h ? 1 : 0.05;
  } },
];

// Expand each kernel into 4 variants
export const MATH_EFFECTS: MathEffect[] = [];
for (const k of kernels) {
  for (let m = 0; m < 4; m++) {
    MATH_EFFECTS.push({
      id: `math:${k.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-v${m + 1}`,
      name: `${k.name} ${m + 1}`,
      category: k.category,
      description: `${k.name} variant ${m + 1}`,
      fn: (c) => k.fn(c, m),
    });
  }
}

// Custom formula sandbox entry
MATH_EFFECTS.push({
  id: "custom",
  name: "Custom Formula",
  category: "Custom Formula",
  description: "Live math expression evaluator",
  fn: (c) => {
    // delegate to sampleShader? handled separately; here just 0
    return 0;
  },
});

export function getMathEffect(id: string): MathEffect | undefined {
  return MATH_EFFECTS.find((e) => e.id === id);
}

export function sampleMathEffect(id: string, c: ShaderContext): number {
  const e = getMathEffect(id);
  if (!e) return 0;
  if (id === "custom") return 0; // handled by sampleShader
  const v = e.fn(c);
  return v > 0 ? (v > 1 ? 1 : v) : 0;
}
