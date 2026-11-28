import { preloadFont, resolveFontStack } from "./fontFamilies";
import { emojiFontSpec, renderStyledTextWithEmojis, splitGraphemes } from "@/lib/text3dRenderer";

export interface TextRenderContext {
  layer: import("@/types/project").Layer;
  cols: number;
  rows: number;
  time: number;
}

const S = 6; // supersample factor for crisp pixel text
const cache = new Map<string, { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D }>();
const pendingFonts = new Set<string>();

function getCanvas(cols: number, rows: number) {
  const w = cols * S, h = rows * S;
  const key = `${w}x${h}`;
  let entry = cache.get(key);
  if (!entry) {
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    entry = { canvas, ctx: canvas.getContext("2d", { willReadFrequently: true })! };
    cache.set(key, entry);
  }
  return { ...entry, w, h };
}

/** Return false while a web font is still loading so Canvas never paints Arial. */
function fontReady(font: string): boolean {
  if (typeof document === "undefined" || !document.fonts) return true;
  const stack = resolveFontStack(font);
  const spec = `700 24px ${stack}`;
  if (document.fonts.check(spec)) return true;
  if (!pendingFonts.has(font)) {
    pendingFonts.add(font);
    void (async () => {
      try {
        await preloadFont(font, 700, 24);
      } catch { /* offline: fall back on the next frame */ }
      finally { pendingFonts.delete(font); }
    })();
  }
  return false;
}

function buildColors(layer: import("@/types/project").Layer): string[] {
  return layer.textColors?.length ? layer.textColors : [layer.color || "#ffffff"];
}

export function renderTextLayer(layer: import("@/types/project").Layer, cols: number, rows: number, time: number, fps = 30): Uint8ClampedArray | null {
  if (typeof document === "undefined") return null;
  const font = resolveFontStack(layer.textFont || "ui-monospace, monospace");
  if (!fontReady(font)) return null;

  const { canvas, ctx, w, h } = getCanvas(cols, rows);
  ctx.clearRect(0, 0, w, h);
  const text = (layer.textContent || layer.text || "").trim() || " ";
  const textSize = Math.max(6, Math.min(64, layer.textSize ?? 16));
  const size = layer.textAutoFit === false
    ? Math.max(6, Math.round(textSize * S * 0.9))
    : Math.max(6, Math.round(rows * S * 0.65 * Math.max(0.2, Math.min(4, textSize / 16))));

  const colors = buildColors(layer);
  const dir = layer.textDirection || "left";
  const spacing = Math.max(-4, Math.min(16, layer.textSpacing ?? 1));
  const textXOffsetLed = layer.textXOffset ?? layer.xOffset ?? 0;
  const textYOffsetLed = layer.textYOffset ?? layer.yOffset ?? 0;
  const speed = Math.max(0.2, layer.textSpeed ?? layer.speed ?? 1);

  ctx.font = emojiFontSpec(700, size, font);
  ctx.textBaseline = "middle";
  const chars = splitGraphemes(text);
  const charWidths = chars.map((ch) => ctx.measureText(ch).width + spacing * (size * 0.15));
  const textW = charWidths.reduce((a, b) => a + b, 0);
  const span = textW + w * 0.6;

  let offset = 0;
  switch (dir) {
    case "left": offset = ((time * speed * w * 0.35) % span + span) % span; break;
    case "right": offset = (-((time * speed * w * 0.35) % span) + span) % span; break;
    case "pingpong": {
      const cycle = span * 2;
      const p = ((time * speed * w * 0.35) % cycle + cycle) % cycle;
      offset = p < span ? p : cycle - p;
      break;
    }
    case "wave": offset = ((time * speed * w * 0.25) % span + span) % span; break;
  }

  let revealCount = chars.length;
  if (dir === "typewriter") {
    revealCount = Math.min(chars.length, Math.floor((time * speed * 4) % (chars.length + 4)));
    if (revealCount === 0) revealCount = 1;
  }

  ctx.save();
  if (layer.textShadow) {
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = Math.max(2, size * 0.15);
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
  } else {
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
  }

  let cx = w - offset + (layer.textX ?? 0) * (w / cols) + textXOffsetLed * S;
  const baseY = h / 2 + (layer.textY ?? 0) * (h / rows) + textYOffsetLed * S;
  const boldStroke = Math.max(0, Math.min(4, layer.textStroke ?? 0)) * size * 0.02;
  const mode = layer.textColorMode || "solid";

  chars.forEach((ch, i) => {
    if (dir === "typewriter" && i >= revealCount) return;
    let fill = colors[0];
    if (mode === "rainbow") fill = `hsl(${(i * 37 + time * 60) % 360}, 100%, 60%)`;
    else if (mode === "alt") fill = colors[i % colors.length];
    else if (mode === "gradientH" || mode === "gradientV") {
      const f = chars.length > 1 ? i / (chars.length - 1) : 0;
      fill = colors[Math.min(colors.length - 1, Math.floor(f * (colors.length - 1) + 0.5))];
    }
    ctx.fillStyle = fill;

    let y = baseY;
    if (dir === "wave") y += Math.sin((cx / w) * Math.PI * 4 + time * 3) * (size * 0.25);
    if (dir === "up" || dir === "down") {
      const vspan = textW + h * 0.6;
      const voff = dir === "up"
        ? ((time * speed * h * 0.35) % vspan + vspan) % vspan
        : (-((time * speed * h * 0.35) % vspan) + vspan) % vspan;
      y = (voff + (layer.textY ?? 0) * (h / rows) + textYOffsetLed * S) % vspan;
      cx = w / 2 + textXOffsetLed * S;
    }

    const strokeWidth = layer.textOutline ? Math.max(1, size * 0.09) : boldStroke;
    const width = renderStyledTextWithEmojis({
      ctx,
      text: ch,
      x: cx,
      y,
      fontSize: size,
      fontFamily: font,
      fontWeight: 700,
      fillColor: fill,
      strokeColor: layer.textOutline ? "#000000" : fill,
      strokeWidth,
      letterSpacing: spacing * (size * 0.15),
      frameIndex: Math.round(time * Math.max(1, fps)),
      fps,
      config3D: layer.text3d,
      charIndex: i,
    });
    cx += width || charWidths[i];
  });
  ctx.restore();

  const data = ctx.getImageData(0, 0, w, h).data;
  const result = new Uint8ClampedArray(cols * rows * 4);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const sx = Math.min(w - 1, Math.floor((x + 0.5) * S));
      const sy = Math.min(h - 1, Math.floor((y + 0.5) * S));
      const q = (sy * w + sx) * 4;
      const p = (y * cols + x) * 4;
      result[p] = data[q];
      result[p + 1] = data[q + 1];
      result[p + 2] = data[q + 2];
      result[p + 3] = data[q + 3];
    }
  }
  return result;
}
