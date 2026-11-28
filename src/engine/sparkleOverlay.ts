import type { Project } from "@/types/project";

const HIGH_CONTRAST = ["#ffffff", "#ff0000", "#00ff00", "#0066ff", "#ffff00", "#00ffff", "#ff00ff"];

const hash = (x: number, y: number) => {
  const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return v - Math.floor(v);
};

const hex = (value: string): [number, number, number] => {
  const n = parseInt(value.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** Final full-brightness pass over the composited matrix; preview and AVI share it. */
export function applySparkleOverlay(out: Uint8ClampedArray, cols: number, rows: number, time: number, project: Project): void {
  if (!project.sparkleOverlay) return;
  const density = Math.max(1, Math.min(25, project.sparkleOverlayDensity ?? 6)) / 100;
  const speed = Math.max(1, Math.min(10, project.sparkleOverlaySpeed ?? 4));
  const mode = project.sparkleOverlayColorMode ?? "solid";
  const palette = project.sparkleOverlayPalette?.length ? project.sparkleOverlayPalette : HIGH_CONTRAST;
  const solid = hex(project.sparkleOverlayColor || "#ffffff");
  const frame = Math.floor(time * speed * 2);

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (hash(x * cols + y + 1, frame + 1) >= density) continue;
      let color: [number, number, number];
      if (mode === "random") color = hex(HIGH_CONTRAST[Math.floor(hash(frame + 1, x * cols + y) * HIGH_CONTRAST.length) % HIGH_CONTRAST.length]);
      else if (mode === "palette") color = hex(palette[Math.floor(hash(frame + 1, y * cols + x) * palette.length) % palette.length]);
      else color = solid;
      const p = (y * cols + x) * 3;
      out[p] = color[0];
      out[p + 1] = color[1];
      out[p + 2] = color[2];
    }
  }
}
