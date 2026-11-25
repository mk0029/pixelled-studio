/** Public layer configs. They bridge onto the flat fields stored in projects. */

export type DotsLinesMode = "dots" | "lines" | "dashed";
export type DotsLinesLayout = "grid" | "checkerboard" | "hstrips" | "vstrips" | "diag" | "border" | "scatter";
export type MoveDirection =
  | "up" | "down" | "left" | "right"
  | "diag-ul" | "diag-ur" | "diag-dl" | "diag-dr"
  | "expand" | "converge" | "bounce"
  | "radial-out" | "radial-in" | "drift";

export type DotsLinesEffect = "solid" | "blink" | "pulse" | "chase" | "twinkle";
export type DotsLinesColorMode = "solid" | "dual" | "rainbow" | "cycle" | "single" | "palette" | "gradient";
export type DotsGenerator = "classic" | "particles" | "stamp";
export type DotsDistribution = "scatter" | "starfield" | "rain" | "cluster" | "wave";
export type DotsBlinkMode = "none" | "sync" | "twinkle" | "sparkle";

export interface DotsLinesLayerConfig {
  mode: DotsLinesMode;
  layout: DotsLinesLayout;
  count: number;
  thickness: number;
  length: number;
  spacing: number;
  direction: MoveDirection;
  speed: number;
  effect: DotsLinesEffect;
  colorMode: DotsLinesColorMode;
  bounce: boolean;
  generator: DotsGenerator;
  distribution: DotsDistribution;
  seed: number;
  sizeRandom: boolean;
  sizeMin: number;
  sizeMax: number;
  stampSize: 8 | 16;
  stampGrid: boolean[];
  stampTile: boolean;
  particleDirection: MoveDirection;
  particleSpeed: number;
  speedVariance: number;
  jitter: number;
  trail: number;
  wrap: boolean;
  blinkMode: DotsBlinkMode;
  palette: string[];
  glow: boolean;
}

export type CharacterVideoBlend = "normal" | "screen" | "lighter";

export interface CharacterVideoLayerConfig {
  source?: string;
  preset?: string;
  chromaKey: boolean;
  chromaColor: "#000000" | "#00ff00";
  chromaTolerance: number;
  brightness: number;
  contrast: number;
  saturation: number;
  silhouette: boolean;
  offsetX: number;
  offsetY: number;
  scale: number;
  speed: number;
  flipX: boolean;
  blend: CharacterVideoBlend;
}
