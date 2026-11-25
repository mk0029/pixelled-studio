export interface DotParams {
  enabled: boolean;
  pattern: "diamond_mesh" | "checkerboard" | "grid_dots" | "star_sparkles" | "border_lights" | "diagonal_dots";
  action: "static" | "blink" | "alternate_blink" | "twinkle" | "move" | "move_and_blink";
  direction: "sync" | "left" | "right" | "up" | "down" | "diag_down_right" | "diag_down_left" | "in" | "out";
  speed: number;
  blinkRate: number;
  spacing: number;
  colorMode: "white" | "warm_white" | "gold" | "auto_cycle" | "custom";
  customColor: string;
  placement: "dark_areas_only" | "on_top" | "additive";
}

export const DEFAULT_DOT_PARAMS: DotParams = {
  enabled: false,
  pattern: "diamond_mesh",
  action: "static",
  direction: "sync",
  speed: 1,
  blinkRate: 2,
  spacing: 2,
  colorMode: "white",
  customColor: "#ffffff",
  placement: "on_top",
};

export function applyAccentDots(
  buffer: Uint8ClampedArray,
  width: number,
  height: number,
  t: number,
  dots: DotParams,
  mainDir: string,
): void {
  if (!dots.enabled) return;
  const dir = dots.direction === "sync" ? mainDir : dots.direction;
  let dx = 0, dy = 0;
  const step = t * dots.speed;
  if (dir === "left") dx = -step;
  if (dir === "right") dx = step;
  if (dir === "up") dy = -step;
  if (dir === "down") dy = step;
  if (dir === "diag_down_right") { dx = step; dy = step; }
  if (dir === "diag_down_left") { dx = -step; dy = step; }
  if (dir === "in") { /* no-op radial placeholder */ }
  if (dir === "out") { /* no-op radial placeholder */ }

  const spacing = Math.max(1, Math.round(dots.spacing));
  const blink = Math.sin(t * dots.blinkRate * Math.PI * 2) > 0 ? 1 : 0;
  const alt = (x: number, y: number) => ((x + y) % 2 === 0) ? 1 : 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const sx = x + dx;
      const sy = y + dy;
      let isDot = false;
      switch (dots.pattern) {
        case "checkerboard": isDot = ((Math.floor(sx / spacing) + Math.floor(sy / spacing)) % 2 === 0); break;
        case "grid_dots": isDot = (Math.floor(sx) % spacing === 0 && Math.floor(sy) % spacing === 0); break;
        case "diagonal_dots": isDot = ((Math.floor(sx) + Math.floor(sy)) % spacing === 0); break;
        default: isDot = ((Math.floor(sx) % spacing === 0) && (Math.floor(sy) % spacing === 0));
      }
      if (!isDot) continue;

      let visible = true;
      const idx = Math.floor(sx) + Math.floor(sy) * width;
      if (dots.action === "blink") visible = blink > 0;
      if (dots.action === "alternate_blink") visible = (alt(Math.floor(sx), Math.floor(sy)) === blink ? true : false);
      if (dots.action === "twinkle") {
        const h = Math.sin(idx * 12.9898) * 43758.5453;
        visible = Math.sin(t * dots.blinkRate + h) > 0;
      }
      if (dots.action === "move_and_blink") visible = blink > 0;
      if (!visible) continue;

      const i = (y * width + x) * 3;
      const dark = buffer[i] + buffer[i + 1] + buffer[i + 2] < 40;
      if (dots.placement === "dark_areas_only" && !dark) continue;

      let color = [255, 255, 255];
      if (dots.colorMode === "warm_white") color = [255, 240, 200];
      if (dots.colorMode === "gold") color = [255, 215, 0];
      if (dots.colorMode === "custom") {
        const hex = dots.customColor.replace("#", "");
        color = [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
      }
      if (dots.colorMode === "auto_cycle") {
        const hue = (t * 60) % 360;
        const c = 1, x2 = 1 - Math.abs((hue / 60) % 2 - 1);
        let r = 0, g = 0, b = 0;
        if (hue < 60) [r, g, b] = [c, x2, 0];
        else if (hue < 120) [r, g, b] = [x2, c, 0];
        else if (hue < 180) [r, g, b] = [0, c, x2];
        else if (hue < 240) [r, g, b] = [0, x2, c];
        else if (hue < 300) [r, g, b] = [x2, 0, c];
        else [r, g, b] = [c, 0, x2];
        color = [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
      }

      if (dots.placement === "additive") {
        buffer[i] = Math.min(255, buffer[i] + color[0]);
        buffer[i + 1] = Math.min(255, buffer[i + 1] + color[1]);
        buffer[i + 2] = Math.min(255, buffer[i + 2] + color[2]);
      } else {
        buffer[i] = color[0];
        buffer[i + 1] = color[1];
        buffer[i + 2] = color[2];
      }
    }
  }
}
