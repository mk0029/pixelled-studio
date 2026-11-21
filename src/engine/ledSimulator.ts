import type { WiringMap } from "@/engine/wiringMapper";

interface SimulatorOptions {
  cols: number;
  rows: number;
  map: WiringMap;
  ox: number;
  oy: number;
  cell: number;
  wiring?: boolean;
}

/** Renderer ported from ledSimulator.js: halo, dark off LEDs, specular dot, wire path. */
export function drawSimulatorFrame(
  ctx: CanvasRenderingContext2D,
  frame: Uint8ClampedArray,
  { cols, rows, map, ox, oy, cell, wiring }: SimulatorOptions,
) {
  const radius = Math.max(2, cell * 0.31);
  const halo = radius >= 4; // 100×100 grids skip per-LED gradients to stay smooth
  if (wiring) drawSimulatorWirePath(ctx, map, ox, oy, cell);

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const q = (y * cols + x) * 3;
      const r = frame[q], g = frame[q + 1], b = frame[q + 2];
      const cx = ox + (x + 0.5) * cell;
      const cy = oy + (y + 0.5) * cell;
      const lit = r + g + b > 12;

      if (halo && lit) {
        const glow = ctx.createRadialGradient(cx, cy, radius * 0.2, cx, cy, radius * 2.4);
        glow.addColorStop(0, `rgba(${r | 0},${g | 0},${b | 0},0.56)`);
        glow.addColorStop(1, `rgba(${r | 0},${g | 0},${b | 0},0)`);
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(cx, cy, radius * 2.4, 0, Math.PI * 2); ctx.fill();
      }

      ctx.fillStyle = lit ? `rgb(${r | 0},${g | 0},${b | 0})` : "#090909";
      ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = lit ? "rgba(255,255,255,0.52)" : "rgba(255,255,255,0.07)";
      ctx.beginPath();
      ctx.arc(cx - radius * 0.24, cy - radius * 0.27, radius * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawSimulatorWirePath(ctx: CanvasRenderingContext2D, map: WiringMap, ox: number, oy: number, cell: number) {
  if (!map.pixels.length) return;
  ctx.beginPath();
  map.pixels.forEach((pixel, i) => {
    const x = ox + (pixel.x + 0.5) * cell;
    const y = oy + (pixel.y + 0.5) * cell;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = "rgba(95,119,137,0.28)";
  ctx.lineWidth = Math.max(1, cell * 0.08);
  ctx.stroke();
}
