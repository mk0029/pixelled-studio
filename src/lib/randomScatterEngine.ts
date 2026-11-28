import { hexToRgb, hslToRgb } from "../engine/mathShaders";

export type ScatterMovement =
  | 'twinkle-static' // Random LEDs blink/fade in place
  | 'float-random'   // Organic multi-directional drift with wall bounce
  | 'fall-down'      // Top-to-bottom rain/snow
  | 'rise-up'        // Bottom-to-top embers/sparks
  | 'sweep-left'     // Right-to-left drift
  | 'sweep-right';   // Left-to-right drift

export type ScatterColorMode =
  | 'solid'          // Single pure LED color
  | 'palette'        // Cycles/picks from 2-4 custom colors matched to this animation
  | 'high-contrast'  // Pure White, Red, Gold, Cyan, Green
  | 'rainbow';       // Full spectrum per particle

export interface RandomScatterConfig {
  enabled: boolean;
  count: number;              // 10 to totalLeds (auto-default ~19% of totalLeds)
  autoCount: boolean;         // Auto-scales to ~19% when matrix size changes
  colorMode: ScatterColorMode;
  primaryColor: string;       // Default '#FFFFFF'
  paletteColors: string[];    // e.g. ['#FFFFFF', '#FF0000', '#FFD700']
  speed: number;              // 0 to 100
  movement: ScatterMovement;
  blinkStyle: 'crisp-flash' | 'smooth-pulse' | 'always-on';
  pixelOverwrite: boolean;    // true = 'source-over' (pure exact color), false = 'lighter' (additive glow)
  showTail?: boolean;         // Moving modes only: echo previous frames behind each particle
  tailLength?: number;        // Trail length in matrix pixels (2–50, capped by height)
  blankAreaOnly?: boolean;    // Skip lit pixels so scatter fills the space around the animation
  blankPadding?: number;      // Clear halo around the animation, in LED pixels
  seed: number;
}

export function getRecommendedScatterCount(width: number, height: number): number {
  const totalLeds = Math.max(1, width * height);
  if (totalLeds <= 10) return totalLeds;
  return Math.max(10, Math.min(totalLeds, Math.round(totalLeds * 0.19)));
}

export function createDefaultScatterConfig(width: number, height: number): RandomScatterConfig {
  return {
    enabled: false,
    count: getRecommendedScatterCount(width, height),
    autoCount: true,
    colorMode: 'solid',
    primaryColor: '#FFFFFF',
    paletteColors: ['#FFFFFF', '#FF0000', '#FFD700'],
    speed: 45,
    movement: 'twinkle-static',
    blinkStyle: 'crisp-flash',
    pixelOverwrite: true,
    showTail: false,
    tailLength: Math.max(2, Math.min(50, Math.round(height * 0.15))),
    blankAreaOnly: false,
    blankPadding: 2,
    seed: 101,
  };
}

// Deterministic seeded PRNG (Mulberry32) so preview and AVI export match frame-for-frame
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HIGH_CONTRAST_COLORS = ['#FFFFFF', '#FF0000', '#00FF00', '#FFD700', '#00FFFF', '#FF00FF'];

interface ScatterPixel {
  x: number;
  y: number;
  rgb: [number, number, number];
  alpha: number;
}

/** One deterministic frame of scatter pixels, shared by canvas and LED-buffer renderers. */
function scatterPixels(width: number, height: number, frameIndex: number, fps: number,
  config: RandomScatterConfig): ScatterPixel[] {
  const totalLeds = width * height;
  const activeCount = Math.max(1, Math.min(totalLeds, config.count));
  const pixels: ScatterPixel[] = [];
  // Tail length is in matrix pixels, capped by height; convert it to frames at this speed/fps.
  const tailLength = Math.max(1, Math.min(height, config.tailLength ?? Math.max(2, Math.min(50, height))));
  const pxPerFrame = Math.max(0.01, (config.speed / 25) * 8 / Math.max(1, fps));
  const tail = config.showTail && config.speed > 0 && config.movement !== 'twinkle-static'
    ? Math.max(1, Math.min(50, Math.round(tailLength / pxPerFrame))) : 0;

  for (let k = tail; k >= 0; k--) {
    const frame = frameIndex - k;
    const rand = mulberry32(config.seed);
    const t = (frame / Math.max(1, fps)) * (config.speed / 25);
    const alphaScale = k === 0 ? 1 : 1 - k / (tail + 1);

    for (let i = 0; i < activeCount; i++) {
      const baseX = rand() * width;
      const baseY = rand() * height;
      const vx = (rand() - 0.5) * 2;
      const vy = (rand() - 0.5) * 2;
      const speedFactor = 0.6 + rand() * 0.8;
      const phase = rand() * Math.PI * 2;
      const colorPick = rand();

      let x = baseX;
      let y = baseY;
      const dist = t * speedFactor * 8;

      switch (config.movement) {
        case 'twinkle-static': {
          // Hop to a new deterministic LED coordinate each blink cycle
          const cycle = Math.floor(t * speedFactor * 1.5 + phase);
          const hopRand = mulberry32(config.seed + i * 997 + cycle * 131);
          x = hopRand() * width;
          y = hopRand() * height;
          break;
        }
        case 'float-random':
          x = bounce(baseX + vx * dist, width - 1);
          y = bounce(baseY + vy * dist, height - 1);
          break;
        case 'fall-down':
          y = (((baseY + dist) % height) + height) % height;
          break;
        case 'rise-up':
          y = (((baseY - dist) % height) + height) % height;
          break;
        case 'sweep-right':
          x = (((baseX + dist) % width) + width) % width;
          break;
        case 'sweep-left':
          x = (((baseX - dist) % width) + width) % width;
          break;
      }

      let alpha = 1;
      if (config.blinkStyle === 'crisp-flash') {
        const wave = Math.sin(t * speedFactor * 4 + phase);
        if (wave < -0.15) continue; // Crisp off state
      } else if (config.blinkStyle === 'smooth-pulse') {
        alpha = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(t * speedFactor * 3 + phase));
      }

      let rgb: [number, number, number] = hexToRgb(config.primaryColor);
      if (config.colorMode === 'palette' && config.paletteColors.length > 0) {
        const colors = config.paletteColors;
        rgb = hexToRgb(colors[Math.min(colors.length - 1, Math.floor(colorPick * colors.length))]);
      } else if (config.colorMode === 'high-contrast') {
        rgb = hexToRgb(HIGH_CONTRAST_COLORS[Math.min(HIGH_CONTRAST_COLORS.length - 1,
          Math.floor(colorPick * HIGH_CONTRAST_COLORS.length))]);
      } else if (config.colorMode === 'rainbow') {
        const hue = Math.floor((colorPick * 360 + frame * 2) % 360);
        rgb = hslToRgb(hue, 1, 0.5);
      }

      pixels.push({ x: Math.floor(x), y: Math.floor(y), rgb, alpha: alpha * alphaScale });
    }
  }
  return pixels;
}

/** 1 = blocked LED: pixels changed by this layer, dilated by the padding halo. */
export function buildScatterBlankMask(
  before: Uint8ClampedArray,
  after: Uint8ClampedArray,
  cols: number,
  rows: number,
  padding = 2
): Uint8Array {
  const mask = new Uint8Array(cols * rows);
  const pad = Math.max(0, Math.min(32, Math.round(padding)));
  for (let i = 0; i < mask.length; i++) {
    const p = i * 3;
    if (before[p] === after[p] && before[p + 1] === after[p + 1] && before[p + 2] === after[p + 2]) continue;
    const x = i % cols, y = Math.floor(i / cols);
    for (let dy = -pad; dy <= pad; dy++) {
      const yy = y + dy;
      if (yy < 0 || yy >= rows) continue;
      for (let dx = -pad; dx <= pad; dx++) {
        const xx = x + dx;
        if (xx >= 0 && xx < cols) mask[yy * cols + xx] = 1;
      }
    }
  }
  return mask;
}

export function renderRandomScatter(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  frameIndex: number,
  fps: number,
  config: RandomScatterConfig,
  mask?: Uint8Array
): void {
  if (!config.enabled || width <= 0 || height <= 0) return;

  ctx.save();
  ctx.globalCompositeOperation = config.pixelOverwrite ? 'source-over' : 'lighter';
  for (const px of scatterPixels(width, height, frameIndex, fps, config)) {
    if (mask && mask[px.y * width + px.x]) continue;
    const [r, g, b] = px.rgb;
    ctx.globalAlpha = px.alpha;
    ctx.fillStyle = `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
    ctx.fillRect(px.x, px.y, 1, 1);
  }
  ctx.restore();
}

/** Same pixels written straight into the compositor's RGB buffer (preview and AVI). */
export function renderRandomScatterBuffer(
  out: Uint8ClampedArray,
  cols: number,
  rows: number,
  frameIndex: number,
  fps: number,
  config: RandomScatterConfig,
  mask?: Uint8Array
): void {
  if (!config.enabled || cols <= 0 || rows <= 0) return;
  for (const px of scatterPixels(cols, rows, frameIndex, fps, config)) {
    if (px.x < 0 || px.y < 0 || px.x >= cols || px.y >= rows) continue;
    if (mask && mask[px.y * cols + px.x]) continue;
    const i = (px.y * cols + px.x) * 3;
    const [r, g, b] = px.rgb;
    if (config.pixelOverwrite) {
      out[i] = out[i] * (1 - px.alpha) + r * px.alpha;
      out[i + 1] = out[i + 1] * (1 - px.alpha) + g * px.alpha;
      out[i + 2] = out[i + 2] * (1 - px.alpha) + b * px.alpha;
    } else {
      out[i] += r * px.alpha;
      out[i + 1] += g * px.alpha;
      out[i + 2] += b * px.alpha;
    }
  }
}

function bounce(val: number, max: number): number {
  if (max <= 0) return 0;
  const period = max * 2;
  const mod = ((val % period) + period) % period;
  return mod <= max ? mod : period - mod;
}
