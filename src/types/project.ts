import { DEFAULT_HARDWARE, type HardwareConfig } from "./hardware";
import { normalizeEmojiLayerConfig, normalizeText3D, type EmojiLayerConfig, type Text3DConfig } from "./layers";
import { getRecommendedScatterCount, type RandomScatterConfig } from "@/lib/randomScatterEngine";
import {
  createDefaultSpriteCharacterConfig, normalizeSpriteCharacterConfig, normalizeSpriteCharacterPresetId,
  type SpriteCharacterConfig,
} from "@/lib/spriteCharacterEngine";

export type BlendMode = "normal" | "add" | "lighter" | "multiply" | "screen" | "overlay" | "difference" | "max" | "behind";
export type Symmetry = "none" | "horizontal" | "vertical" | "quad";
export type LayerKind = "effect" | "math" | "text" | "media";

export type EffectId = string;

export interface EffectMeta {
  id: EffectId;
  name: string;
  glyph: string;
  group: string;
  kind: LayerKind;
  detail: string;
}

export const EFFECTS: EffectMeta[] = [
  { id: "sweep",   name: "Linear Sweep",      glyph: "⇥", group: "Motion",         kind: "effect", detail: "Single travelling bar across the matrix" },
  { id: "chase",   name: "Chase",             glyph: "⇢", group: "Motion",         kind: "effect", detail: "Repeating comet packet along the strip" },
  { id: "bounce",  name: "Bounce",            glyph: "⤡", group: "Motion",         kind: "effect", detail: "Single bouncing point source" },
  { id: "pulse",   name: "Pulse Ring",        glyph: "◉", group: "Motion",         kind: "effect", detail: "Expanding radial ring" },
  { id: "wave",    name: "Dual Sine Wave",    glyph: "∿", group: "Math & Logic",    kind: "math",   detail: "Interfering sine fields" },
  { id: "plasma",  name: "Plasma Field",      glyph: "✺", group: "Math & Logic",    kind: "math",   detail: "Multi-frequency sinusoidal plasma" },
  { id: "vortex",  name: "Polar Vortex",      glyph: "◌", group: "Math & Logic",    kind: "math",   detail: "Logarithmic spiral scanner" },
  { id: "radar",   name: "Radar Sweep",       glyph: "◔", group: "Math & Logic",    kind: "math",   detail: "Rotating angular beam" },
  { id: "ripple",  name: "Shockwave Rings",   glyph: "◎", group: "Math & Logic",    kind: "math",   detail: "Concentric distance rings" },
  { id: "bitwise", name: "Bitwise XOR",       glyph: "⊕", group: "Math & Logic",    kind: "math",   detail: "(x ^ y) mod pattern" },
  { id: "matrix",  name: "Digital Rain",      glyph: "␣", group: "Math & Logic",    kind: "math",   detail: "Falling column data stream" },
  { id: "fire",    name: "Fire / Noise",      glyph: "♨", group: "Math & Logic",    kind: "math",   detail: "Layered value-noise flame" },
  { id: "custom",  name: "Custom Expression", glyph: "ƒ", group: "Math & Logic",    kind: "math",   detail: "Safe shader expression over x,y,t,u,v,r,a" },
  { id: "rainbow", name: "Rainbow Spectrum",  glyph: "◒", group: "Patterns",        kind: "effect", detail: "Full hue cycle across the grid" },
  { id: "sparkle", name: "Sparkle / Twinkle", glyph: "✦", group: "Patterns",        kind: "effect", detail: "Hash-driven random pixel flashes" },
  { id: "media",   name: "Image / Video",     glyph: "▣", group: "Text & Media",   kind: "media",   detail: "Imported image or video frames" },
  { id: "character-video", name: "Character / Video", glyph: "♟", group: "Text & Media", kind: "media", detail: "Stackable characters, clips and offline dance presets" },
  { id: "dots-lines", name: "Dots / Lines", glyph: "•", group: "Patterns", kind: "effect", detail: "Stackable dots, lines and dashed lines layer" },
  // LEDEdit .swf Flash effects — click to import the matching .swf file (captured via Ruffle)
  { id: "swf-linear-1",   name: "Linear effect 1",   glyph: "⚡", group: "LEDEdit FX", kind: "media", detail: "LEDEdit SWF linear animation" },
  { id: "swf-linear-2",   name: "Linear effect 2",   glyph: "⚡", group: "LEDEdit FX", kind: "media", detail: "LEDEdit SWF linear animation" },
  { id: "swf-linear-3",   name: "Linear effect 3",   glyph: "⚡", group: "LEDEdit FX", kind: "media", detail: "LEDEdit SWF linear animation" },
  { id: "swf-linear-4",   name: "Linear effect 4",   glyph: "⚡", group: "LEDEdit FX", kind: "media", detail: "LEDEdit SWF linear animation" },
  { id: "swf-linear-5",   name: "Linear effect 5",   glyph: "⚡", group: "LEDEdit FX", kind: "media", detail: "LEDEdit SWF linear animation" },
  { id: "swf-linear-6",   name: "Linear effect 6",   glyph: "⚡", group: "LEDEdit FX", kind: "media", detail: "LEDEdit SWF linear animation" },
  { id: "swf-linear-7",   name: "Linear effect 7",   glyph: "⚡", group: "LEDEdit FX", kind: "media", detail: "LEDEdit SWF linear animation" },
  { id: "swf-linear-8",   name: "Linear effect 8",   glyph: "⚡", group: "LEDEdit FX", kind: "media", detail: "LEDEdit SWF linear animation" },
  { id: "swf-linear-9",   name: "Linear effect 9",   glyph: "⚡", group: "LEDEdit FX", kind: "media", detail: "LEDEdit SWF linear animation" },
  { id: "swf-linear-10",  name: "Linear effect 10",  glyph: "⚡", group: "LEDEdit FX", kind: "media", detail: "LEDEdit SWF linear animation" },
  { id: "swf-linear-11",  name: "Linear effect 11",  glyph: "⚡", group: "LEDEdit FX", kind: "media", detail: "LEDEdit SWF linear animation" },
  { id: "swf-linear-12",  name: "Linear effect 12",  glyph: "⚡", group: "LEDEdit FX", kind: "media", detail: "LEDEdit SWF linear animation" },
  { id: "swf-linear-13",  name: "Linear effect 13",  glyph: "⚡", group: "LEDEdit FX", kind: "media", detail: "LEDEdit SWF linear animation" },
  { id: "swf-linear-14",  name: "Linear effect 14",  glyph: "⚡", group: "LEDEdit FX", kind: "media", detail: "LEDEdit SWF linear animation" },
  { id: "swf-linear-15",  name: "Linear effect 15",  glyph: "⚡", group: "LEDEdit FX", kind: "media", detail: "LEDEdit SWF linear animation" },
  { id: "swf-blue-white", name: "Blue and white",    glyph: "⚡", group: "LEDEdit FX", kind: "media", detail: "LEDEdit SWF blue and white" },
  { id: "swf-blue-tail",  name: "Blue Tail",         glyph: "⚡", group: "LEDEdit FX", kind: "media", detail: "LEDEdit SWF blue tail" },
  { id: "swf-blue-yellow",name: "Blue Yellow",       glyph: "⚡", group: "LEDEdit FX", kind: "media", detail: "LEDEdit SWF blue yellow" },
  { id: "swf-blue-white-purple", name: "Blue_white_Purple", glyph: "⚡", group: "LEDEdit FX", kind: "media", detail: "LEDEdit SWF blue white purple" },
  { id: "swf-cyan-tail",  name: "Cyan Tail",         glyph: "⚡", group: "LEDEdit FX", kind: "media", detail: "LEDEdit SWF cyan tail" },
  { id: "swf-cyan-white", name: "Cyan White",        glyph: "⚡", group: "LEDEdit FX", kind: "media", detail: "LEDEdit SWF cyan white" },
  { id: "swf-green-blue-yellow", name: "Green Blue Yellow", glyph: "⚡", group: "LEDEdit FX", kind: "media", detail: "LEDEdit SWF green blue yellow" },
  { id: "swf-green-tailing", name: "Green tailing",   glyph: "⚡", group: "LEDEdit FX", kind: "media", detail: "LEDEdit SWF green tailing" },
  { id: "swf-green-white",name: "Green_White",       glyph: "⚡", group: "LEDEdit FX", kind: "media", detail: "LEDEdit SWF green white" },
  { id: "swf-green-yellow-red-white", name: "Green_Yellow_Red_ White", glyph: "⚡", group: "LEDEdit FX", kind: "media", detail: "LEDEdit SWF green yellow red white" },
  { id: "swf-red-white-purple", name: "Red and White Purple", glyph: "⚡", group: "LEDEdit FX", kind: "media", detail: "LEDEdit SWF red white purple" },
  { id: "swf-red-white-tail", name: "Red and white tail", glyph: "⚡", group: "LEDEdit FX", kind: "media", detail: "LEDEdit SWF red white tail" },
  { id: "swf-red-blue-white", name: "Red blue and white", glyph: "⚡", group: "LEDEdit FX", kind: "media", detail: "LEDEdit SWF red blue white" },
  { id: "swf-red-tail",   name: "Red Tail",          glyph: "⚡", group: "LEDEdit FX", kind: "media", detail: "LEDEdit SWF red tail" },
  { id: "swf-red-green-yellow", name: "Red_green_yellow", glyph: "⚡", group: "LEDEdit FX", kind: "media", detail: "LEDEdit SWF red green yellow" },
  { id: "swf-red-tailed", name: "Red-tailed",        glyph: "⚡", group: "LEDEdit FX", kind: "media", detail: "LEDEdit SWF red-tailed" },
  { id: "swf-yellow-white", name: "Yellow and white", glyph: "⚡", group: "LEDEdit FX", kind: "media", detail: "LEDEdit SWF yellow and white" },
  { id: "swf-yellow-tail",name: "Yellow Tail",       glyph: "⚡", group: "LEDEdit FX", kind: "media", detail: "LEDEdit SWF yellow tail" },
  { id: "swf-color-change", name: "Color change",    glyph: "⚡", group: "LEDEdit FX", kind: "media", detail: "LEDEdit SWF color change" },
  { id: "swf-color-gradient", name: "Color gradient", glyph: "⚡", group: "LEDEdit FX", kind: "media", detail: "LEDEdit SWF color gradient" },
  { id: "swf-passage",    name: "Passage",           glyph: "⚡", group: "LEDEdit FX", kind: "media", detail: "LEDEdit SWF passage" },
  { id: "swf-over-down",  name: "Down",              glyph: "⚡", group: "LEDEdit FX", kind: "media", detail: "LEDEdit SWF down scroll" },
  { id: "swf-over-left",  name: "Left",              glyph: "⚡", group: "LEDEdit FX", kind: "media", detail: "LEDEdit SWF left scroll" },
  { id: "swf-over-right", name: "Right",             glyph: "⚡", group: "LEDEdit FX", kind: "media", detail: "LEDEdit SWF right scroll" },
  { id: "swf-over-up",    name: "Up",                glyph: "⚡", group: "LEDEdit FX", kind: "media", detail: "LEDEdit SWF up scroll" },
  { id: "swf-sym-double-angle-off", name: "Double angle off", glyph: "⚡", group: "LEDEdit FX", kind: "media", detail: "LEDEdit SWF double angle off" },
  { id: "swf-sym-dual-angle-closure", name: "Dual-angle closure", glyph: "⚡", group: "LEDEdit FX", kind: "media", detail: "LEDEdit SWF dual-angle closure" },
  { id: "swf-prolif-diamond", name: "Diamond-proliferation", glyph: "⚡", group: "LEDEdit FX", kind: "media", detail: "LEDEdit SWF diamond proliferation" },
  { id: "swf-prolif-diamond-systolic", name: "Diamond-shaped systolic", glyph: "⚡", group: "LEDEdit FX", kind: "media", detail: "LEDEdit SWF diamond systolic" },
  { id: "swf-prolif-elliptical", name: "Elliptical contraction", glyph: "⚡", group: "LEDEdit FX", kind: "media", detail: "LEDEdit SWF elliptical contraction" },
  { id: "swf-prolif-oval", name: "The proliferation of oval", glyph: "⚡", group: "LEDEdit FX", kind: "media", detail: "LEDEdit SWF oval proliferation" },
];

export interface Keyframe {
  id: string;
  t: number;
  value: number;
  param: "brightness" | "speed" | "hue";
}

export interface Layer {
  id: string;
  name: string;
  kind: LayerKind;
  effect: EffectId;
  enabled: boolean;
  solo: boolean;
  mute: boolean;
  opacity?: number;
  locked?: boolean;
  color: string;
  gradient: string[];
  rainbow: boolean;
  hueShift: number;
  saturation: number;
  brightness: number;
  speed: number;
  density: number;
  scale?: number;
  angle: number;
  /** Animate Direction / Angle over time instead of holding it fixed. */
  rotate?: boolean;
  /** Sweep in degrees (360 = all angles). */
  rotateRange?: number;
  /** Rotation rate in degrees per second; negative reverses. */
  rotateSpeed?: number;
  /** Reverse at the sweep ends instead of wrapping around. */
  rotateBounce?: boolean;
  sparkleDensity: number;
  sparkleRate: number;
  trails: number;
  strobeHz: number;
  audioReactive: boolean;
  expression: string;
  text: string;
  textSize: number;
  /** Scale font with matrix height (default). Disable for a fixed pixel size. */
  textAutoFit?: boolean;
  textSpeed: number;
  mediaSrc?: string;
  /** Native width of an imported source (for .sfx scaling). Defaults to grid cols. */
  mediaSrcW?: number;
  /** Native height of an imported source. Defaults to grid rows. */
  mediaSrcH?: number;
  /** Horizontal sprite-sheet frame count; 0/undefined means a still image. */
  mediaFrames?: number;
  /** Sprite-sheet playback rate. */
  mediaFps?: number;
  /** Uniform scale of the imported frame within the grid (1 = fill). */
  mediaScale?: number;
  /** Independent vertical scale (height) of the imported frame (1 = fill). */
  mediaScaleY?: number;
  /** Horizontal offset in LED units. */
  mediaOffsetX?: number;
  /** Vertical offset in LED units. */
  mediaOffsetY?: number;
  /** Fit mode for imported sources: stretch (default), center, tile. */
  mediaFitMode?: "stretch" | "center" | "tile";
  /** Swap R/B channels (for BGR .sfx). */
  mediaChannelSwap?: boolean;
  /** Trim dead black borders from .sfx frames. */
  mediaTrimBlack?: boolean;
  /** Threshold (0-255) for trim: pixels with all channels <= this are "dead". */
  mediaTrimThreshold?: number;
  /** Crop region within each native frame (for trim). */
  mediaCropX?: number;
  mediaCropY?: number;
  mediaCropW?: number;
  mediaCropH?: number;
  /** Playback direction of an imported animation. */
  mediaDirection?: "forward" | "reverse" | "pingpong";
  /** Mirror the imported frame horizontally. */
  mediaFlipX?: boolean;
  /** Mirror the imported frame vertically. */
  mediaFlipY?: boolean;
  /** Rotation of the imported media in degrees (0-360). */
  mediaRotation?: number;
  /** Spin the imported media over time on top of mediaRotation. */
  mediaAutoRotate?: boolean;
  /** Auto-rotation rate in degrees per second; negative reverses. */
  mediaRotateSpeed?: number;
  blend: BlendMode;
  direction?: string;
  // Dots / Lines layer params
  dotsMode?: "dots" | "lines" | "dashed" | "gravity-stack";
  dotsLayout?: "grid" | "checkerboard" | "hstrips" | "vstrips" | "diag" | "border";
  dotsCount?: number;
  dotsThickness?: number;
  dotsLength?: number;
  dotsSpacing?: number;
  dotsDirection?: "up" | "down" | "left" | "right" | "diag-ul" | "diag-ur" | "diag-dl" | "diag-dr" | "expand" | "converge" | "bounce";
  dotsSpeed?: number;
  dotsEffect?: "solid" | "blink" | "pulse" | "chase" | "twinkle";
  dotsColorMode?: "solid" | "dual" | "rainbow" | "cycle" | "single" | "palette" | "gradient";
  dotsBounce?: boolean;
  // Custom dots control: procedural particles or hand-drawn stamp.
  dotsGenerator?: "classic" | "particles" | "stamp" | "gravity-stack";
  dotsDistribution?: "starfield" | "rain" | "cluster" | "wave";
  dotsSeed?: number;
  dotsSizeRandom?: boolean;
  dotsSizeMin?: number;
  dotsSizeMax?: number;
  dotsStampSize?: 8 | 16;
  dotsStamp?: boolean[];
  dotsTile?: boolean;
  dotsParticleDirection?: "up" | "down" | "left" | "right" | "diag-ul" | "diag-ur" | "diag-dl" | "diag-dr" | "radial-out" | "radial-in" | "drift";
  dotsParticleSpeed?: number;
  dotsSpeedVariance?: number;
  dotsJitter?: number;
  dotsTrail?: number;
  dotsWrap?: boolean;
  dotsBlinkMode?: "none" | "sync" | "twinkle" | "sparkle";
  dotsPalette?: string[];
  dotsGlow?: boolean;
  // Gravity Stack / Fill
  dotsGravityDirection?: "top-bottom" | "bottom-top" | "left-right" | "right-left";
  dotsGravityFill?: "all" | "wave" | "random";
  dotsGravityColorMode?: "single" | "palette" | "rainbow" | "random";
  dotsGravityOnComplete?: "cycle-hold" | "drain" | "flash";
  dotsGravityHoldFrames?: number;
  /** Independent random-scatter settings for this animation only. */
  scatter?: RandomScatterConfig;
  spriteType?: string;
  /** Dedicated per-layer 2D pixel-art sprite/flora settings. */
  spriteCharacter?: SpriteCharacterConfig;
  spriteCount?: number;
  spriteScale?: number;
  spriteSpeed?: number;
  spriteDirection?: string;
  symmetry: Symmetry;
  loop?: boolean;
  startTime: number;
  duration: number;
  fadeIn: number;
  fadeOut: number;
  fadeInEffect?: string;
  fadeOutEffect?: string;
  keyframes: Keyframe[];
  // Text layer fields
  textContent?: string;
  textFont?: string;
  textSpacing?: number;
  textX?: number;
  textY?: number;
  textDirection?: "left" | "right" | "up" | "down" | "pingpong" | "static" | "typewriter" | "wave";
  textColorMode?: "solid" | "gradientH" | "gradientV" | "rainbow" | "alt";
  textColors?: string[];
  textOutline?: boolean;
  textShadow?: boolean;
  /** Extra stroke width to keep Devanagari matras legible on small matrices. */
  textStroke?: number;
  /** 3D extrusion and motion for text/emoji layers. */
  text3d?: Text3DConfig;
  /** Horizontal pixel offset for text (LED pixels). */
  textXOffset?: number;
  /** Vertical pixel offset for text (LED pixels). */
  textYOffset?: number;
  /** Generic pixel offsets (compatibility alias). */
  xOffset?: number;
  yOffset?: number;
  /** Selected source for character-video layers. */
  characterSourceType?: "sprite" | "emoji" | "video";
  /** Emoji configuration for character-video layers. */
  emojiCharacter?: EmojiLayerConfig;
  // Media layer fields
  mediaType?: "image" | "video" | "gif" | "webm" | "avi" | "swf" | "sfx";
  // Characters / real-world video preprocessing
  mediaChromaEnabled?: boolean;
  mediaChromaColor?: string;
  mediaChromaTolerance?: number;
  mediaBrightness?: number;
  mediaContrast?: number;
  mediaSaturation?: number;
  mediaGamma?: number;
  mediaThreshold?: number;
  mediaSilhouette?: boolean;
  mediaSpeed?: number;
  mediaSmoothing?: boolean;
  // Math effect id (for mathCatalog effects) stored in effect already
  mathParams?: Record<string, number>;
}

export interface Project {
  id: string;
  name: string;
  hardware: HardwareConfig;
  fps: number;
  duration: number;
  masterBrightness: number;
  gamma: number;
  /** Global post-render sparkle overlay, applied after every layer. */
  sparkleOverlay?: boolean;
  sparkleOverlayColorMode?: "solid" | "random" | "palette";
  sparkleOverlayColor?: string;
  sparkleOverlayPalette?: string[];
  sparkleOverlayDensity?: number;
  sparkleOverlaySpeed?: number;
  layers: Layer[];
}

const uid = () => Math.random().toString(36).slice(2, 9);

/** Sparse starting stamp for the custom dot editor. */
export function makeDotsStamp(size: 8 | 16 = 8): boolean[] {
  return Array.from({ length: size * size }, (_, i) => i % 9 === 0);
}

export function makeLayer(effect: EffectId, index = 1): Layer {
  const meta = EFFECTS.find((e) => e.id === effect) ?? EFFECTS[0];
  return {
    id: uid(),
    name: `${meta.name} ${index}`,
    kind: meta.kind,
    effect,
    enabled: true,
    solo: false,
    mute: false,
    opacity: 100,
    locked: false,
    color: meta.kind === "math" ? "#38e1d4" : "#9a7cff",
    gradient: ["#38e1d4", "#9a7cff"],
    rainbow: effect === "rainbow",
    hueShift: 0,
    saturation: 100,
    brightness: 100,
    speed: 1,
    density: 1.4,
    angle: 0,
    rotate: false,
    rotateRange: 360,
    rotateSpeed: 60,
    rotateBounce: false,
    sparkleDensity: 6,
    sparkleRate: 9,
    trails: 0,
    strobeHz: 0,
    audioReactive: false,
    expression: "sin(u * 12 + t) * cos(v * 9 - t)",
    text: "TOHRAN",
    textSize: 1,
    textSpeed: 1,
    blend: effect === "character-video" ? "screen" : effect === "sweep" ? "add" : "normal",
    direction: "normal",
    dotsMode: "dots",
    dotsLayout: "grid",
    dotsCount: 8,
    dotsThickness: 2,
    dotsLength: 8,
    dotsSpacing: 4,
    dotsDirection: "right",
    dotsSpeed: 1,
    dotsEffect: "solid",
    dotsColorMode: "solid",
    dotsBounce: false,
    dotsGenerator: "particles",
    dotsDistribution: "starfield",
    dotsSeed: Math.floor(Math.random() * 1_000_000),
    dotsSizeRandom: false,
    dotsSizeMin: 1,
    dotsSizeMax: 3,
    dotsStampSize: 8,
    dotsStamp: makeDotsStamp(8),
    dotsTile: true,
    dotsParticleDirection: "down",
    dotsParticleSpeed: 30,
    dotsSpeedVariance: 20,
    dotsJitter: 0,
    dotsTrail: 0,
    dotsWrap: true,
    dotsBlinkMode: "none",
    dotsPalette: ["#ff0000", "#ffd700", "#00ff00", "#00ffff", "#ffffff"],
    dotsGlow: false,
    dotsGravityDirection: "top-bottom",
    dotsGravityFill: "all",
    dotsGravityColorMode: "palette",
    dotsGravityOnComplete: "cycle-hold",
    dotsGravityHoldFrames: 40,
    mediaType: effect === "character-video" ? "video" : undefined,
    mediaScale: 1,
    mediaScaleY: 1,
    mediaSpeed: 1,
    mediaChromaEnabled: effect === "character-video",
    mediaChromaColor: "#00ff00",
    mediaChromaTolerance: 0.35,
    mediaBrightness: 100,
    mediaContrast: 100,
    mediaSaturation: 100,
    mediaThreshold: 0,
    mediaSilhouette: false,
    mediaFlipX: false,
    spriteType: effect === "character-video" ? "bhangra-dancer" : "heart",
    spriteCharacter: effect === "character-video" ? createDefaultSpriteCharacterConfig("bhangra-dancer") : undefined,
  characterSourceType: effect === "character-video" ? "sprite" : undefined,
  emojiCharacter: effect === "character-video" ? normalizeEmojiLayerConfig(null) : undefined,
    spriteCount: 1,
    spriteScale: 1,
    spriteSpeed: 1,
    spriteDirection: "right",
    symmetry: "none",
    loop: true,
    startTime: 0,
    duration: 12,
    fadeIn: 0,
    fadeOut: 0,
    fadeInEffect: "fade",
    fadeOutEffect: "fade",
    keyframes: [],
  };
}

export function defaultProject(): Project {
  return {
    id: uid(),
    name: "Untitled Toran Show",
    hardware: { ...DEFAULT_HARDWARE },
    fps: 30,
    duration: 12,
    masterBrightness: 100,
    gamma: 2.2,
    sparkleOverlay: false,
    sparkleOverlayColorMode: "solid",
    sparkleOverlayColor: "#ffffff",
    sparkleOverlayPalette: ["#ffffff", "#ff0000", "#00ff00", "#00ffff"],
    sparkleOverlayDensity: 6,
    sparkleOverlaySpeed: 4,
    layers: [],
  };
}

/** Fill in fields added after older project files were saved. */
export function normalizeProject(project: Project): Project {
  const cols = Math.max(4, Math.min(512, Math.round(project.hardware?.cols ?? DEFAULT_HARDWARE.cols)));
  const rows = Math.max(4, Math.min(512, Math.round(project.hardware?.rows ?? DEFAULT_HARDWARE.rows)));
  const totalLeds = cols * rows;
  // Drop the removed per-line animation field from older saved files.
  const clean = { ...project } as Project & { lineAnimations?: unknown };
  delete clean.lineAnimations;
  return {
    ...clean,
    hardware: {
      colorOrder: project.hardware?.colorOrder ?? DEFAULT_HARDWARE.colorOrder,
      channels: project.hardware?.channels ?? DEFAULT_HARDWARE.channels,
      cols,
      rows,
      showPitch: project.hardware?.showPitch ?? DEFAULT_HARDWARE.showPitch,
    },
    sparkleOverlay: project.sparkleOverlay ?? false,
    sparkleOverlayColorMode: project.sparkleOverlayColorMode ?? "solid",
    sparkleOverlayColor: project.sparkleOverlayColor ?? "#ffffff",
    sparkleOverlayPalette: project.sparkleOverlayPalette?.length ? project.sparkleOverlayPalette : ["#ffffff", "#ff0000", "#00ff00", "#00ffff"],
    sparkleOverlayDensity: Math.max(1, Math.min(25, project.sparkleOverlayDensity ?? 6)),
    sparkleOverlaySpeed: Math.max(1, Math.min(10, project.sparkleOverlaySpeed ?? 4)),
    layers: project.layers.map((l) => {
      const stampSize = l.dotsStampSize === 16 ? 16 : 8;
      const sizeMin = Math.max(1, Math.min(8, Math.round(l.dotsSizeMin ?? 1)));
      const spriteCharacter = l.effect === "character-video"
        ? l.spriteCharacter
          ? normalizeSpriteCharacterConfig({ ...l.spriteCharacter, presetId: l.spriteCharacter.presetId ?? l.spriteType })
          : (() => {
              const cfg = createDefaultSpriteCharacterConfig(normalizeSpriteCharacterPresetId(l.spriteType));
              cfg.scale = Math.max(0.5, Math.min(4, l.mediaScale ?? 1));
              cfg.xOffset = Math.round(l.mediaOffsetX ?? 0);
              cfg.yOffset = Math.round(l.mediaOffsetY ?? 0);
              cfg.animSpeed = Math.max(0.25, Math.min(3, l.mediaSpeed ?? 1));
              cfg.flipX = !!l.mediaFlipX;
              return cfg;
            })()
        : undefined;
      return {
      ...l,
      sparkleDensity: l.sparkleDensity ?? 6,
      sparkleRate: l.sparkleRate ?? 9,
      rotate: l.rotate ?? false,
      rotateRange: Math.max(1, l.rotateRange ?? 360),
      rotateSpeed: l.rotateSpeed ?? 60,
      rotateBounce: l.rotateBounce ?? false,
      density: Math.max(0.1, Math.min(5, l.density ?? 1.4)),
      trails: l.trails ?? 0,
      strobeHz: l.strobeHz ?? 0,
      audioReactive: l.audioReactive ?? false,
      expression: l.expression ?? "sin(u * 12 + t) * cos(v * 9 - t)",
      text: l.text ?? "TOHRAN",
      textSize: (l.textSize ?? 1) < 6 ? 16 : (l.textSize ?? 16),
      textAutoFit: l.textAutoFit ?? true,
      textSpeed: Math.max(0.2, l.textSpeed ?? 1),
      speed: Math.max(0.2, l.speed ?? 1),
      textContent: l.textContent ?? l.text ?? "TOHRAN",
      textFont: l.textFont ?? "var(--font-noto-sans-devanagari), sans-serif",
      textSpacing: l.textSpacing ?? 1,
      textX: l.textX ?? 0,
      textY: l.textY ?? 0,
      textDirection: l.textDirection ?? "left",
      textColorMode: l.textColorMode ?? "solid",
      textColors: l.textColors ?? [l.color || "#ffffff"],
      textOutline: l.textOutline ?? false,
      textShadow: l.textShadow ?? false,
      textStroke: Math.max(0, Math.min(4, l.textStroke ?? 0)),
      text3d: normalizeText3D(l.text3d),
      textXOffset: Math.max(-Math.max(48, cols), Math.min(Math.max(48, cols), Math.round(l.textXOffset ?? l.xOffset ?? 0))),
      textYOffset: Math.max(-Math.max(48, rows), Math.min(Math.max(48, rows), Math.round(l.textYOffset ?? l.yOffset ?? 0))),
      xOffset: Math.max(-Math.max(48, cols), Math.min(Math.max(48, cols), Math.round(l.xOffset ?? l.textXOffset ?? 0))),
      yOffset: Math.max(-Math.max(48, rows), Math.min(Math.max(48, rows), Math.round(l.yOffset ?? l.textYOffset ?? 0))),
      mediaType: l.mediaType,
      mediaFrames: l.mediaFrames ?? 0,
      mediaFps: l.mediaFps ?? 12,
      mediaSpeed: Math.max(0.25, Math.min(3, l.mediaSpeed ?? 1)),
      mediaSmoothing: l.mediaSmoothing ?? true,
      mediaScale: Math.max(0.1, Math.min(3, l.mediaScale ?? 1)),
      mediaScaleY: l.mediaScaleY ?? l.mediaScale ?? 1,
      mediaOffsetX: l.mediaOffsetX ?? 0,
      mediaOffsetY: l.mediaOffsetY ?? 0,
      mediaDirection: l.mediaDirection ?? "forward",
      mediaFlipX: l.mediaFlipX ?? false,
      mediaFlipY: l.mediaFlipY ?? false,
      mediaRotation: l.mediaRotation ?? 0,
      mediaAutoRotate: l.mediaAutoRotate ?? false,
      mediaRotateSpeed: l.mediaRotateSpeed ?? 60,
      mediaSrcW: l.mediaSrcW ?? 0,
      mediaSrcH: l.mediaSrcH ?? 0,
      mediaFitMode: l.mediaFitMode ?? "stretch",
      mediaChannelSwap: l.mediaChannelSwap ?? false,
      mediaTrimBlack: l.mediaTrimBlack ?? true,
      mediaTrimThreshold: l.mediaTrimThreshold ?? 15,
      mediaChromaEnabled: l.mediaChromaEnabled ?? false,
      mediaChromaColor: l.mediaChromaColor ?? "#00ff00",
      mediaChromaTolerance: l.mediaChromaTolerance ?? 0.35,
      mediaBrightness: l.mediaBrightness ?? 100,
      mediaContrast: l.mediaContrast ?? 100,
      mediaSaturation: l.mediaSaturation ?? 100,
      mediaGamma: l.mediaGamma ?? 1,
      mediaThreshold: l.mediaThreshold ?? 0,
      mediaSilhouette: l.mediaSilhouette ?? false,
      spriteCharacter,
      characterSourceType: l.effect === "character-video"
        ? (l.characterSourceType ?? (l.mediaSrc ? "video" : "sprite"))
        : l.characterSourceType,
      emojiCharacter: l.effect === "character-video"
        ? normalizeEmojiLayerConfig(l.emojiCharacter)
        : l.emojiCharacter,
      spriteType: l.effect === "character-video"
        ? normalizeSpriteCharacterPresetId(spriteCharacter?.presetId ?? l.spriteType)
        : l.spriteType,
      dotsMode: l.dotsMode ?? "dots",
      dotsLayout: l.dotsLayout ?? "grid",
      dotsCount: l.dotsCount ?? 8,
      dotsThickness: l.dotsThickness ?? 2,
      dotsLength: l.dotsLength ?? 8,
      dotsSpacing: l.dotsSpacing ?? 4,
      dotsDirection: l.dotsDirection ?? "right",
      dotsSpeed: l.dotsSpeed ?? 1,
      dotsEffect: l.dotsEffect ?? "solid",
      dotsColorMode: l.dotsColorMode ?? "solid",
      dotsBounce: l.dotsBounce ?? false,
      // Older saved layers keep their classic grid/layout behaviour.
      dotsGenerator: l.dotsGenerator ?? "classic",
      dotsDistribution: l.dotsDistribution ?? "starfield",
      dotsSeed: Math.max(0, Math.floor(l.dotsSeed ?? 1)),
      dotsSizeRandom: l.dotsSizeRandom ?? false,
      dotsSizeMin: sizeMin,
      dotsSizeMax: Math.max(sizeMin, Math.min(8, Math.round(l.dotsSizeMax ?? 3))),
      dotsStampSize: stampSize,
      dotsStamp: Array.isArray(l.dotsStamp) && l.dotsStamp.length === stampSize * stampSize
        ? l.dotsStamp.map(Boolean) : makeDotsStamp(stampSize),
      dotsTile: l.dotsTile ?? true,
      dotsParticleDirection: l.dotsParticleDirection ?? "down",
      dotsParticleSpeed: Math.max(0, Math.min(100, l.dotsParticleSpeed ?? 30)),
      dotsSpeedVariance: Math.max(0, Math.min(100, l.dotsSpeedVariance ?? 20)),
      dotsJitter: Math.max(0, Math.min(100, l.dotsJitter ?? 0)),
      dotsTrail: Math.max(0, Math.min(20, Math.round(l.dotsTrail ?? 0))),
      dotsWrap: l.dotsWrap ?? true,
      dotsBlinkMode: l.dotsBlinkMode ?? "none",
      dotsPalette: (l.dotsPalette?.length ? l.dotsPalette.slice(0, 8) : ["#ffffff", "#ffd700", "#00ff00", "#00ffff", "#ff0000"]),
      dotsGlow: l.dotsGlow ?? false,
      dotsGravityDirection: l.dotsGravityDirection ?? "top-bottom",
      dotsGravityFill: l.dotsGravityFill ?? "all",
      dotsGravityColorMode: l.dotsGravityColorMode ?? "palette",
      dotsGravityOnComplete: l.dotsGravityOnComplete ?? "cycle-hold",
      dotsGravityHoldFrames: Math.max(20, Math.min(120, Math.round(l.dotsGravityHoldFrames ?? 40))),
      scatter: l.scatter ? {
        ...l.scatter,
        count: l.scatter.autoCount ? getRecommendedScatterCount(cols, rows)
          : Math.max(Math.min(10, totalLeds), Math.min(totalLeds, Math.round(l.scatter.count))),
        paletteColors: l.scatter.paletteColors?.length ? l.scatter.paletteColors.slice(0, 4)
          : ["#FFFFFF", "#FF0000", "#FFD700"],
        tailLength: Math.max(2, Math.min(50, Math.round(l.scatter.tailLength ?? Math.max(2, Math.round(rows * 0.15))))),
        blankAreaOnly: l.scatter.blankAreaOnly === true,
        blankPadding: Math.max(0, Math.min(8, Math.round(l.scatter.blankPadding ?? 2))),
      } : undefined,
      mediaCropX: l.mediaCropX ?? 0,
      mediaCropY: l.mediaCropY ?? 0,
      mediaCropW: l.mediaCropW ?? 0,
      mediaCropH: l.mediaCropH ?? 0,
      loop: l.loop ?? true,
      mathParams: l.mathParams ?? {},
      };
    }),
  };
}

/** Dynamic end of the sequence: latest clip end, or 0 when empty. */
export function effectiveDuration(project: Project): number {
  return Math.max(0, ...project.layers.map((l) => l.startTime + l.duration));
}

export function clampLayerTiming(layer: Layer, total: number): Layer {
  const startTime = Math.max(0, Math.min(layer.startTime, Math.max(0, total - 0.1)));
  const duration = Math.max(0.1, Math.min(layer.duration, total - startTime));
  return {
    ...layer,
    startTime,
    duration,
    fadeIn: Math.max(0, Math.min(layer.fadeIn, duration / 2)),
    fadeOut: Math.max(0, Math.min(layer.fadeOut, duration / 2)),
  };
}
