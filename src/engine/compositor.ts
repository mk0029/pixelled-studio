import { hexToRgb, hslToRgb, polarCoords, rotateUV, sampleShader, type ShaderContext } from "./mathShaders";
import { renderTextLayer } from "./textRenderer";
import { renderCharacterVideoLayer, renderSpriteLayer } from "./effects/characterSprites";
import { renderEmojiCharacterLayerRGBA } from "@/lib/spriteCharacterEngine";
import { renderDotsLinesLayer } from "./effects/dotsLines";
import { sampleMedia } from "./mediaRenderer";
import { sampleMathEffect, getMathEffect } from "./mathCatalog";
import { audioStore } from "./audio";
import { applySparkleOverlay } from "./sparkleOverlay";
import { buildScatterBlankMask, getRecommendedScatterCount, renderRandomScatterBuffer } from "@/lib/randomScatterEngine";
import type { BlendMode, Layer, Project } from "@/types/project";

const clamp255 = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

function transitionMask(effect: string, p: number, x: number, y: number, cols: number, rows: number): number {
  if (!effect || effect === "none") return 1;
  if (effect === "fade") return p;
  const nx = cols > 1 ? x / (cols - 1) : 0.5;
  const ny = rows > 1 ? y / (rows - 1) : 0.5;
  const cx = nx - 0.5;
  const cy = ny - 0.5;
  const r = Math.hypot(cx, cy);
  switch (effect) {
    case "wipe-lr": return nx <= p ? 1 : 0;
    case "wipe-rl": return 1 - nx <= p ? 1 : 0;
    case "wipe-tb": return ny <= p ? 1 : 0;
    case "wipe-bt": return 1 - ny <= p ? 1 : 0;
    case "iris": return r <= p * 0.75 ? 1 : 0;
    case "curtain": return Math.abs(cx) <= p * 0.5 ? 1 : 0;
    case "sparkle": return (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453 % 1) <= p ? 1 : 0;
    case "strobe": return p > 0.5 ? 1 : 0;
    default: return p;
  }
}

function transitionAlpha(layer: any, elapsed: number, duration: number, x: number, y: number, cols: number, rows: number): number {
  let alpha = 1;
  const fadeIn = layer.fadeIn ?? 0;
  const fadeOut = layer.fadeOut ?? 0;
  const inEffect = layer.fadeInEffect ?? "fade";
  const outEffect = layer.fadeOutEffect ?? "fade";
  if (fadeIn > 0 && elapsed < fadeIn) {
    const progress = clamp01(elapsed / fadeIn);
    alpha *= transitionMask(inEffect, progress, x, y, cols, rows);
  }
  const outStart = duration - fadeOut;
  if (fadeOut > 0 && elapsed > outStart) {
    const progress = clamp01((duration - elapsed) / fadeOut);
    alpha *= transitionMask(outEffect, progress, x, y, cols, rows);
  }
  return alpha;
}
const fract = (v: number) => v - Math.floor(v);

/** Effective Direction / Angle at time t: fixed unless the layer animates rotation. */
function animatedAngle(layer: Layer, time: number): number {
  if (!layer.rotate) return layer.angle;
  const range = Math.max(1, layer.rotateRange ?? 360);
  const speed = layer.rotateSpeed ?? 60; // degrees per second; negative reverses
  const phase = time * speed;
  if (layer.rotateBounce) {
    const period = 2 * range;
    const p = ((phase % period) + period) % period;
    return layer.angle + (p <= range ? p : period - p); // triangle wave, continuous
  }
  const offset = ((phase % range) + range) % range; // wrap through all angles
  return layer.angle + offset;
}

function blendChannel(dst: number, src: number, mode: BlendMode): number {
  const a = dst / 255;
  const b = src / 255;
  switch (mode) {
    case "add":
    case "lighter": return dst + src;
    case "multiply": return dst * b;
    case "screen": return 255 - (255 - dst) * (1 - b);
    case "overlay": return 255 * (a < 0.5 ? 2 * a * b : 1 - 2 * (1 - a) * (1 - b));
    case "difference": return Math.abs(dst - src);
    case "max": return Math.max(dst, src);
    default: return src;
  }
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const delta = max - min;
  if (!delta) return [0, 0, l];
  const s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  const h = max === r ? ((g - b) / delta + (g < b ? 6 : 0))
    : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  return [h * 60, s, l];
}

function keyframeValue(layer: Layer, t: number, param: "brightness" | "speed" | "hue"): number | null {
  const keys = layer.keyframes.filter((k) => k.param === param).sort((a, b) => a.t - b.t);
  if (!keys.length) return null;
  if (t <= keys[0].t) return keys[0].value;
  if (t >= keys[keys.length - 1].t) return keys[keys.length - 1].value;
  for (let i = 0; i < keys.length - 1; i++) {
    if (t >= keys[i].t && t <= keys[i + 1].t) {
      const f = (t - keys[i].t) / Math.max(0.0001, keys[i + 1].t - keys[i].t);
      return keys[i].value + (keys[i + 1].value - keys[i].value) * f;
    }
  }
  return null;
}

function layerColor(layer: Layer, u: number, v: number, intensity: number, hueShift: number): [number, number, number] {
  if (layer.rainbow) return hslToRgb(u * 360 + hueShift, layer.saturation / 100, 0.55);
  let rgb: [number, number, number];
  const stops = layer.gradient.filter(Boolean);
  if (stops.length >= 2) {
    const pos = clamp01(intensity * 0.85 + v * 0.15) * (stops.length - 1);
    const i = Math.min(stops.length - 2, Math.floor(pos));
    const f = pos - i;
    const a = hexToRgb(stops[i]);
    const b = hexToRgb(stops[i + 1]);
    rgb = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
  } else {
    rgb = hexToRgb(layer.color);
  }
  if (!hueShift && layer.saturation === 100) return rgb;
  const [h, s, l] = rgbToHsl(rgb[0], rgb[1], rgb[2]);
  return hslToRgb(h + hueShift, clamp01(s * layer.saturation / 100), l);
}

function dotsTiming(layer: Layer, time: number, anySolo: boolean) {
  if (!layer.enabled || layer.mute || (anySolo && !layer.solo)) return null;
  if (time < layer.startTime) return null;
  if (layer.loop === false && time > layer.startTime + layer.duration) return null;
  if (layer.strobeHz > 0 && fract(time * layer.strobeHz) >= 0.5) return null;
  const rawElapsed = time - layer.startTime;
  const elapsed = layer.loop !== false ? rawElapsed % Math.max(0.1, layer.duration) : rawElapsed;
  const fadeIn = layer.fadeIn > 0 ? clamp01(elapsed / layer.fadeIn) : 1;
  const fadeOut = (!layer.loop && layer.fadeOut > 0)
    ? clamp01((layer.duration - elapsed) / layer.fadeOut) : 1;
  const envelope = fadeIn * fadeOut;
  if (envelope <= 0) return null;
  const speed = Math.max(0.2, layer.speed + (keyframeValue(layer, time, "speed") ?? 0));
  const audioGain = layer.audioReactive ? 0.25 + audioStore.level * 1.5 : 1;
  const gain = (layer.brightness / 100) * envelope * (keyframeValue(layer, time, "brightness") ?? 1)
    * audioGain * ((layer.opacity ?? 100) / 100);
  return { localT: elapsed * speed, gain };
}

function drawDotsLayer(out: Uint8ClampedArray, layer: Layer, cols: number, rows: number,
  localT: number, gain: number, fps: number): void {
  const buf = renderDotsLinesLayer(layer, cols, rows, localT, fps);
  for (let i = 0; i < cols * rows; i++) {
    const p = i * 3, q = i * 4;
    const a = (buf[q + 3] / 255) * gain;
    if (a <= 0) continue;
    const srcR = buf[q] * a, srcG = buf[q + 1] * a, srcB = buf[q + 2] * a;
    if (layer.blend === "add") {
      out[p] = clamp255(out[p] + srcR);
      out[p + 1] = clamp255(out[p + 1] + srcG);
      out[p + 2] = clamp255(out[p + 2] + srcB);
    } else if (layer.blend === "behind" || layer.blend === "normal") {
      const inv = 1 - a;
      out[p] = clamp255(out[p] * inv + srcR);
      out[p + 1] = clamp255(out[p + 1] * inv + srcG);
      out[p + 2] = clamp255(out[p + 2] * inv + srcB);
    } else {
      out[p] = clamp255(blendChannel(out[p], srcR, layer.blend));
      out[p + 1] = clamp255(blendChannel(out[p + 1], srcG, layer.blend));
      out[p + 2] = clamp255(blendChannel(out[p + 2], srcB, layer.blend));
    }
  }
}

/** Scatter belongs to one layer only, and uses the same frame index as AVI export. */
function drawScatter(out: Uint8ClampedArray, layer: Layer, cols: number, rows: number, time: number, fps: number,
  before?: Uint8ClampedArray | null): void {
  const config = layer.scatter;
  if (!config?.enabled) return;
  const fpsValue = Math.max(1, fps);
  const frame = Math.round(time * fpsValue);
  const mask = config.blankAreaOnly && before
    ? buildScatterBlankMask(before, out, cols, rows, config.blankPadding ?? 2)
    : undefined;
  renderRandomScatterBuffer(out, cols, rows, frame, fpsValue,
    config.autoCount ? { ...config, count: getRecommendedScatterCount(cols, rows) } : config, mask);
}

/**
 * Composites every active layer at `time` into a frame buffer in grid order
 * (index = y * cols + x). Exporters write it in the same order.
 */
export function renderFrame(project: Project, time: number, audioLevel = audioStore.level): Uint8ClampedArray {
  const { cols, rows } = project.hardware;
  const out = new Uint8ClampedArray(cols * rows * 3);
  const anySolo = project.layers.some((l) => l.solo && l.enabled && !l.mute);

  // "Behind Content" dots render first, independent of their position in the stack.
  for (const layer of project.layers) {
    if (layer.effect !== "dots-lines" || layer.blend !== "behind") continue;
    const timing = dotsTiming(layer, time, anySolo);
    if (timing) {
      const scatterBefore = layer.scatter?.blankAreaOnly ? out.slice() : null;
      drawDotsLayer(out, layer, cols, rows, timing.localT, timing.gain, project.fps);
      drawScatter(out, layer, cols, rows, time, project.fps, scatterBefore);
    }
  }

  for (const layer of project.layers) {
    if (!layer.enabled || layer.mute || (anySolo && !layer.solo)) continue;
    if (layer.effect === "dots-lines" && layer.blend === "behind") continue;
    const loop = layer.loop !== false;
    if (time < layer.startTime) continue;
    if (!loop && time > layer.startTime + layer.duration) continue;
    if (layer.strobeHz > 0 && fract(time * layer.strobeHz) >= 0.5) continue;
    const rawElapsed = time - layer.startTime;
    const elapsed = loop ? rawElapsed % Math.max(0.1, layer.duration) : rawElapsed;
    const fadeIn = layer.fadeIn > 0 ? clamp01(elapsed / layer.fadeIn) : 1;
    const fadeOut = (!loop && layer.fadeOut > 0)
      ? clamp01((layer.duration - elapsed) / layer.fadeOut) : 1;
    const envelope = fadeIn * fadeOut;
    if (envelope <= 0) continue;
    const scatterBefore = layer.scatter?.blankAreaOnly ? out.slice() : null;

    const kb = keyframeValue(layer, time, "brightness");
    const ks = keyframeValue(layer, time, "speed");
    const kh = keyframeValue(layer, time, "hue");
    const rawSpeed = layer.speed + (ks ?? 0);
    const speed = Math.max(0.2, rawSpeed);
    const localT = elapsed * speed;
    const angle = animatedAngle(layer, time);
    // Audio-reactive preview gain; exporters pass 0.5 for a neutral, deterministic frame.
    const audioGain = layer.audioReactive ? 0.25 + audioLevel * 1.5 : 1;
    const opacity = (layer.opacity ?? 100) / 100;
    const gain = (layer.brightness / 100) * envelope * (kb ?? 1) * audioGain * opacity;
    const hueShift = layer.hueShift + (kh ?? 0);

    if (layer.effect === "media" || layer.effect === "character-video") {
      const isEmoji = layer.effect === "character-video" && layer.characterSourceType === "emoji" && layer.emojiCharacter;
      const px = layer.effect === "character-video" && !layer.mediaSrc
        ? (isEmoji
            ? renderEmojiCharacterLayerRGBA(cols, rows, Math.round(Math.max(0, localT) * project.fps), project.fps, layer.emojiCharacter!)
            : renderCharacterVideoLayer(layer, cols, rows, localT, project.fps))
        : sampleMedia(layer, cols, rows, localT);
      if (!px) continue;
      const hueShift = (layer.hueShift || 0) / 360;
      const satMul = (layer.saturation ?? 100) / 100;
      const recolor = hueShift !== 0 || satMul !== 1;
      const emojiContrast = isEmoji ? (layer.mediaContrast ?? 100) / 100 : 1;
      const emojiSilhouette = isEmoji && layer.mediaSilhouette === true;
      const emojiThreshold = Math.max(0, Math.min(255, layer.mediaThreshold ?? 0));
      for (let i = 0; i < cols * rows; i++) {
        const p = i * 3, q = i * 4;
        let srcR = px[q], srcG = px[q + 1], srcB = px[q + 2];
        if (isEmoji && emojiContrast !== 1) {
          srcR = (srcR - 128) * emojiContrast + 128;
          srcG = (srcG - 128) * emojiContrast + 128;
          srcB = (srcB - 128) * emojiContrast + 128;
          srcR = Math.max(0, Math.min(255, srcR));
          srcG = Math.max(0, Math.min(255, srcG));
          srcB = Math.max(0, Math.min(255, srcB));
        }
        if (emojiSilhouette) {
          const lum = 0.299 * srcR + 0.587 * srcG + 0.114 * srcB;
          const v = lum >= emojiThreshold ? 255 * ((layer.brightness ?? 100) / 100) : 0;
          srcR = srcG = srcB = v;
        }
        if (recolor) {
          const [h, s, l] = rgbToHsl(srcR, srcG, srcB);
          const [r, g, b] = hslToRgb((h + hueShift) % 1, Math.max(0, Math.min(1, s * satMul)), l);
          srcR = r; srcG = g; srcB = b;
        }
        const a = (px[q + 3] / 255) * gain;
        if (a <= 0) continue;
        const rV = srcR * a, gV = srcG * a, bV = srcB * a;
        if (layer.blend === "normal") {
          const inv = 1 - a;
          out[p] = clamp255(out[p] * inv + rV);
          out[p + 1] = clamp255(out[p + 1] * inv + gV);
          out[p + 2] = clamp255(out[p + 2] * inv + bV);
        } else {
          out[p] = clamp255(blendChannel(out[p], rV, layer.blend));
          out[p + 1] = clamp255(blendChannel(out[p + 1], gV, layer.blend));
          out[p + 2] = clamp255(blendChannel(out[p + 2], bV, layer.blend));
        }
      }
      drawScatter(out, layer, cols, rows, time, project.fps, scatterBefore);
      continue;
    }

    const textBuf = layer.effect === "text" ? renderTextLayer(layer, cols, rows, localT, project.fps) : null;
    if (layer.effect === "text") {
      if (!textBuf) continue;
      for (let i = 0; i < cols * rows; i++) {
        const p = i * 3, q = i * 4;
        const a = (textBuf[q + 3] / 255) * gain;
        if (a <= 0) continue;
        const srcR = textBuf[q] * a, srcG = textBuf[q + 1] * a, srcB = textBuf[q + 2] * a;
        if (layer.blend === "normal" || layer.blend === "add") {
          if (layer.blend === "add") {
            out[p] = clamp255(out[p] + srcR);
            out[p + 1] = clamp255(out[p + 1] + srcG);
            out[p + 2] = clamp255(out[p + 2] + srcB);
          } else {
            const inv = 1 - a;
            out[p] = clamp255(out[p] * inv + srcR);
            out[p + 1] = clamp255(out[p + 1] * inv + srcG);
            out[p + 2] = clamp255(out[p + 2] * inv + srcB);
          }
        } else {
          out[p] = clamp255(blendChannel(out[p], srcR, layer.blend));
          out[p + 1] = clamp255(blendChannel(out[p + 1], srcG, layer.blend));
          out[p + 2] = clamp255(blendChannel(out[p + 2], srcB, layer.blend));
        }
      }
      drawScatter(out, layer, cols, rows, time, project.fps, scatterBefore);
      continue;
    }
    const trails = clamp01(layer.trails);

    if (layer.effect === "sprites") {
      const spriteBuf = renderSpriteLayer(layer.spriteType || "heart", cols, rows, localT, layer.spriteCount ?? 1, layer.spriteScale ?? 1, layer.spriteSpeed ?? 1, layer.spriteDirection ?? "right");
      if (!spriteBuf) continue;
      for (let i = 0; i < cols * rows; i++) {
        const p = i * 3, q = i * 4;
        const a = (spriteBuf[q + 3] / 255) * gain;
        if (a <= 0) continue;
        const srcR = spriteBuf[q] * a, srcG = spriteBuf[q + 1] * a, srcB = spriteBuf[q + 2] * a;
        if (layer.blend === "normal" || layer.blend === "add") {
          if (layer.blend === "add") {
            out[p] = clamp255(out[p] + srcR);
            out[p + 1] = clamp255(out[p + 1] + srcG);
            out[p + 2] = clamp255(out[p + 2] + srcB);
          } else {
            const inv = 1 - a;
            out[p] = clamp255(out[p] * inv + srcR);
            out[p + 1] = clamp255(out[p + 1] * inv + srcG);
            out[p + 2] = clamp255(out[p + 2] * inv + srcB);
          }
        } else {
          out[p] = clamp255(blendChannel(out[p], srcR, layer.blend));
          out[p + 1] = clamp255(blendChannel(out[p + 1], srcG, layer.blend));
          out[p + 2] = clamp255(blendChannel(out[p + 2], srcB, layer.blend));
        }
      }
      drawScatter(out, layer, cols, rows, time, project.fps, scatterBefore);
      continue;
    }

    if (layer.effect === "dots-lines") {
      drawDotsLayer(out, layer, cols, rows, localT, gain, project.fps);
      drawScatter(out, layer, cols, rows, time, project.fps, scatterBefore);
      continue;
    }

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        let sx = x, sy = y;
        if (layer.symmetry === "horizontal") sx = cols - 1 - x;
        else if (layer.symmetry === "vertical") sy = rows - 1 - y;
        else if (layer.symmetry === "quad") { sx = cols - 1 - x; sy = rows - 1 - y; }

        const nx = cols > 1 ? sx / (cols - 1) : 0.5;
        const ny = rows > 1 ? sy / (rows - 1) : 0.5;
        const [ru, rv] = rotateUV(nx, ny, angle);
        const effectiveT = (layer.direction === "reverse" || layer.direction === "left" || layer.direction === "up" || layer.direction === "in" || layer.direction === "ccw") ? -localT : localT;
        const { aspect, cx, cy, r } = polarCoords(ru, rv, cols, rows);
        const ctx: ShaderContext = {
          x: sx, y: sy, nx: ru, ny: rv, t: effectiveT, w: cols, h: rows, aspect, cx, cy, r,
          i: y * cols + x,
          density: layer.scale ?? layer.density,
          angle: 0,
          direction: layer.direction ?? "normal",
          sparkleDensity: layer.sparkleDensity ?? 6, sparkleRate: layer.sparkleRate ?? 9,
          expression: layer.expression,
        };
        let intensity: number;
        if (layer.effect === "custom") intensity = sampleShader(layer.effect, ctx);
        else if (getMathEffect(layer.effect)) intensity = sampleMathEffect(layer.effect, ctx);
        else intensity = sampleShader(layer.effect, ctx);
        // Trails: echo the generator backwards in time, no frame buffer needed.
        if (trails > 0 && !textBuf) {
          for (let k = 1; k <= 4; k++) {
            const pastCtx = { ...ctx, t: localT - k * 0.07, angle: animatedAngle(layer, time - k * 0.07) };
            const past = getMathEffect(layer.effect)
              ? sampleMathEffect(layer.effect, pastCtx)
              : sampleShader(layer.effect, pastCtx);
            intensity = Math.max(intensity, past * Math.pow(trails, k));
          }
        }
        if (intensity <= 0) continue;
        const value = intensity * gain * transitionAlpha(layer, elapsed, layer.duration, x, y, cols, rows);
        const [cr, cg, cb] = layerColor(layer, ru, rv, intensity, hueShift);
        const p = (y * cols + x) * 3;
        out[p] = clamp255(blendChannel(out[p], cr * value, layer.blend));
        out[p + 1] = clamp255(blendChannel(out[p + 1], cg * value, layer.blend));
        out[p + 2] = clamp255(blendChannel(out[p + 2], cb * value, layer.blend));
      }
    }
    drawScatter(out, layer, cols, rows, time, project.fps, scatterBefore);
  }

  const master = project.masterBrightness / 100;
  const invGamma = 1 / Math.max(0.1, project.gamma);
  for (let i = 0; i < out.length; i++) {
    out[i] = Math.pow(out[i] / 255, invGamma) * 255 * master;
  }
  applySparkleOverlay(out, cols, rows, time, project);
  return out;
}
