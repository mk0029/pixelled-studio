import type { HardwareConfig } from "@/types/hardware";
import { buildLayout } from "@/engine/layouts";

export interface WiredPixel {
  x: number;
  y: number;
  /** Position in the physical data stream, 0 .. cols*rows-1. */
  index: number;
  /** Position within this controller port's stream. */
  localIndex: number;
  port: number;
}

export interface PortSpan {
  port: number;
  axis: "column" | "row";
  from: number;
  to: number;
  pixels: number;
}

/** The hand-off segment where a Z-chain leaves one port and enters the next. */
export interface ZLink {
  from: WiredPixel;
  to: WiredPixel;
  fromPort: number;
  toPort: number;
}

export interface WiringMap {
  pixels: WiredPixel[];
  ports: PortSpan[];
  zLinks: ZLink[];
  warnings: string[];
  totalPixels: number;
}

const seq = (n: number) => Array.from({ length: n }, (_, i) => i);

/**
 * Converts a matrix + routing preset into the exact physical pixel order.
 * This is the single source of truth shared by the canvas overlay and export.
 */
export function buildWiringMap(hw: HardwareConfig): WiringMap {
  let cols = Math.max(1, Math.round(hw.cols));
  let rows = Math.max(1, Math.round(hw.rows));
  const activePorts = Math.max(1, Math.round(hw.activePorts));
  const layoutType = hw.layoutType ?? "matrix";
  const fromTop = hw.startCorner.startsWith("top");
  const fromLeft = hw.startCorner.endsWith("left");
  const vertical = hw.routing.startsWith("vertical");
  const snake = hw.routing.endsWith("snake");
  const zChain = (hw.portChain ?? "z") === "z";

  let ordered: { x: number; y: number }[] = [];
  let ports: PortSpan[] = [];
  const portOfAxis = new Map<number, number>();
  let portByPixel: number[] = [];

  if (layoutType !== "matrix") {
    const layout = buildLayout(hw);
    cols = layout.cols;
    rows = layout.rows;
    ordered = layout.pixels;
    const chunk = Math.max(1, Math.ceil(ordered.length / activePorts));
    for (let i = 0; i < activePorts; i++) {
      const from = i * chunk;
      const to = Math.min(ordered.length, (i + 1) * chunk);
      ports.push({ port: i + 1, axis: "row", from, to: to - 1, pixels: to - from });
    }
    portByPixel = ordered.map((_, i) => Math.min(activePorts, Math.floor(i / chunk) + 1));
  } else {
  // Balance whole columns (vertical wiring) or rows (horizontal wiring) per port.
  const axisCount = vertical ? cols : rows;
  const sizes = Array(activePorts).fill(Math.floor(axisCount / activePorts)) as number[];
  for (let i = 0; i < axisCount % activePorts; i++) sizes[i]++;
  let cursor = 0;
  sizes.forEach((size, i) => {
    ports.push({ port: i + 1, axis: vertical ? "column" : "row", from: cursor, to: cursor + size - 1, pixels: 0 });
    for (let a = cursor; a < cursor + size; a++) portOfAxis.set(a, i + 1);
    cursor += size;
  });

  ordered = [];
  const emitVertical = (axes: number[], restart: boolean) => {
    axes.forEach((x, ci) => {
      const down = snake && !restart ? (ci % 2 === 0 ? fromTop : !fromTop) : fromTop;
      const ySeq = down ? seq(rows) : seq(rows).reverse();
      for (const y of ySeq) ordered.push({ x, y });
    });
  };
  const emitHorizontal = (axes: number[], restart: boolean) => {
    axes.forEach((y, ri) => {
      const right = snake && !restart ? (ri % 2 === 0 ? fromLeft : !fromLeft) : fromLeft;
      const xSeq = right ? seq(cols) : seq(cols).reverse();
      for (const x of xSeq) ordered.push({ x, y });
    });
  };

  if (zChain) {
    // One continuous stream: the last LED of port N is wired to the first of port N+1.
    const axes = fromLeft || fromTop ? seq(axisCount) : seq(axisCount).reverse();
    vertical ? emitVertical(axes, false) : emitHorizontal(axes, false);
  } else {
    // Parallel bus: every port is fed independently from its own nearest edge.
    for (const span of ports) {
      const axes = seq(span.to - span.from + 1).map((i) => span.from + i);
      if (!fromLeft && !fromTop) axes.reverse();
      vertical ? emitVertical(axes, true) : emitHorizontal(axes, true);
    }
  }

  }
  const local = new Map<number, number>();
  const pixels: WiredPixel[] = ordered.map((p, index) => {
    const port = layoutType !== "matrix"
      ? (portByPixel[index] ?? 1)
      : (portOfAxis.get(vertical ? p.x : p.y) ?? 1);
    const localIndex = local.get(port) ?? 0;
    local.set(port, localIndex + 1);
    const span = ports[port - 1];
    if (span) span.pixels++;
    return { ...p, index, localIndex, port };
  });

  const zLinks: ZLink[] = [];
  if (zChain) {
    for (let i = 0; i < pixels.length - 1; i++) {
      if (pixels[i].port !== pixels[i + 1].port) {
        zLinks.push({ from: pixels[i], to: pixels[i + 1], fromPort: pixels[i].port, toPort: pixels[i + 1].port });
      }
    }
  }

  return { pixels, ports, zLinks, warnings: [], totalPixels: cols * rows };
}

export const PORT_COLORS = [
  "#38e1d4", "#9a7cff", "#ff7ab6", "#ffc857", "#6ee7a8", "#60a5fa", "#fb923c", "#f472b6",
];
