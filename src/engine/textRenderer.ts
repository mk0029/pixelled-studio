export interface TextRenderContext {
  layer: import("@/types/project").Layer;
  cols: number;
  rows: number;
  time: number;
}

const S = 6; // supersample factor for crisp pixel text
const cache = new Map<string, { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D }>();

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

function buildColors(layer: import("@/types/project").Layer): string[] {
  const colors = (layer.textColors && layer.textColors.length ? layer.textColors : [layer.color || "#ffffff"]);
  return colors;
}

export function renderTextLayer(layer: import("@/types/project").Layer, cols: number, rows: number, time: number): Uint8ClampedArray | null {
  if (typeof document === "undefined") return null;
  const { canvas, ctx, w, h } = getCanvas(cols, rows);
  ctx.clearRect(0, 0, w, h);
  const text = (layer.textContent || layer.text || "").trim() || " ";
  const textSize = Math.max(6, Math.min(64, layer.textSize ?? 16));
  const font = layer.textFont || "ui-monospace, monospace";
  // Auto-fit keeps typography proportional to the matrix height (65% of rows).
  const size = layer.textAutoFit === false
    ? Math.max(6, Math.round(textSize * S * 0.9))
    : Math.max(6, Math.round(rows * S * 0.65 * Math.max(0.2, Math.min(4, textSize / 16))));
  // Wait for fonts (best-effort, sync)
  try { void document.fonts; } catch { /* ignore */ }

  const colors = buildColors(layer);
  const dir = layer.textDirection || "left";
  const spacing = layer.textSpacing ?? 1;
  const rawSpeed = layer.textSpeed ?? layer.speed ?? 1;
  const speed = Math.max(0.2, rawSpeed);

  // Measure
  ctx.font = `700 ${size}px ${font}`;
  ctx.textBaseline = "middle";
  const charWidths = [...text].map((ch) => ctx.measureText(ch).width + spacing * (size * 0.15));
  const textW = charWidths.reduce((a, b) => a + b, 0);
  const lineH = size * 1.15;

  // Scroll offset. Rates use w/h (supersampled matrix size), so speed is in
  // matrix widths/heights per second and stays visually constant at any grid size.
  let offset = 0;
  const span = textW + w * 0.6;
  switch (dir) {
    case "left": offset = ((time * speed * w * 0.35) % span + span) % span; break;
    case "right": offset = (-((time * speed * w * 0.35) % span) + span) % span; break;
    case "up": /* handled per char y */ break;
    case "down": break;
    case "pingpong": {
      const cycle = span * 2;
      const p = ((time * speed * w * 0.35) % cycle + cycle) % cycle;
      offset = p < span ? p : cycle - p;
      break;
    }
    case "typewriter": offset = 0; break;
    case "wave": offset = ((time * speed * w * 0.25) % span + span) % span; break;
    case "static": offset = 0; break;
  }

  const startX = w - offset;
  const centerY = h / 2 + (layer.textY ?? 0) * (h / rows);

  // Typewriter reveal count
  let revealCount = text.length;
  if (dir === "typewriter") {
    revealCount = Math.min(text.length, Math.floor((time * speed * 4) % (text.length + 4)));
    if (revealCount === 0) revealCount = 1;
  }

  ctx.save();
  // outline/shadow
  if (layer.textShadow) {
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = Math.max(2, size * 0.15);
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
  }

  let cx = startX + (layer.textX ?? 0) * (w / cols);
  const chars = [...text];
  chars.forEach((ch, i) => {
    if (dir === "typewriter" && i >= revealCount) return;
    // color
    let fill = colors[0];
    const mode = layer.textColorMode || "solid";
    if (mode === "rainbow") {
      const hue = (i * 37 + time * 60) % 360;
      fill = `hsl(${hue}, 100%, 60%)`;
    } else if (mode === "alt") {
      fill = colors[i % colors.length];
    } else if (mode === "gradientH" || mode === "gradientV") {
      // approximate per-char gradient by index
      const t = chars.length > 1 ? i / (chars.length - 1) : 0;
      fill = colors[Math.min(colors.length - 1, Math.floor(t * (colors.length - 1) + 0.5))];
    } else {
      fill = colors[0];
    }
    ctx.fillStyle = fill;
    if (layer.textOutline) {
      ctx.strokeStyle = "#000";
      ctx.lineWidth = Math.max(1, size * 0.08);
      ctx.strokeText(ch, cx, centerY);
    }

    // wave bounce
    let y = centerY;
    if (dir === "wave") {
      y = centerY + Math.sin((cx / w) * Math.PI * 4 + time * 3) * (size * 0.25);
    }
    // vertical scroll
    if (dir === "up" || dir === "down") {
      const vspan = textW + h * 0.6;
      const voff = dir === "up"
        ? ((time * speed * h * 0.35) % vspan + vspan) % vspan
        : (-((time * speed * h * 0.35) % vspan) + vspan) % vspan;
      y = (voff + (layer.textY ?? 0) * (h / rows)) % vspan;
      // draw at x centered
      cx = w / 2;
    }

    ctx.fillText(ch, cx, y);
    cx += charWidths[i];
  });
  ctx.restore();

  // Also draw second copy for horizontal scroll continuity
  if (dir === "left" || dir === "right" || dir === "pingpong" || dir === "wave") {
    // second pass already handled by offset span? We drew one copy; for seamless loop draw second
    // Draw second copy at cx start + span
  }

  // Downsample to cols x rows, RGBA
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
