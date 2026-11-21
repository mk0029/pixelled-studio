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

/** Port/pixel limits mirror the LEDEdit 2014/2020 controller selection dialog. */
export const CONTROLLERS: ControllerSpec[] = [
  { id: "T-1000S",  family: "T-Series · SD Offline", ports: 1, pixelsPerPort: 2048, maxPixels: 2048,  link: "SD Card",        fps: 30, detail: "Single output · offline SD playback" },
  { id: "T-4000S",  family: "T-Series · SD Offline", ports: 4, pixelsPerPort: 1024, maxPixels: 4096,  link: "SD Card",        fps: 30, detail: "4 × 1024 px outputs" },
  { id: "T-8000A",  family: "T-Series · SD Offline", ports: 8, pixelsPerPort: 1024, maxPixels: 8192,  link: "SD Card",        fps: 30, detail: "8-port workhorse · 30 fps at 1024 px/port" },
  { id: "T-8000AC", family: "T-Series · SD Offline", ports: 8, pixelsPerPort: 1024, maxPixels: 8192,  link: "SD Card",        fps: 30, detail: "8-port AC · 512 px/port at 60 fps" },
  { id: "T-300K",   family: "T-Series · SD Offline", ports: 8, pixelsPerPort: 2048, maxPixels: 16384, link: "SD / Ethernet",  fps: 30, detail: "Cascadable · Art-Net style expansion" },
  { id: "T-500K",   family: "T-Series · SD Offline", ports: 8, pixelsPerPort: 2048, maxPixels: 16384, link: "SD / Ethernet",  fps: 30, detail: "Long-range cascading controller" },
  { id: "K-1000C",  family: "K-Series · Advanced",   ports: 1, pixelsPerPort: 2048, maxPixels: 2048,  link: "SD / Ethernet",  fps: 30, detail: "32 – 65,536 grey levels" },
  { id: "K-4000C",  family: "K-Series · Advanced",   ports: 4, pixelsPerPort: 1024, maxPixels: 4096,  link: "SD / Ethernet",  fps: 30, detail: "4 outputs · advanced grey-scale" },
  { id: "K-8000C",  family: "K-Series · Advanced",   ports: 8, pixelsPerPort: 1024, maxPixels: 8192,  link: "SD / Ethernet",  fps: 30, detail: "8 outputs · advanced grey-scale" },
  { id: "H801TC",   family: "H-Series",     ports: 2, pixelsPerPort: 16384, maxPixels: 32768, link: "Art-Net / DMX",  fps: 60, detail: "Art-Net / DMX-SPI bridge · high capacity" },
  { id: "H802RA",   family: "H-Series",     ports: 2, pixelsPerPort: 16384, maxPixels: 32768, link: "Art-Net / DMX",  fps: 60, detail: "Dual-output DMX-SPI receiver · high capacity" },
  { id: "ESP32-WLED", family: "H-Series",   ports: 8, pixelsPerPort: 2048, maxPixels: 16384, link: "WiFi / SPI",     fps: 60, detail: "Configurable 1–8 outputs · 60 fps" },
];

export interface ChipsetSpec {
  id: string;
  name: string;
  channels: 3 | 4;
  protocol: string;
  detail: string;
}

export const CHIPSETS: ChipsetSpec[] = [
  { id: "WS2811",   name: "WS2811",   channels: 3, protocol: "800 kHz", detail: "Classic 3-channel LED driver" },
  { id: "WS2812B",  name: "WS2812B",  channels: 3, protocol: "800 kHz", detail: "Integrated RGB · GRB order" },
  { id: "UCS1903",  name: "UCS1903",  channels: 3, protocol: "800 kHz", detail: "Common facade/toran driver" },
  { id: "TM1804",   name: "TM1804",   channels: 3, protocol: "800 kHz", detail: "Legacy 3-channel" },
  { id: "TM1812",   name: "TM1812",   channels: 3, protocol: "800 kHz", detail: "12-channel variant" },
  { id: "SM16703",  name: "SM16703",  channels: 3, protocol: "800 kHz", detail: "Cost-reduced RGB driver" },
  { id: "SK6812",   name: "SK6812 RGBW", channels: 4, protocol: "800 kHz", detail: "4-channel RGBW string" },
  { id: "DMX512",   name: "DMX512",   channels: 3, protocol: "250 kbps", detail: "512-channel universe · RGB triplets" },
];

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
