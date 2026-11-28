export const COLOR_ORDERS = ["RGB", "RBG", "GRB", "GBR", "BRG", "BGR"] as const;
export type ColorOrder = (typeof COLOR_ORDERS)[number];

/** Matrix dimensions and colour output format. */
export interface HardwareConfig {
  colorOrder: ColorOrder;
  channels: 3 | 4;
  cols: number;
  rows: number;
  showPitch: boolean;
}

export interface LayoutPreset {
  name: string;
  detail: string;
  cols: number;
  rows: number;
}

export const LAYOUT_PRESETS: LayoutPreset[] = [
  { name: "16 × 60",  detail: "960 px Strip",   cols: 16, rows: 60 },
  { name: "16 × 120", detail: "1,920 px Strip", cols: 16, rows: 120 },
  { name: "20 × 30",  detail: "600 px Matrix",  cols: 20, rows: 30 },
  { name: "32 × 64",  detail: "2,048 px Matrix", cols: 32, rows: 64 },
  { name: "48 × 96",  detail: "4,608 px Matrix", cols: 48, rows: 96 },
];

export const DEFAULT_HARDWARE: HardwareConfig = {
  colorOrder: "GRB",
  channels: 3,
  cols: 16,
  rows: 60,
  showPitch: true,
};
