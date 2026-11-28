import type { Text3DConfig } from "@/types/layers";

export const EMOJI_FONT_FALLBACK = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
const EMOJI_REGEX = /\p{Extended_Pictographic}/u;

/** Canvas font shorthand with a colour-emoji fallback on every platform. */
export function emojiFontSpec(fontWeight: string | number, fontSize: number, fontFamily: string): string {
  const family = fontFamily.trim().startsWith("var(") || fontFamily.includes(",")
    ? fontFamily.trim()
    : `"${fontFamily.trim()}"`;
  return `${fontWeight} ${fontSize}px ${family}, ${EMOJI_FONT_FALLBACK}`;
}

/** Grapheme clusters keep Devanagari matras and multi-codepoint emojis intact. */
export function splitGraphemes(text: string): string[] {
  if (!text) return [];
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    return Array.from(segmenter.segment(text), (s) => s.segment);
  }
  return Array.from(text);
}

export function isEmojiGrapheme(grapheme: string): boolean {
  return EMOJI_REGEX.test(grapheme);
}

function darkenHex(hex: string, factor: number): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return "#1A1A1A";
  const r = Math.max(0, Math.min(255, Math.round(parseInt(clean.slice(0, 2), 16) * factor)));
  const g = Math.max(0, Math.min(255, Math.round(parseInt(clean.slice(2, 4), 16) * factor)));
  const b = Math.max(0, Math.min(255, Math.round(parseInt(clean.slice(4, 6), 16) * factor)));
  return `rgb(${r},${g},${b})`;
}

export interface Render3DTextParams {
  ctx: CanvasRenderingContext2D;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  fontWeight?: string | number;
  fillColor: string;
  strokeColor?: string;
  strokeWidth?: number;
  letterSpacing?: number;
  frameIndex: number;
  fps: number;
  config3D?: Text3DConfig;
  /** Global grapheme index when drawing text one glyph at a time. */
  charIndex?: number;
}

/**
 * Draws grapheme-safe text with optional multi-layer 3D extrusion. Emoji are
 * silhouetted in the extrusion passes and drawn in native colour on the front.
 */
export function renderStyledTextWithEmojis({
  ctx, text, x, y, fontSize, fontFamily, fontWeight = 700,
  fillColor, strokeColor = "#000000", strokeWidth = 0, letterSpacing = 0,
  frameIndex, fps, config3D, charIndex,
}: Render3DTextParams): number {
  const graphemes = splitGraphemes(text);
  if (graphemes.length === 0) return 0;

  ctx.save();
  ctx.font = emojiFontSpec(fontWeight, fontSize, fontFamily);
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";

  const widths = graphemes.map((g) => ctx.measureText(g).width + letterSpacing);
  const totalWidth = widths.reduce((acc, w) => acc + w, 0) - letterSpacing;
  const t = (frameIndex / Math.max(1, fps)) * ((config3D?.motionSpeed ?? 40) / 25);
  const is3D = Boolean(config3D?.enabled && config3D.depth > 0);

  let scaleX = 1;
  let skewY = 0;
  let activeDepth = config3D?.depth ?? 0;
  if (is3D && config3D) {
    if (config3D.motion === "3d-spin-x") scaleX = Math.cos(t * 2.2);
    else if (config3D.motion === "3d-tilt-swing") {
      skewY = Math.sin(t * 2.5) * 0.24;
      scaleX = 0.88 + 0.12 * Math.cos(t * 2.5);
    } else if (config3D.motion === "3d-depth-pulse") {
      activeDepth = Math.max(1, Math.round(config3D.depth * (0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 3.5)))));
    }
  }

  const centerX = x + totalWidth / 2;
  ctx.translate(centerX, y);
  if (skewY !== 0) ctx.transform(1, skewY, 0, 1, 0, 0);
  ctx.scale(scaleX, 1);
  ctx.translate(-centerX, -y);

  const rad = ((config3D?.angleDeg ?? 135) * Math.PI) / 180;
  const dirX = Math.cos(rad);
  const dirY = Math.sin(rad);

  // PASS 1: back-to-front extrusion. Colour emoji get a tinted silhouette.
  if (is3D && config3D && activeDepth >= 1) {
    const baseSideColor = config3D.autoDarken ? darkenHex(fillColor, 0.35) : (config3D.extrudeColor || "#222222");
    for (let step = activeDepth; step >= 1; step--) {
      const ratio = step / activeDepth;
      const offX = Math.round(dirX * step);
      const offY = Math.round(dirY * step);
      let layerColor = baseSideColor;
      if (config3D.style === "shaded-bevel" && config3D.autoDarken) {
        layerColor = darkenHex(fillColor, 0.18 + 0.45 * (1 - ratio));
      } else if (config3D.style === "rainbow-depth") {
        layerColor = `hsl(${Math.round((step * 32 + frameIndex * 3) % 360)}, 100%, 42%)`;
      } else if (config3D.style === "neon-shadow") {
        layerColor = config3D.extrudeColor || "#00E5FF";
      }

      const previousShadowColor = ctx.shadowColor;
      const previousShadowBlur = ctx.shadowBlur;
      const glow = config3D.style === "neon-shadow";
      if (glow) {
        ctx.shadowColor = layerColor;
        ctx.shadowBlur = Math.max(2, fontSize * 0.12);
      }

      let cursorX = x;
      for (let i = 0; i < graphemes.length; i++) {
        const g = graphemes[i];
        const emoji = isEmojiGrapheme(g);
        const index = charIndex ?? i;
        const waveY = config3D.motion === "3d-wave"
          ? Math.round(Math.sin(t * 4 - index * 0.65) * Math.max(2, fontSize * 0.14))
          : 0;
        const previousFilter = ctx.filter;
        if (emoji && typeof ctx.filter === "string") ctx.filter = "brightness(0) opacity(0.9)";
        ctx.fillStyle = layerColor;
        ctx.fillText(g, Math.round(cursorX + offX), Math.round(y + offY + waveY));
        if (emoji && typeof ctx.filter === "string") ctx.filter = previousFilter;
        cursorX += widths[i];
      }
      if (glow) {
        ctx.shadowBlur = previousShadowBlur;
        ctx.shadowColor = previousShadowColor;
      }
    }
  }

  // PASS 2: separator stroke and crisp front face (full native emoji colour).
  let cursorX = x;
  for (let i = 0; i < graphemes.length; i++) {
    const g = graphemes[i];
    const emoji = isEmojiGrapheme(g);
    const index = charIndex ?? i;
    const waveY = is3D && config3D?.motion === "3d-wave"
      ? Math.round(Math.sin(t * 4 - index * 0.65) * Math.max(2, fontSize * 0.14))
      : 0;
    const drawX = Math.round(cursorX);
    const drawY = Math.round(y + waveY);
    const effectiveStroke = Math.max(strokeWidth, is3D && config3D?.separatorStroke ? 1.5 : 0);

    if (effectiveStroke > 0 && !emoji) {
      ctx.lineJoin = "round";
      ctx.lineWidth = effectiveStroke;
      ctx.strokeStyle = strokeColor || "#050505";
      ctx.strokeText(g, drawX, drawY);
    }

    const isBackFace = is3D && config3D?.motion === "3d-spin-x" && scaleX < 0;
    ctx.fillStyle = emoji
      ? "#FFFFFF"
      : isBackFace
        ? (config3D?.extrudeColor || darkenHex(fillColor, 0.7))
        : fillColor;
    ctx.fillText(g, drawX, drawY);
    cursorX += widths[i];
  }

  ctx.restore();
  return totalWidth;
}
