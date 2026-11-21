import { hexToRgb, hslToRgb, polarCoords, rotateUV, sampleShader, type ShaderContext } from "./mathShaders";
import { renderTextLayer } from "./textRenderer";
import { sampleMedia } from "./mediaRenderer";
import { sampleMathEffect, getMathEffect } from "./mathCatalog";
import { audioStore } from "./audio";
import type { WiringMap } from "./wiringMapper";
import type { BlendMode, Layer, Project } from "@/types/project";

const clamp255 = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
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
    case "add": return dst + src;
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

/**
 * Composites every active layer at `time` into a frame buffer in grid order
 * (index = y * cols + x). Exporters reorder it through the wiring map.
 */
export function renderFrame(project: Project, time: number, map?: WiringMap, audioLevel = audioStore.level): Uint8ClampedArray {
  const { cols, rows } = project.hardware;
  const out = new Uint8ClampedArray(cols * rows * 3);
  const anySolo = project.layers.some((l) => l.solo && l.enabled && !l.mute);
  const wiredIndex = map?.pixels;

  for (const layer of project.layers) {
    if (!layer.enabled || layer.mute || (anySolo && !layer.solo)) continue;
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

    const kb = keyframeValue(layer, time, "brightness");
    const ks = keyframeValue(layer, time, "speed");
    const kh = keyframeValue(layer, time, "hue");
    const rawSpeed = layer.speed + (ks ?? 0);
    const speed = Math.max(0.2, rawSpeed);
    const localT = elapsed * speed;
    const angle = animatedAngle(layer, time);
    // Audio-reactive preview gain; exporters pass 0.5 for a neutral, deterministic frame.
    const audioGain = layer.audioReactive ? 0.25 + audioLevel * 1.5 : 1;
    const gain = (layer.brightness / 100) * envelope * (kb ?? 1) * audioGain;
    const hueShift = layer.hueShift + (kh ?? 0);

    if (layer.effect === "media") {
      const px = sampleMedia(layer, cols, rows, localT);
      if (!px) continue;
      const hueShift = (layer.hueShift || 0) / 360;
      const satMul = (layer.saturation ?? 100) / 100;
      const recolor = hueShift !== 0 || satMul !== 1;
      for (let i = 0; i < cols * rows; i++) {
        const p = i * 3, q = i * 4;
        let srcR = px[q], srcG = px[q + 1], srcB = px[q + 2];
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
      continue;
    }

    const textBuf = layer.effect === "text" ? renderTextLayer(layer, cols, rows, localT) : null;
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
      continue;
    }
    const trails = clamp01(layer.trails);

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        let sx = x, sy = y;
        if (layer.symmetry === "horizontal") sx = cols - 1 - x;
        else if (layer.symmetry === "vertical") sy = rows - 1 - y;
        else if (layer.symmetry === "quad") { sx = cols - 1 - x; sy = rows - 1 - y; }

        const nx = cols > 1 ? sx / (cols - 1) : 0.5;
        const ny = rows > 1 ? sy / (rows - 1) : 0.5;
        const [ru, rv] = rotateUV(nx, ny, angle);
        const { aspect, cx, cy, r } = polarCoords(nx, ny, cols, rows);
        const ctx: ShaderContext = {
          x: sx, y: sy, nx, ny, t: localT, w: cols, h: rows, aspect, cx, cy, r,
          i: wiredIndex ? wiredIndex[y * cols + x].index : y * cols + x,
          density: layer.density, angle,
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
        const value = intensity * gain;
        const [cr, cg, cb] = layerColor(layer, ru, rv, intensity, hueShift);
        const p = (y * cols + x) * 3;
        out[p] = clamp255(blendChannel(out[p], cr * value, layer.blend));
        out[p + 1] = clamp255(blendChannel(out[p + 1], cg * value, layer.blend));
        out[p + 2] = clamp255(blendChannel(out[p + 2], cb * value, layer.blend));
      }
    }
  }

  // Per-line animations own their pixels: clear their ranges first so no other
  // layer colour bleeds through, then add their own generators on top.
  const lineAnimations = (project.lineAnimations ?? []).filter((l) => l.enabled);
  if (lineAnimations.length) {
    const range = (line: (typeof lineAnimations)[number]) => {
      const count = line.axis === "column" ? cols : rows;
      const from = Math.max(0, Math.min(count - 1, Math.round(line.from) - 1));
      return [from, Math.max(from, Math.min(count - 1, Math.round(line.to) - 1))] as const;
    };
    for (const line of lineAnimations) {
      const [from, to] = range(line);
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const li = line.axis === "column" ? x : y;
          if (li < from || li > to) continue;
          const p = (y * cols + x) * 3;
          out[p] = out[p + 1] = out[p + 2] = 0;
        }
      }
    }
    for (const line of lineAnimations) {
      const [from, to] = range(line);
      const [r0, g0, b0] = hexToRgb(line.color);
      const gain = Math.max(0, line.brightness) / 100;
      const span = to - from + 1;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const li = line.axis === "column" ? x : y;
          if (li < from || li > to) continue;
          // Animate inside the assigned line group, not across the whole matrix.
          const nx = line.axis === "column" ? (li - from + 0.5) / span : (cols > 1 ? x / (cols - 1) : 0.5);
          const ny = line.axis === "row" ? (li - from + 0.5) / span : (rows > 1 ? y / (rows - 1) : 0.5);
          const lineW = line.axis === "column" ? span : cols;
          const lineH = line.axis === "row" ? span : rows;
          const { aspect, cx, cy, r } = polarCoords(nx, ny, lineW, lineH);
          const intensity = sampleShader(line.effect, {
            x: line.axis === "column" ? li - from : x,
            y: line.axis === "row" ? li - from : y,
            nx, ny, t: time * line.speed,
            w: lineW, h: lineH, aspect, cx, cy, r,
            i: wiredIndex ? wiredIndex[y * cols + x].index : y * cols + x,
            density: line.density, angle: line.angle,
            sparkleDensity: line.sparkleDensity ?? 6, sparkleRate: line.sparkleRate ?? 9,
          });
          if (intensity <= 0) continue;
          const v = intensity * gain;
          const p = (y * cols + x) * 3;
          out[p] = clamp255(out[p] + r0 * v);
          out[p + 1] = clamp255(out[p + 1] + g0 * v);
          out[p + 2] = clamp255(out[p + 2] + b0 * v);
        }
      }
    }
  }

  const master = project.masterBrightness / 100;
  const invGamma = 1 / Math.max(0.1, project.gamma);
  for (let i = 0; i < out.length; i++) {
    out[i] = Math.pow(out[i] / 255, invGamma) * 255 * master;
  }
  return out;
}
