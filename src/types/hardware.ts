export type ControllerFamily = "T-Series · SD Offline" | "K-Series · Advanced" | "H-Series";

export interface ControllerSpec {
  id: string;
  family: ControllerFamily;
  ports: number;
  pixelsPerPort: number;
  maxPixels: number;
  link: string;
  fps: number;
  detail: string;
}

import { CONTROLLERS } from "@/config/hardware/registry";
export { CONTROLLERS };

export interface ChipsetSpec {
  id: string;
  name: string;
  channels: 3 | 4;
  protocol: string;
  detail: string;
}

import { CHIPSETS } from "@/config/hardware/registry";
export { CHIPSETS };

export const COLOR_ORDERS = ["RGB", "RBG", "GRB", "GBR", "BRG", "BGR"] as const;
export type ColorOrder = (typeof COLOR_ORDERS)[number];

export const START_CORNERS = ["top-left", "top-right", "bottom-left", "bottom-right"] as const;
export type StartCorner = (typeof START_CORNERS)[number];

export const ROUTINGS = ["vertical-snake", "vertical-progressive", "horizontal-snake", "horizontal-progressive"] as const;
export type RoutingPattern = (typeof ROUTINGS)[number];

export interface HardwareConfig {
  controllerId: string;
  chipsetId: string;
  colorOrder: ColorOrder;
  cols: number;
  rows: number;
  startCorner: StartCorner;
  routing: RoutingPattern;
  activePorts: number;
  /** z = one continuous daisy-chain path across ports; parallel = each port restarts at its own corner. */
  portChain: "z" | "parallel";
  showZLinks: boolean;
  showWiring: boolean;
  showIndices: boolean;
  showPitch: boolean;
  layoutType?: "matrix" | "toran" | "roundFrame" | "strip";
  layoutParams?: Record<string, number | string>;
}

export interface LayoutPreset {
  name: string;
  detail: string;
  cols: number;
  rows: number;
}

export const LAYOUT_PRESETS: LayoutPreset[] = [
  { name: "30 × 8",   detail: "240 px Border",  cols: 30, rows: 8 },
  { name: "30 × 20",  detail: "600 px Toran",   cols: 30, rows: 20 },
  { name: "50 × 30",  detail: "1,500 px Facade", cols: 50, rows: 30 },
  { name: "64 × 32",  detail: "2,048 px Matrix", cols: 64, rows: 32 },
  { name: "64 × 64",  detail: "4,096 px Panel", cols: 64, rows: 64 },
  { name: "100 × 100", detail: "10,000 px Matrix", cols: 100, rows: 100 },
  { name: "40 × 24",  detail: "960 px Facade",  cols: 40, rows: 24 },
  { name: "16 × 16",  detail: "256 px Matrix",  cols: 16, rows: 16 },
];

export const DEFAULT_HARDWARE: HardwareConfig = {
  controllerId: "T-8000AC",
  chipsetId: "WS2812B",
  colorOrder: "GRB",
  cols: 30,
  rows: 20,
  startCorner: "top-left",
  routing: "vertical-snake",
  activePorts: 8,
  portChain: "z",
  showZLinks: true,
  showWiring: true,
  showIndices: false,
  showPitch: true,
};

export function getController(id: string): ControllerSpec {
  return CONTROLLERS.find((c) => c.id === id) ?? CONTROLLERS[3];
}

export function getChipset(id: string): ChipsetSpec {
  return CHIPSETS.find((c) => c.id === id) ?? CHIPSETS[0];
}
