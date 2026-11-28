/** Public layer configs. They bridge onto the flat fields stored in projects. */

export type DotsLinesMode = "dots" | "lines" | "dashed" | "gravity-stack";
export type DotsLinesLayout = "grid" | "checkerboard" | "hstrips" | "vstrips" | "diag" | "border";
export type MoveDirection =
  | "up" | "down" | "left" | "right"
  | "diag-ul" | "diag-ur" | "diag-dl" | "diag-dr"
  | "expand" | "converge" | "bounce"
  | "radial-out" | "radial-in" | "drift";

export type DotsLinesEffect = "solid" | "blink" | "pulse" | "chase" | "twinkle";
export type DotsLinesColorMode = "solid" | "dual" | "rainbow" | "cycle" | "single" | "palette" | "gradient";
export type DotsGenerator = "classic" | "particles" | "stamp" | "gravity-stack";
export type DotsDistribution = "starfield" | "rain" | "cluster" | "wave";
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
  gravityDirection: "top-bottom" | "bottom-top" | "left-right" | "right-left";
  gravityFill: "all" | "wave" | "random";
  gravityColorMode: "single" | "palette" | "rainbow" | "random";
  gravityOnComplete: "cycle-hold" | "drain" | "flash";
  gravityHoldFrames: number;
}

/** Global post-render overlay; never stored per layer. */
export interface SparkleOverlayConfig {
  enabled: boolean;
  colorMode: "solid" | "random" | "palette";
  color: string;
  palette: string[];
  /** Percentage of LEDs lit at any instant (1–25). */
  density: number;
  /** Twinkle speed (1–10). */
  speed: number;
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

export type Text3DStyle = "block-extrude" | "shaded-bevel" | "neon-shadow" | "rainbow-depth";
export type Text3DMotion = "none" | "3d-spin-x" | "3d-tilt-swing" | "3d-depth-pulse" | "3d-wave";

export interface Text3DConfig {
  enabled: boolean;
  style: Text3DStyle;
  depth: number;
  angleDeg: number;
  extrudeColor: string;
  autoDarken: boolean;
  separatorStroke: boolean;
  motion: Text3DMotion;
  motionSpeed: number;
}

export const DEFAULT_TEXT_3D: Text3DConfig = {
  enabled: false,
  style: "block-extrude",
  depth: 6,
  angleDeg: 135,
  extrudeColor: "#111827",
  autoDarken: true,
  separatorStroke: true,
  motion: "none",
  motionSpeed: 40,
};

export type EmojiMoveDirection =
  | "fixed-spot"
  | "bounce-xy"
  | "bounce-x"
  | "bounce-y"
  | "bounce-local"
  | "up"
  | "down"
  | "left"
  | "right"
  | "diag-ul"
  | "diag-ur"
  | "diag-dl"
  | "diag-dr"
  | "float-drift";

export type EmojiFlickerMode = "none" | "blink" | "candle-flicker" | "strobe" | "pulse";

export interface EmojiItemConfig {
  id: string;
  label: string;
  sourceType: "unicode" | "gif";
  emoji: string;
  gifUrl?: string;
  gifFrameCount?: number;
  gifFps?: number;
  chromaKeyEnabled?: boolean;
  chromaKeyColor?: string;
  chromaTolerance?: number;
  x: number;
  y: number;
  scale: number;
  rotationDeg: number;
  flipX: boolean;
  direction: EmojiMoveDirection;
  speed: number;
  bounceRadius: number;
  opacity: number;
  flickerMode: EmojiFlickerMode;
  flickerSpeed: number;
  flickerIntensity: number;
}

export interface EmojiLayerConfig {
  items: EmojiItemConfig[];
  selectedItemId: string;
  globalScaleMult: number;
  globalSpeedMult: number;
  clickCanvasToPlace: boolean;
  seed: number;
}

export const DEFAULT_EMOJI_ITEM: EmojiItemConfig = {
  id: "emoji-1",
  label: "Emoji 1",
  sourceType: "unicode",
  emoji: "🪔",
  gifFps: 12,
  chromaKeyEnabled: false,
  chromaKeyColor: "#000000",
  chromaTolerance: 25,
  x: 0,
  y: 0,
  scale: 1,
  rotationDeg: 0,
  flipX: false,
  direction: "fixed-spot",
  speed: 50,
  bounceRadius: 8,
  opacity: 1,
  flickerMode: "none",
  flickerSpeed: 50,
  flickerIntensity: 50,
};

export const DEFAULT_EMOJI_LAYER: EmojiLayerConfig = {
  items: [{ ...DEFAULT_EMOJI_ITEM }],
  selectedItemId: "emoji-1",
  globalScaleMult: 1,
  globalSpeedMult: 1,
  clickCanvasToPlace: false,
  seed: 1,
};

const EMOJI_MOVE_DIRECTIONS: EmojiMoveDirection[] = ["fixed-spot","bounce-xy","bounce-x","bounce-y","bounce-local","up","down","left","right","diag-ul","diag-ur","diag-dl","diag-dr","float-drift"];
const EMOJI_FLICKER_MODES: EmojiFlickerMode[] = ["none","blink","candle-flicker","strobe","pulse"];

export function normalizeEmojiItem(value?: Partial<EmojiItemConfig> | null, index = 0): EmojiItemConfig {
  if (!value) return { ...DEFAULT_EMOJI_ITEM, id: `emoji-${index + 1}`, label: `Emoji ${index + 1}` };
  const direction = EMOJI_MOVE_DIRECTIONS.includes(value.direction as EmojiMoveDirection) ? value.direction as EmojiMoveDirection : DEFAULT_EMOJI_ITEM.direction;
  const flickerMode = EMOJI_FLICKER_MODES.includes(value.flickerMode as EmojiFlickerMode) ? value.flickerMode as EmojiFlickerMode : DEFAULT_EMOJI_ITEM.flickerMode;
  return {
    id: typeof value.id === "string" && value.id.trim() ? value.id.trim() : `emoji-${index + 1}`,
    label: typeof value.label === "string" && value.label.trim() ? value.label.trim() : `Emoji ${index + 1}`,
    sourceType: value.sourceType === "gif" ? "gif" : "unicode",
    emoji: typeof value.emoji === "string" && value.emoji.trim() ? value.emoji.trim().slice(0, 8) : DEFAULT_EMOJI_ITEM.emoji,
    gifUrl: typeof value.gifUrl === "string" ? value.gifUrl : undefined,
    gifFrameCount: value.gifFrameCount ? Math.max(1, Math.round(value.gifFrameCount)) : undefined,
    gifFps: Math.max(1, Math.min(60, Math.round(value.gifFps ?? DEFAULT_EMOJI_ITEM.gifFps ?? 12))),
    chromaKeyEnabled: value.chromaKeyEnabled ?? DEFAULT_EMOJI_ITEM.chromaKeyEnabled,
    chromaKeyColor: typeof value.chromaKeyColor === "string" ? value.chromaKeyColor : DEFAULT_EMOJI_ITEM.chromaKeyColor,
    chromaTolerance: Math.max(0, Math.min(100, Math.round(value.chromaTolerance ?? DEFAULT_EMOJI_ITEM.chromaTolerance ?? 25))),
    x: Math.round(value.x ?? DEFAULT_EMOJI_ITEM.x),
    y: Math.round(value.y ?? DEFAULT_EMOJI_ITEM.y),
    scale: Math.max(0.25, Math.min(4, value.scale ?? DEFAULT_EMOJI_ITEM.scale)),
    rotationDeg: Math.max(-180, Math.min(180, Math.round(value.rotationDeg ?? DEFAULT_EMOJI_ITEM.rotationDeg))),
    flipX: value.flipX ?? DEFAULT_EMOJI_ITEM.flipX,
    direction,
    speed: Math.max(0, Math.min(100, Math.round(value.speed ?? DEFAULT_EMOJI_ITEM.speed))),
    bounceRadius: Math.max(2, Math.min(32, Math.round(value.bounceRadius ?? DEFAULT_EMOJI_ITEM.bounceRadius))),
    opacity: Math.max(0.1, Math.min(1, value.opacity ?? DEFAULT_EMOJI_ITEM.opacity)),
    flickerMode,
    flickerSpeed: Math.max(0, Math.min(100, Math.round(value.flickerSpeed ?? DEFAULT_EMOJI_ITEM.flickerSpeed))),
    flickerIntensity: Math.max(0, Math.min(100, Math.round(value.flickerIntensity ?? DEFAULT_EMOJI_ITEM.flickerIntensity))),
  };
}

export function normalizeEmojiLayerConfig(value?: Partial<EmojiLayerConfig> | null): EmojiLayerConfig {
  if (!value) return { ...DEFAULT_EMOJI_LAYER };
  let rawItems: any = value.items;
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    const legacy = value as any;
    if (legacy && (legacy.selectedEmoji || legacy.emoji)) {
      rawItems = [{
        id: "emoji-1",
        label: "Emoji 1",
        sourceType: "unicode",
        emoji: legacy.selectedEmoji ?? legacy.emoji,
        x: legacy.xOffset ?? legacy.x ?? 0,
        y: legacy.yOffset ?? legacy.y ?? 0,
        scale: legacy.scale,
        direction: legacy.direction === "auto-locations" ? "fixed-spot" : legacy.direction,
        speed: legacy.speed,
        flickerMode: legacy.flickerMode,
        flickerSpeed: legacy.flickerSpeed,
        flickerIntensity: legacy.flickerIntensity,
        opacity: legacy.opacity,
        rotationDeg: legacy.rotationDeg,
        flipX: legacy.flipX,
        bounceRadius: legacy.bounceRadius,
      }];
    } else {
      rawItems = [{ ...DEFAULT_EMOJI_ITEM }];
    }
  }
  const items = (rawItems as any[]).map((item, index) => normalizeEmojiItem(item, index));
  const seen = new Set<string>();
  items.forEach((item, index) => {
    if (seen.has(item.id)) {
      item.id = `${item.id}-${index + 1}`;
    }
    seen.add(item.id);
  });
  const selectedItemId = items.some((item) => item.id === value.selectedItemId) ? value.selectedItemId! : items[0].id;
  return {
    items,
    selectedItemId,
    globalScaleMult: Math.max(0.25, Math.min(4, value.globalScaleMult ?? DEFAULT_EMOJI_LAYER.globalScaleMult)),
    globalSpeedMult: Math.max(0.25, Math.min(4, value.globalSpeedMult ?? DEFAULT_EMOJI_LAYER.globalSpeedMult)),
    clickCanvasToPlace: value.clickCanvasToPlace ?? DEFAULT_EMOJI_LAYER.clickCanvasToPlace,
    seed: Math.round(value.seed ?? DEFAULT_EMOJI_LAYER.seed) >>> 0,
  };
}

export interface TextLayerConfig {
  xOffset?: number;
  yOffset?: number;
}

const TEXT_3D_STYLES: Text3DStyle[] = ["block-extrude", "shaded-bevel", "neon-shadow", "rainbow-depth"];
const TEXT_3D_MOTIONS: Text3DMotion[] = ["none", "3d-spin-x", "3d-tilt-swing", "3d-depth-pulse", "3d-wave"];

/** Keeps saved text-3D settings inside supported ranges at the import boundary. */
export function normalizeText3D(value?: Partial<Text3DConfig> | null): Text3DConfig {
  if (!value) return { ...DEFAULT_TEXT_3D };
  const style = TEXT_3D_STYLES.includes(value.style as Text3DStyle) ? value.style as Text3DStyle : DEFAULT_TEXT_3D.style;
  const motion = TEXT_3D_MOTIONS.includes(value.motion as Text3DMotion) ? value.motion as Text3DMotion : DEFAULT_TEXT_3D.motion;
  return {
    enabled: Boolean(value.enabled ?? DEFAULT_TEXT_3D.enabled),
    style,
    depth: Math.max(1, Math.min(14, Math.round(value.depth ?? DEFAULT_TEXT_3D.depth))),
    angleDeg: ((Math.round(value.angleDeg ?? DEFAULT_TEXT_3D.angleDeg) % 360) + 360) % 360,
    extrudeColor: typeof value.extrudeColor === "string" && /^#[0-9a-f]{6}$/i.test(value.extrudeColor)
      ? value.extrudeColor : DEFAULT_TEXT_3D.extrudeColor,
    autoDarken: value.autoDarken ?? DEFAULT_TEXT_3D.autoDarken,
    separatorStroke: value.separatorStroke ?? DEFAULT_TEXT_3D.separatorStroke,
    motion,
    motionSpeed: Math.max(0, Math.min(100, Math.round(value.motionSpeed ?? DEFAULT_TEXT_3D.motionSpeed))),
  };
}
