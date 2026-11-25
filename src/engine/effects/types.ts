import type { DotParams } from "./accentDots";

export interface EffectParams {
  speed: number;
  density: number;
  direction: "normal" | "reverse" | "left" | "right" | "up" | "down" | "in" | "out" | "cw" | "ccw";
  palette: string;
  hueShift: number;
  brightness: number;
  symmetry: number;
  dots?: DotParams;
}
