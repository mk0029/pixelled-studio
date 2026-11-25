export type LayoutType = "matrix" | "toran" | "roundFrame" | "strip";

export interface LayoutPixel {
  x: number;
  y: number;
}

export interface LayoutResult {
  cols: number;
  rows: number;
  pixels: LayoutPixel[];
}

export function buildToranLayout(strings: number, bulbs: number): LayoutResult {
  const cols = Math.max(1, Math.round(strings));
  const rows = Math.max(1, Math.round(bulbs));
  const pixels: LayoutPixel[] = [];
  for (let y = 0; y < rows; y++) {
    const leftToRight = y % 2 === 0;
    const xs = leftToRight ? Array.from({ length: cols }, (_, i) => i) : Array.from({ length: cols }, (_, i) => cols - 1 - i);
    for (const x of xs) pixels.push({ x, y });
  }
  return { cols, rows, pixels };
}

export function buildRoundFrameLayout(params: {
  mode: "spokes" | "rings";
  spokes?: number;
  ledsPerSpoke?: number;
  rings?: number;
  ledsPerRing?: number;
  direction?: "center-out" | "outer-in";
}): LayoutResult {
  const direction = params.direction ?? "center-out";
  if (params.mode === "spokes") {
    const spokes = Math.max(1, Math.round(params.spokes ?? 8));
    const lps = Math.max(1, Math.round(params.ledsPerSpoke ?? 10));
    const size = lps * 2 + 1;
    const center = lps;
    const pixels: LayoutPixel[] = [{ x: center, y: center }];
    const spokeAngles = Array.from({ length: spokes }, (_, i) => (i / spokes) * Math.PI * 2);
    const radii = direction === "center-out"
      ? Array.from({ length: lps }, (_, i) => i + 1)
      : Array.from({ length: lps }, (_, i) => lps - i);
    for (const r of radii) {
      for (const theta of spokeAngles) {
        const x = Math.round(center + r * Math.cos(theta));
        const y = Math.round(center + r * Math.sin(theta));
        if (x >= 0 && x < size && y >= 0 && y < size) pixels.push({ x, y });
      }
    }
    return { cols: size, rows: size, pixels: dedup(pixels) };
  }
  const rings = Math.max(1, Math.round(params.rings ?? 4));
  const lpr = Math.max(4, Math.round(params.ledsPerRing ?? 12));
  const size = rings * 2 + 1;
  const center = rings;
  const pixels: LayoutPixel[] = [{ x: center, y: center }];
  const ringOrder = direction === "center-out"
    ? Array.from({ length: rings }, (_, i) => i + 1)
    : Array.from({ length: rings }, (_, i) => rings - i);
  for (const ring of ringOrder) {
    const count = lpr * ring;
    for (let i = 0; i < count; i++) {
      const theta = (i / count) * Math.PI * 2;
      const x = Math.round(center + ring * Math.cos(theta));
      const y = Math.round(center + ring * Math.sin(theta));
      if (x >= 0 && x < size && y >= 0 && y < size) pixels.push({ x, y });
    }
  }
  return { cols: size, rows: size, pixels: dedup(pixels) };
}

export function buildStripLayout(count: number): LayoutResult {
  const n = Math.max(1, Math.round(count));
  const pixels: LayoutPixel[] = Array.from({ length: n }, (_, i) => ({ x: i, y: 0 }));
  return { cols: n, rows: 1, pixels };
}

function dedup(pixels: LayoutPixel[]): LayoutPixel[] {
  const seen = new Set<string>();
  return pixels.filter((pt) => {
    const key = `${pt.x},${pt.y}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function buildLayout(hw: { layoutType?: string; layoutParams?: Record<string, number | string>; cols: number; rows: number }): LayoutResult {
  const type = hw.layoutType ?? "matrix";
  if (type === "toran") {
    return buildToranLayout(Number(hw.layoutParams?.strings ?? hw.cols), Number(hw.layoutParams?.bulbs ?? hw.rows));
  }
  if (type === "roundFrame") {
    return buildRoundFrameLayout({
      mode: (hw.layoutParams?.mode as "spokes" | "rings") ?? "spokes",
      spokes: Number(hw.layoutParams?.spokes ?? 8),
      ledsPerSpoke: Number(hw.layoutParams?.ledsPerSpoke ?? 10),
      rings: Number(hw.layoutParams?.rings ?? 4),
      ledsPerRing: Number(hw.layoutParams?.ledsPerRing ?? 12),
      direction: (hw.layoutParams?.direction as "center-out" | "outer-in") ?? "center-out",
    });
  }
  if (type === "strip") {
    return buildStripLayout(Number((hw.layoutParams?.count ?? (hw.cols * hw.rows)) || 50));
  }
  // matrix default
  const cols = Math.max(1, Math.round(hw.cols));
  const rows = Math.max(1, Math.round(hw.rows));
  const pixels: LayoutPixel[] = [];
  for (let y = 0; y < rows; y++) {
    const xs = y % 2 === 0 ? Array.from({ length: cols }, (_, i) => i) : Array.from({ length: cols }, (_, i) => cols - 1 - i);
    for (const x of xs) pixels.push({ x, y });
  }
  return { cols, rows, pixels };
}
