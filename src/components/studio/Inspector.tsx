"use client";

import { useEffect, useRef, useState } from "react";
import type { BlendMode, Layer, Project, Symmetry } from "@/types/project";
import { EFFECTS, makeDotsStamp } from "@/types/project";
import { validateExpression } from "@/engine/expression";
import { audioStore, startAudio, stopAudio } from "@/engine/audio";
import { Icon } from "./icons";
import { FONT_FAMILIES } from "@/engine/fontFamilies";
import { normalizeText3D } from "@/types/layers";
import RandomScatterPanel from "./panels/RandomScatterPanel";
import EmojiPicker from "./panels/EmojiPicker";
import Text3DControls from "./panels/Text3DControls";

interface Props {
  project: Project;
  layer: Layer | null;
  time: number;
  onLayer: (patch: Partial<Layer>) => void;
  onAction: (action: "delete" | "duplicate" | "split" | "up" | "down") => void;
  onGamma: (v: number) => void;
  onProject: (patch: Partial<Project>) => void;
  onAddKeyframe: () => void;
  width?: number | string;
  /** Render inside a parent scroll container: no own header or scrollbar. */
  embedded?: boolean;
}

const ANGLES = [["↑", 0], ["↗", 45], ["→", 90], ["↘", 135], ["↓", 180], ["↙", 225], ["←", 270], ["↖", 315]] as const;
const card = "space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-3.5";
const EXPR_PRESETS: [string, string][] = [
  ["Plasma", "sin(u * 12 + t) * cos(v * 9 - t)"],
  ["Sweep", "max(0, 1 - abs(u - fract(t * 0.28)) * 9)"],
  ["Rings", "max(0, 1 - abs(r * 2 - fract(t * 0.4)) * 9)"],
  ["Checker", "mod(floor(u * 8) + floor(v * 8), 2)"],
  ["Noise", "step(0.5, hash(floor(x * 1.7), floor(y * 1.7) + floor(t * 9)))"],
  ["Spiral", "wave(atan2(v - 0.5, u - 0.5) / pi * 3 + r * 8 - t)"],
];

type StampPreset = "sparse" | "diamond" | "diagonal" | "clear" | "invert";

function resizeStamp(bits: boolean[], from: 8 | 16, to: 8 | 16): boolean[] {
  const next = Array<boolean>(to * to).fill(false);
  for (let y = 0; y < from; y++) {
    for (let x = 0; x < from; x++) {
      if (!bits[y * from + x]) continue;
      if (to > from) {
        for (let dy = 0; dy < 2; dy++) {
          for (let dx = 0; dx < 2; dx++) next[(y * 2 + dy) * to + x * 2 + dx] = true;
        }
      } else {
        next[Math.floor(y / 2) * to + Math.floor(x / 2)] = true;
      }
    }
  }
  return next;
}

function stampPreset(preset: StampPreset, size: 8 | 16, bits: boolean[]): boolean[] {
  const next = Array<boolean>(size * size).fill(false);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      if (preset === "sparse") next[i] = i % 7 === 0;
      else if (preset === "diamond") next[i] = Math.abs(x - (size - 1) / 2) + Math.abs(y - (size - 1) / 2) <= size / 3;
      else if (preset === "diagonal") next[i] = x === y || x + y === size - 1;
      else if (preset === "invert") next[i] = !bits[i];
    }
  }
  return next;
}

function DotsStampEditor({ size, bits, onPatch }: { size: 8 | 16; bits: boolean[]; onPatch: (bits: boolean[]) => void }) {
  const painting = useRef<boolean | null>(null);
  useEffect(() => {
    const stop = () => { painting.current = null; };
    window.addEventListener("pointerup", stop);
    return () => window.removeEventListener("pointerup", stop);
  }, []);

  const setCell = (i: number, value: boolean) => {
    if (bits[i] === value) return;
    const next = [...bits];
    next[i] = value;
    onPatch(next);
  };

  return (
    <div className="inline-grid w-44 gap-[2px] rounded border border-zinc-700 bg-zinc-950 p-1 select-none"
      style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}>
      {bits.map((on, i) => (
        <button key={i} type="button" aria-label={`Stamp ${i % size + 1}, ${Math.floor(i / size) + 1}`}
          aria-pressed={on}
          className={`aspect-square rounded-[2px] border ${on ? "border-teal-200 bg-teal-300" : "border-zinc-800 bg-zinc-900 hover:bg-zinc-800"}`}
          onPointerDown={(e) => {
            if (e.button !== 0 && e.button !== 2) return;
            e.preventDefault();
            const value = e.button === 2 ? false : !on;
            painting.current = value;
            setCell(i, value);
          }}
          onPointerEnter={(e) => {
            if (painting.current === null || !(e.buttons & 1)) return;
            setCell(i, painting.current);
          }}
          onContextMenu={(e) => e.preventDefault()} />
      ))}
    </div>
  );
}

export default function Inspector(p: Props) {
  const l = p.layer;
  const [micOn, setMicOn] = useState(audioStore.enabled);
  const [micBusy, setMicBusy] = useState(false);
  const [micError, setMicError] = useState("");
  const [fontScript, setFontScript] = useState<string>("all");
  const textInputRef = useRef<HTMLInputElement | null>(null);
  const exprError = l?.effect === "custom" ? validateExpression(l.expression) : null;
  const dotsGenerator = l?.dotsMode === "gravity-stack" ? "gravity-stack" : l?.dotsGenerator ?? "classic";
  const stampSize: 8 | 16 = l?.dotsStampSize === 16 ? 16 : 8;
  const stampBits = l?.dotsStamp && l.dotsStamp.length === stampSize * stampSize
    ? l.dotsStamp : makeDotsStamp(stampSize);
  const dotsPalette = l?.dotsPalette?.length ? l.dotsPalette : ["#ffffff", "#9a7cff", "#38e1d4", "#ff5c8a"];

  const toggleMic = async () => {
    if (audioStore.enabled) {
      stopAudio();
      setMicOn(false);
      return;
    }
    setMicBusy(true);
    setMicError("");
    await startAudio();
    setMicOn(audioStore.enabled);
    setMicError(audioStore.error);
    setMicBusy(false);
  };
  const slider = (label: string, value: number, min: number, max: number, step: number,
    onChange: (v: number) => void, suffix = "") => (
    <label className="block">
      <div className="mb-1 flex items-center justify-between">
        <span className="label">{label}</span>
        <span className="font-mono text-[10px] text-zinc-400">{value.toFixed(step < 1 ? 2 : 0)}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} className="w-full"
        onChange={(e) => onChange(+e.target.value)} />
    </label>
  );
  const angleChips = (value: number, onChange: (v: number) => void) => (
    <div className="flex flex-wrap gap-1">
      {ANGLES.map(([g, a]) => (
        <button key={g} className={`chip w-8 ${value === a ? "chip-active" : ""}`}
          onClick={() => onChange(a)}>{g}</button>
      ))}
    </div>
  );

  return (
    <aside style={p.width ? { width: p.width } : undefined}
      className={p.width
        ? "flex min-w-0 shrink-0 flex-col border-l border-white/10 bg-[#0B0F17]"
        : "flex min-w-0 w-full flex-col"}>
      {!p.embedded && (
        <div className="flex h-9 shrink-0 items-center gap-2 border-b border-white/10 px-3">
          <Icon name="sliders" size={14} />
          <span className="label">Layer &amp; post-process inspector</span>
        </div>
      )}
      <div className={p.embedded ? "space-y-3 p-3" : "min-h-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden overscroll-contain scroll-pb-4 p-3"}>
        {!l ? (
          <div className="rounded-lg border border-dashed border-zinc-700 p-6 text-center text-[11px] text-zinc-500">
            Select a clip in the timeline or add a generator from the left dock.
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <input type="color" value={l.color} onChange={(e) => p.onLayer({ color: e.target.value })} />
              <input className="field" value={l.name} onChange={(e) => p.onLayer({ name: e.target.value })} />
            </div>
            <div className="rounded border border-zinc-800 bg-zinc-900/60 px-2 py-1.5 text-[10px] text-zinc-500">
              {(EFFECTS.find((e) => e.id === l.effect)?.name) ?? (l.effect === "text" ? "Text Layer" : l.effect)} · {l.kind} layer
            </div>

            <section className={card}>
              <div className="label mb-2">Clip timing</div>
              <div className="grid grid-cols-2 gap-2">
                {([["Start (s)", "startTime"], ["Duration (s)", "duration"], ["Fade In (s)", "fadeIn"], ["Fade Out (s)", "fadeOut"]] as const).map(([label, key]) => (
                  <label key={key}>
                    <div className="mb-1 text-[9px] uppercase tracking-wider text-zinc-500">{label}</div>
                    <input type="number" min="0" max={p.project.duration} step="0.1" className="field font-mono"
                      value={+l[key].toFixed(2)} onChange={(e) => p.onLayer({ [key]: Math.max(0, +e.target.value || 0) } as Partial<Layer>)} />
                  </label>
                ))}
              </div>
              <label className="mt-2 flex items-center gap-2 text-[11px] text-zinc-400">
                <input type="checkbox" checked={l.loop !== false} onChange={(e) => p.onLayer({ loop: e.target.checked })} />
                Loop animation (repeat when it leaves the screen)
              </label>
            </section>

            <section className={card}>
              {slider("Brightness", l.brightness, 0, 100, 1, (v) => p.onLayer({ brightness: v }), "%")}
              {l.effect !== "media" && l.effect !== "dots-lines" && slider("Speed", l.speed < 0.2 ? 0.2 : l.speed, 0.2, 3, 0.1, (v) => p.onLayer({ speed: Math.max(0.2, v) }), "×")}
              {l.effect !== "media" && l.effect !== "dots-lines" && slider("Density / Scale", l.scale ?? l.density, 0.1, 5, 0.1, (v) => p.onLayer({ scale: Math.max(0.1, Math.min(5, v)) }), "×")}
              {l.effect !== "media" && l.effect !== "dots-lines" && slider("Direction / Angle", l.angle, 0, 360, 1, (v) => p.onLayer({ angle: v }), "°")}
              {l.effect !== "media" && l.effect !== "dots-lines" && angleChips(l.angle, (v) => p.onLayer({ angle: v }))}
              {l.effect !== "media" && l.effect !== "dots-lines" && (
                <>
                  <label className="mt-1 flex items-center gap-2 text-[11px] text-zinc-400">
                    <input type="checkbox" checked={!!l.rotate} onChange={(e) => p.onLayer({ rotate: e.target.checked })} />
                    Rotate (animate angle over time)
                  </label>
                  {l.rotate && (
                    <div className="space-y-3 rounded-lg border border-teal-500/20 bg-teal-500/[.04] p-2">
                      <button className={`chip w-full ${l.rotateRange === 360 ? "chip-active" : ""}`}
                        onClick={() => p.onLayer({ rotateRange: 360 })}>All angles (360°)</button>
                      {slider("Sweep range", l.rotateRange ?? 360, 1, 360, 1, (v) => p.onLayer({ rotateRange: v }), "°")}
                      {slider("Rotation speed", l.rotateSpeed ?? 60, -360, 360, 5, (v) => p.onLayer({ rotateSpeed: v }), "°/s")}
                      <label className="flex items-center gap-2 text-[11px] text-zinc-400">
                        <input type="checkbox" checked={!!l.rotateBounce} onChange={(e) => p.onLayer({ rotateBounce: e.target.checked })} />
                        Bounce (reverse at ends, continuous)
                      </label>
                    </div>
                  )}
                </>
              )}
            </section>

            {l.effect === "custom" && (
              <section className={card}>
                <div className="flex items-center justify-between">
                  <span className="label">Expression shader</span>
                  <span className={`font-mono text-[9px] ${exprError ? "text-red-400" : "text-teal-400"}`}>
                    {exprError ? "error" : "valid"}
                  </span>
                </div>
                <textarea className="field h-16 resize-y font-mono text-[10px]" spellCheck={false}
                  value={l.expression} onChange={(e) => p.onLayer({ expression: e.target.value })} />
                {exprError && <p className="text-[9px] leading-snug text-red-400">{exprError}</p>}
                <div className="flex flex-wrap gap-1">
                  {EXPR_PRESETS.map(([name, src]) => (
                    <button key={name} className="chip" onClick={() => p.onLayer({ expression: src })}>{name}</button>
                  ))}
                </div>
                <p className="text-[9px] leading-snug text-zinc-600">
                  Vars x y nx ny u v t i r a d w h pi · sin cos abs min max floor pow sqrt clamp mod step lerp hash if sat tri wave
                </p>
              </section>
            )}

            {l.effect === "media" && (
              <section className={card}>
                <div className="label">Media source</div>
                {l.mediaSrc ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={l.mediaSrc} alt="Imported media" className="max-h-24 w-full rounded border border-zinc-800 object-contain" />
                    <button className="btn w-full" onClick={() => p.onLayer({ mediaSrc: undefined })}>Clear source</button>
                  </>
                ) : (
                  <p className="text-[10px] leading-snug text-zinc-500">
                    No source yet. Import an image or video from the Media tab in the left dock.
                  </p>
                )}
                {l.mediaFrames ? (
                  <p className="text-[9px] leading-snug text-zinc-600">
                    {l.mediaFrames} frames · {l.mediaFps ?? 12} fps · loops across the whole grid
                  </p>
                ) : null}
              </section>
            )}

            {(l.effect === "media" || l.effect === "character-video") && l.mediaSrc ? (
              <section className={card}>
                <div className="label">Transform</div>
                {slider("Width", l.mediaScale ?? 1, 0.1, 2, 0.05, (v) => p.onLayer({ mediaScale: v }), "×")}
                {slider("Height", l.mediaScaleY ?? l.mediaScale ?? 1, 0.1, 2, 0.05, (v) => p.onLayer({ mediaScaleY: v }), "×")}
                {slider("Offset X", l.mediaOffsetX ?? 0, -Math.max(1, p.project.hardware.cols), Math.max(1, p.project.hardware.cols), 1, (v) => p.onLayer({ mediaOffsetX: v }), " px")}
                {slider("Offset Y", l.mediaOffsetY ?? 0, -Math.max(1, p.project.hardware.rows), Math.max(1, p.project.hardware.rows), 1, (v) => p.onLayer({ mediaOffsetY: v }), " px")}
                {slider("Rotation", l.mediaRotation ?? 0, 0, 360, 1, (v) => p.onLayer({ mediaRotation: v }), "°")}
                <label className="flex items-center gap-2 text-[11px] text-zinc-400">
                  <input type="checkbox" checked={!!l.mediaAutoRotate} onChange={(e) => p.onLayer({ mediaAutoRotate: e.target.checked })} />
                  Auto-rotate (spin over time)
                </label>
                {l.mediaAutoRotate && slider("Auto-rotate speed", l.mediaRotateSpeed ?? 60, -360, 360, 5, (v) => p.onLayer({ mediaRotateSpeed: v }), "°/s")}
                <div className="flex flex-wrap gap-2">
                  <label className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                    <input type="checkbox" checked={l.mediaFlipX ?? false} onChange={(e) => p.onLayer({ mediaFlipX: e.target.checked })} />
                    Flip H
                  </label>
                  <label className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                    <input type="checkbox" checked={l.mediaFlipY ?? false} onChange={(e) => p.onLayer({ mediaFlipY: e.target.checked })} />
                    Flip V
                  </label>
                </div>
                <p className="text-[9px] leading-snug text-zinc-600">Width fills the grid in stretch mode; Height is adjustable. Switch to Center to resize both.</p>
              </section>
            ) : null}

            {(l.effect === "media" || l.effect === "character-video") && l.mediaSrc ? (
              <section className={card}>
                <div className="label">Fit & channels</div>
                <label className="block">
                  <div className="mb-1 label">Fit mode</div>
                  <select className="field" value={l.mediaFitMode ?? "stretch"} onChange={(e) => p.onLayer({ mediaFitMode: e.target.value as any })}>
                    <option value="stretch">Stretch to fill (full grid)</option>
                    <option value="center">Center (keep aspect)</option>
                    <option value="tile">Tile / repeat</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 text-[11px] text-zinc-400">
                  <input type="checkbox" checked={l.mediaChannelSwap ?? false} onChange={(e) => p.onLayer({ mediaChannelSwap: e.target.checked })} />
                  Swap R/B channels (BGR sources)
                </label>
                {l.mediaSrcW ? (
                  <label className="flex items-center gap-2 text-[11px] text-zinc-400">
                    <input type="checkbox" checked={l.mediaTrimBlack ?? false} onChange={(e) => p.onLayer({ mediaTrimBlack: e.target.checked })} />
                    Trim black padding
                  </label>
                ) : null}
                {l.mediaSrcW && (l.mediaTrimBlack ?? false) ? slider("Trim threshold (sum RGB)", l.mediaTrimThreshold ?? 15, 0, 60, 1, (v) => p.onLayer({ mediaTrimThreshold: v })) : null}
              </section>
            ) : null}

            {(l.effect === "media" || l.effect === "character-video") && l.mediaSrc ? (
              <section className={card}>
                <div className="label">Chroma key & matrix preprocessing</div>
                <label className="flex items-center gap-2 text-[11px] text-zinc-400">
                  <input type="checkbox" checked={l.mediaChromaEnabled ?? false} onChange={(e) => p.onLayer({ mediaChromaEnabled: e.target.checked })} />
                  Enable chroma key (background removal)
                </label>
                {l.mediaChromaEnabled && (
                  <>
                    <label className="block">
                      <div className="mb-1 label">Key color</div>
                      <input type="color" className="h-7 w-12 cursor-pointer rounded border border-zinc-700 bg-transparent" value={l.mediaChromaColor ?? "#00ff00"} onChange={(e) => p.onLayer({ mediaChromaColor: e.target.value })} />
                    </label>
                    {slider("Tolerance", l.mediaChromaTolerance ?? 0.35, 0, 1, 0.01, (v) => p.onLayer({ mediaChromaTolerance: v }))}
                  </>
                )}
                {slider("Brightness", l.mediaBrightness ?? 100, 0, 200, 1, (v) => p.onLayer({ mediaBrightness: v }), "%")}
                {slider("Contrast", l.mediaContrast ?? 100, 0, 200, 1, (v) => p.onLayer({ mediaContrast: v }), "%")}
                {slider("Saturation", l.mediaSaturation ?? 100, 0, 200, 1, (v) => p.onLayer({ mediaSaturation: v }), "%")}
                {slider("Gamma", l.mediaGamma ?? 1, 0.1, 3, 0.1, (v) => p.onLayer({ mediaGamma: v }))}
                {slider("Threshold", l.mediaThreshold ?? 0, 0, 255, 1, (v) => p.onLayer({ mediaThreshold: v }))}
                <label className="flex items-center gap-2 text-[11px] text-zinc-400">
                  <input type="checkbox" checked={l.mediaSilhouette ?? false} onChange={(e) => p.onLayer({ mediaSilhouette: e.target.checked })} />
                  Silhouette mode (threshold → black/white)
                </label>
              </section>
            ) : null}

            {l.effect === "media" && l.mediaFrames ? (
              <section className={card}>
                <div className="label">Media playback</div>
                {slider("Speed", l.mediaSpeed ?? 1, 0.1, 4, 0.1, (v) => p.onLayer({ mediaSpeed: v }), "×")}
                {slider("Frame rate", l.mediaFps ?? 12, 2, 60, 1, (v) => p.onLayer({ mediaFps: v }), " fps")}
                <label className="block">
                  <div className="mb-1 label">Direction</div>
                  <select className="field" value={l.mediaDirection ?? "forward"} onChange={(e) => p.onLayer({ mediaDirection: e.target.value as any })}>
                    <option value="forward">Forward</option>
                    <option value="reverse">Reverse</option>
                    <option value="pingpong">Ping-pong</option>
                  </select>
                </label>
              </section>
            ) : null}

            {l.effect === "media" && !l.mediaFrames && l.mediaSrc ? (
              <section className={card}>
                <div className="label">Image fit</div>
                <label className="flex items-center gap-2 text-[11px] text-zinc-400">
                  <input type="checkbox" checked={l.mediaSmoothing !== false} onChange={(e) => p.onLayer({ mediaSmoothing: e.target.checked })} />
                  Smooth (bilinear) sampling
                </label>
                <p className="text-[9px] leading-snug text-zinc-600">Still images are centred and keep their aspect ratio; toggle smoothing for pixel-art sources.</p>
              </section>
            ) : null}

            {l.effect === "dots-lines" && (
              <section className={card}>
                <div className="label">Dots / Lines layer</div>

                {(l.dotsMode === "dots" || l.dotsMode === "gravity-stack") && (
                  <section className={card}>
                    <div className="label">Dots control</div>
                    <label className="block">
                      <div className="mb-1 label">Generator</div>
                      <select className="field" value={dotsGenerator} onChange={(e) => p.onLayer({
                        dotsGenerator: e.target.value as any,
                        dotsMode: e.target.value === "gravity-stack" ? "gravity-stack" : l.dotsMode === "gravity-stack" ? "dots" : l.dotsMode,
                      })}>
                        <option value="particles">Procedural Particles</option>
                        <option value="stamp">Custom Dot Stamp</option>
                        <option value="classic">Classic Layout</option>
                        <option value="gravity-stack">Gravity Stack / Fill</option>
                      </select>
                    </label>

                    {(l.dotsGenerator === "gravity-stack" || l.dotsMode === "gravity-stack") && (
                      <>
                        <label className="block">
                          <div className="mb-1 label">Spawn edge</div>
                          <select className="field" value={l.dotsGravityDirection ?? "top-bottom"} onChange={(e) => p.onLayer({ dotsGravityDirection: e.target.value as any })}>
                            <option value="top-bottom">Top → Bottom</option><option value="bottom-top">Bottom → Top</option>
                            <option value="left-right">Left → Right</option><option value="right-left">Right → Left</option>
                          </select>
                        </label>
                        <label className="block">
                          <div className="mb-1 label">Fill pattern</div>
                          <select className="field" value={l.dotsGravityFill ?? "all"} onChange={(e) => p.onLayer({ dotsGravityFill: e.target.value as any })}>
                            <option value="all">All Lines Together</option><option value="wave">Wave / Staggered</option><option value="random">Random Rain Fill</option>
                          </select>
                        </label>
                        <label className="block">
                          <div className="mb-1 label">Per-dot color</div>
                          <select className="field" value={l.dotsGravityColorMode ?? "palette"} onChange={(e) => p.onLayer({ dotsGravityColorMode: e.target.value as any })}>
                            <option value="single">Layer Color / Gradient</option><option value="palette">Per-Dot Palette Cycle</option>
                            <option value="rainbow">Rainbow Stack</option><option value="random">Random High-Contrast</option>
                          </select>
                        </label>
                        <label className="block">
                          <div className="mb-1 label">On complete</div>
                          <select className="field" value={l.dotsGravityOnComplete ?? "cycle-hold"} onChange={(e) => p.onLayer({ dotsGravityOnComplete: e.target.value as any })}>
                            <option value="cycle-hold">Color Cycle & Hold</option><option value="drain">Drain Out (Bottom Drop)</option><option value="flash">Flash & Reset</option>
                          </select>
                        </label>
                        {slider("Drop speed", l.dotsParticleSpeed ?? 30, 5, 100, 1, (v) => p.onLayer({ dotsParticleSpeed: v }), "%")}
                        {slider("Hold frames", l.dotsGravityHoldFrames ?? 40, 20, 120, 1, (v) => p.onLayer({ dotsGravityHoldFrames: v }))}
                        <label className="flex items-center gap-2 text-[11px] text-zinc-400">
                          <input type="checkbox" checked={l.dotsBounce ?? false} onChange={(e) => p.onLayer({ dotsBounce: e.target.checked, dotsWrap: !e.target.checked })} />
                          Bounce / Ping-Pong
                        </label>
                        <div className="flex flex-wrap items-center gap-1">
                          {(l.dotsPalette ?? []).map((color, i) => (
                            <input key={i} type="color" aria-label={`Stack color ${i + 1}`} value={color} onChange={(e) => {
                              const next = [...(l.dotsPalette ?? [])];
                              next[i] = e.target.value;
                              p.onLayer({ dotsPalette: next });
                            }} className="h-6 w-7 cursor-pointer bg-transparent" />
                          ))}
                          {(l.dotsPalette?.length ?? 0) < 8 && <button className="chip" onClick={() => p.onLayer({ dotsPalette: [...(l.dotsPalette ?? []), "#ffffff"] })}>+ color</button>}
                        </div>
                      </>
                    )}

                    {dotsGenerator === "particles" && (
                      <>
                        {slider("Dot count / density", l.dotsCount ?? 80, 1, 500, 1, (v) => p.onLayer({ dotsCount: v }))}
                        <label className="block">
                          <div className="mb-1 label">Distribution</div>
                          <select className="field" value={l.dotsDistribution ?? "starfield"} onChange={(e) => p.onLayer({ dotsDistribution: e.target.value as any })}>
                            <option value="starfield">Starfield</option>
                            <option value="rain">Falling Rain</option>
                            <option value="cluster">Cluster / Swarm</option>
                            <option value="wave">Wave</option>
                          </select>
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="label flex-1">Seed {l.dotsSeed ?? 1}</span>
                          <button className="btn" onClick={() => p.onLayer({ dotsSeed: Math.floor(Math.random() * 1_000_000) })}>Randomize</button>
                        </div>
                        <label className="flex items-center gap-2 text-[11px] text-zinc-400">
                          <input type="checkbox" checked={l.dotsSizeRandom ?? false} onChange={(e) => p.onLayer({ dotsSizeRandom: e.target.checked })} />
                          Random size range
                        </label>
                        {l.dotsSizeRandom
                          ? <>
                              {slider("Min size", l.dotsSizeMin ?? 1, 1, 8, 1, (v) => p.onLayer({ dotsSizeMin: Math.min(v, l.dotsSizeMax ?? 3) }), "px")}
                              {slider("Max size", l.dotsSizeMax ?? 3, 1, 8, 1, (v) => p.onLayer({ dotsSizeMax: Math.max(v, l.dotsSizeMin ?? 1) }), "px")}
                            </>
                          : slider("Dot size", l.dotsSizeMin ?? 1, 1, 8, 1, (v) => p.onLayer({ dotsSizeMin: v, dotsSizeMax: v }), "px")}
                      </>
                    )}

                    {dotsGenerator === "stamp" && (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="label flex-1">Stamp grid</span>
                          <button className={`chip ${stampSize === 8 ? "chip-active" : ""}`} onClick={() => p.onLayer({ dotsStampSize: 8, dotsStamp: resizeStamp(stampBits, stampSize, 8) })}>8×8</button>
                          <button className={`chip ${stampSize === 16 ? "chip-active" : ""}`} onClick={() => p.onLayer({ dotsStampSize: 16, dotsStamp: resizeStamp(stampBits, stampSize, 16) })}>16×16</button>
                        </div>
                        <DotsStampEditor size={stampSize} bits={stampBits} onPatch={(bits) => p.onLayer({ dotsStamp: bits })} />
                        <div className="flex flex-wrap gap-1">
                          {(["sparse", "diamond", "diagonal", "clear", "invert"] as StampPreset[]).map((preset) => (
                            <button key={preset} className="chip" onClick={() => p.onLayer({ dotsStamp: stampPreset(preset, stampSize, stampBits) })}>{preset}</button>
                          ))}
                        </div>
                        <label className="flex items-center gap-2 text-[11px] text-zinc-400">
                          <input type="checkbox" checked={l.dotsTile ?? true} onChange={(e) => p.onLayer({ dotsTile: e.target.checked })} />
                          Tile / repeat stamp across matrix
                        </label>
                        <p className="text-[9px] leading-snug text-zinc-600">Drag to paint, right-click to erase. Off = animate one cluster.</p>
                      </>
                    )}

                    {dotsGenerator !== "classic" && dotsGenerator !== "gravity-stack" && (
                      <>
                        <label className="block">
                          <div className="mb-1 label">Direction</div>
                          <select className="field" value={l.dotsParticleDirection ?? "down"} onChange={(e) => p.onLayer({ dotsParticleDirection: e.target.value as any })}>
                            {[
                              ["up", "Up"], ["down", "Down"], ["left", "Left"], ["right", "Right"],
                              ["diag-ul", "Diagonal UL"], ["diag-ur", "Diagonal UR"],
                              ["diag-dl", "Diagonal DL"], ["diag-dr", "Diagonal DR"],
                              ["radial-out", "Radial Out (Burst)"], ["radial-in", "Radial In"], ["drift", "Float / Drift"],
                            ].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                          </select>
                        </label>
                        {slider("Speed", l.dotsParticleSpeed ?? 30, 0, 100, 1, (v) => p.onLayer({ dotsParticleSpeed: v }))}
                        {slider("Speed variance", l.dotsSpeedVariance ?? 20, 0, 100, 1, (v) => p.onLayer({ dotsSpeedVariance: v }), "%")}
                        {slider("Jitter", l.dotsJitter ?? 0, 0, 100, 1, (v) => p.onLayer({ dotsJitter: v }), "%")}
                        {slider("Trail length", l.dotsTrail ?? 0, 0, 20, 1, (v) => p.onLayer({ dotsTrail: v }), " px")}
                        <label className="flex items-center gap-2 text-[11px] text-zinc-400">
                          <input type="checkbox" checked={l.dotsWrap ?? true} onChange={(e) => p.onLayer({ dotsWrap: e.target.checked, dotsBounce: e.target.checked ? false : l.dotsBounce })} />
                          Wrap at edges (off = bounce)
                        </label>
                        <label className="flex items-center gap-2 text-[11px] text-zinc-400">
                          <input type="checkbox" checked={l.dotsBounce ?? false} onChange={(e) => p.onLayer({ dotsBounce: e.target.checked, dotsWrap: !e.target.checked })} />
                          Bounce / Ping-Pong
                        </label>
                        <label className="block">
                          <div className="mb-1 label">Blink / twinkle</div>
                          <select className="field" value={l.dotsBlinkMode ?? "none"} onChange={(e) => p.onLayer({ dotsBlinkMode: e.target.value as any })}>
                            <option value="none">None</option>
                            <option value="sync">Sync Blink</option>
                            <option value="twinkle">Random Twinkle</option>
                            <option value="sparkle">Sparkle</option>
                          </select>
                        </label>
                        <label className="block">
                          <div className="mb-1 label">Color mode</div>
                          <select className="field" value={l.dotsColorMode ?? "solid"} onChange={(e) => p.onLayer({ dotsColorMode: e.target.value as any })}>
                            <option value="solid">Single Color</option>
                            <option value="palette">Multi-Color Palette</option>
                            <option value="rainbow">Rainbow Cycle</option>
                            <option value="gradient">Position Gradient</option>
                          </select>
                        </label>
                        {l.dotsColorMode === "palette" && (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {dotsPalette.slice(0, 4).map((color, i) => (
                              <input key={i} type="color" value={color} onChange={(e) => {
                                const next = [...dotsPalette];
                                next[i] = e.target.value;
                                p.onLayer({ dotsPalette: next });
                              }} />
                            ))}
                            {dotsPalette.length < 4 && <button className="chip" onClick={() => p.onLayer({ dotsPalette: [...dotsPalette, "#ffffff"] })}>+ color</button>}
                            {dotsPalette.length > 2 && <button className="chip" onClick={() => p.onLayer({ dotsPalette: dotsPalette.slice(0, -1) })}>− color</button>}
                          </div>
                        )}
                        <label className="flex items-center gap-2 text-[11px] text-zinc-400">
                          <input type="checkbox" checked={l.dotsGlow ?? false} onChange={(e) => p.onLayer({ dotsGlow: e.target.checked })} />
                          Soft glow (off = crisp LEDs)
                        </label>
                      </>
                    )}
                  </section>
                )}

                <label className="block">
                  <div className="mb-1 label">Mode</div>
                  <select className="field" value={l.dotsMode ?? "dots"} onChange={(e) => p.onLayer({
                    dotsMode: e.target.value as any,
                    dotsGenerator: e.target.value === "gravity-stack" ? "gravity-stack" : dotsGenerator === "gravity-stack" ? "classic" : dotsGenerator,
                  })}>
                    <option value="dots">Dots</option>
                    <option value="lines">Lines</option>
                    <option value="dashed">Dashed Lines</option>
                    <option value="gravity-stack">Gravity Stack / Fill</option>
                  </select>
                </label>
                {dotsGenerator !== "gravity-stack" && (dotsGenerator === "classic" || l.dotsMode !== "dots") && (
                  <>
                <label className="block">
                  <div className="mb-1 label">Layout</div>
                  <select className="field" value={l.dotsLayout ?? "grid"} onChange={(e) => p.onLayer({ dotsLayout: e.target.value as any })}>
                    <option value="grid">Grid</option>
                    <option value="checkerboard">Checkerboard</option>
                    <option value="hstrips">Horizontal Strips</option>
                    <option value="vstrips">Vertical Strips</option>
                    <option value="diag">Diagonal Strips</option>
                    <option value="border">Border / Frame</option>
                  </select>
                </label>
                {slider("Count", l.dotsCount ?? 8, 1, 64, 1, (v) => p.onLayer({ dotsCount: v }))}
                {slider("Thickness", l.dotsThickness ?? 2, 1, 16, 1, (v) => p.onLayer({ dotsThickness: v }), "px")}
                {slider("Length / Dash", l.dotsLength ?? 8, 1, 64, 1, (v) => p.onLayer({ dotsLength: v }), "px")}
                {slider("Spacing / Gap", l.dotsSpacing ?? 4, 1, 32, 1, (v) => p.onLayer({ dotsSpacing: v }), "px")}
                <label className="block">
                  <div className="mb-1 label">Direction</div>
                  <select className="field" value={l.dotsDirection ?? "right"} onChange={(e) => p.onLayer({ dotsDirection: e.target.value as any })}>
                    <option value="up">Up</option>
                    <option value="down">Down</option>
                    <option value="left">Left</option>
                    <option value="right">Right</option>
                    <option value="diag-ul">Diag Up-Left</option>
                    <option value="diag-ur">Diag Up-Right</option>
                    <option value="diag-dl">Diag Down-Left</option>
                    <option value="diag-dr">Diag Down-Right</option>
                    <option value="expand">Center Out (Expand)</option>
                    <option value="converge">Edges In (Converge)</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 text-[11px] text-zinc-400">
                  <input type="checkbox" checked={l.dotsBounce ?? false} onChange={(e) => p.onLayer({ dotsBounce: e.target.checked })} />
                  Bounce / Ping-Pong
                </label>
                {slider("Speed", l.dotsSpeed ?? 1, 0, 10, 0.1, (v) => p.onLayer({ dotsSpeed: v }), "×")}
                <label className="block">
                  <div className="mb-1 label">Effect</div>
                  <select className="field" value={l.dotsEffect ?? "solid"} onChange={(e) => p.onLayer({ dotsEffect: e.target.value as any })}>
                    <option value="solid">Solid</option>
                    <option value="blink">Blink</option>
                    <option value="pulse">Pulse / Breathe</option>
                    <option value="chase">Chase</option>
                    <option value="twinkle">Twinkle</option>
                  </select>
                </label>
                <label className="block">
                  <div className="mb-1 label">Color mode</div>
                  <select className="field" value={l.dotsColorMode ?? "solid"} onChange={(e) => p.onLayer({ dotsColorMode: e.target.value as any })}>
                    <option value="solid">Solid Color</option>
                    <option value="dual">Dual Gradient</option>
                    <option value="rainbow">Rainbow</option>
                    <option value="cycle">Auto-Cycle</option>
                  </select>
                </label>
                  </>
                )}
                <label className="block">
                  <div className="mb-1 label">Blend / Place</div>
                  <select className="field" value={l.blend ?? "add"} onChange={(e) => p.onLayer({ blend: e.target.value as any })}>
                    <option value="add">Add Glow</option>
                    <option value="normal">Normal</option>
                    <option value="screen">Screen</option>
                    <option value="overlay">Overlay</option>
                    <option value="behind">Behind Content</option>
                  </select>
                </label>
              </section>
            )}

            {l.effect === "sparkle" && (
              <section className={card}>
                <div className="label">Twinkle / sparkle control</div>
                {slider("Lit pixels", l.sparkleDensity ?? 6, 0, 40, 1, (v) => p.onLayer({ sparkleDensity: v }), "%")}
                {slider("Flicker rate", l.sparkleRate ?? 9, 1, 30, 1, (v) => p.onLayer({ sparkleRate: v }), " /s")}
                <p className="text-[9px] leading-snug text-zinc-600">Density sets how many drops flash at once; rate sets how often each one re-rolls.</p>
              </section>
            )}

            {(l.effect === "text" || l.kind === "text") && (
              <section className={card}>
                <div className="label">Text layer</div>
                <div className="flex items-start gap-2">
                  <label className="min-w-0 flex-1">
                    <div className="mb-1 label">Content</div>
                    <input
                      ref={textInputRef}
                      className="field min-h-[44px] md:min-h-0"
                      value={l.textContent ?? l.text ?? ""}
                      onChange={(e) => p.onLayer({ textContent: e.target.value, text: e.target.value })}
                    />
                  </label>
                  <div className="pt-4">
                    <EmojiPicker
                      value={l.textContent ?? l.text ?? ""}
                      onChange={(value) => p.onLayer({ textContent: value, text: value })}
                      inputRef={textInputRef}
                    />
                  </div>
                </div>
                <label className="block">
                  <div className="mb-1 label">Script filter</div>
                  <select className="field" value={fontScript} onChange={(e) => setFontScript(e.target.value)}>
                    <option value="all">All</option>
                    <option value="hindi">Hindi / Devanagari</option>
                    <option value="pixel">LED / Pixel</option>
                    <option value="display">Bold Display</option>
                    <option value="stylish">Stylish / Wedding</option>
                  </select>
                </label>
                <label className="block">
                  <div className="mb-1 label">Font</div>
                  <select className="field" value={l.textFont ?? "ui-monospace, monospace"} onChange={(e) => p.onLayer({ textFont: e.target.value })}>
                    {FONT_FAMILIES.filter((f) => fontScript === "all" || f.script === fontScript).map((f) => (
                      <option key={f.name} value={f.css}>{f.name}</option>
                    ))}
                  </select>
                </label>
                <div className="rounded border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-[13px] leading-tight text-zinc-100"
                  style={{ fontFamily: l.textFont ?? "ui-monospace, monospace", fontWeight: 700 }}>
                  शुभ विवाह · Hindi 123
                </div>
                {slider("Bold / stroke", l.textStroke ?? 0, 0, 4, 0.5, (v) => p.onLayer({ textStroke: v }))}
                <label className="flex items-center gap-2 text-[11px] text-zinc-400">
                  <input type="checkbox" checked={l.textAutoFit !== false} onChange={(e) => p.onLayer({ textAutoFit: e.target.checked })} />
                  Auto-fit height (scales with matrix)
                </label>
                {slider("Size", l.textSize && l.textSize >= 6 ? l.textSize : 16, 6, 64, 1, (v) => p.onLayer({ textSize: v }), l.textAutoFit === false ? "px" : "×")}
                {slider("Spacing", l.textSpacing ?? 1, 0, 5, 0.1, (v) => p.onLayer({ textSpacing: v }), "×")}
                {slider("X offset", l.textX ?? 0, -10, 10, 1, (v) => p.onLayer({ textX: v }), "px")}
                {slider("Y offset", l.textY ?? 0, -10, 10, 1, (v) => p.onLayer({ textY: v }), "px")}
                {(() => {
                  const max = Math.max(48, p.project.hardware.rows);
                  const val = l.textYOffset ?? l.yOffset ?? 0;
                  const setY = (v: number) => p.onLayer({ textYOffset: v, yOffset: v });
                  return (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="label">Vertical Position (Y)</span>
                        <span className="font-mono text-[10px] tabular-nums text-zinc-400">{val >= 0 ? `+${val}` : val} px</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button type="button" className="btn h-8 px-2" title="Up 1px" onClick={() => setY(val - 1)}>↑</button>
                        <input type="range" min={-max} max={max} step={1} className="min-w-0 flex-1" value={val} onChange={(e) => setY(+e.target.value)} />
                        <button type="button" className="btn h-8 px-2" title="Down 1px" onClick={() => setY(val + 1)}>↓</button>
                        <button type="button" className="btn h-8 px-2" title="Center" onClick={() => setY(0)}>0</button>
                      </div>
                    </div>
                  );
                })()}
                <label className="block">
                  <div className="mb-1 label">Direction</div>
                  <select className="field" value={l.textDirection ?? "left"} onChange={(e) => p.onLayer({ textDirection: e.target.value as any })}>
                    {["left","right","up","down","pingpong","static","typewriter","wave"].map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </label>
                <label className="block">
                  <div className="mb-1 label">Color mode</div>
                  <select className="field" value={l.textColorMode ?? "solid"} onChange={(e) => p.onLayer({ textColorMode: e.target.value as any })}>
                    {["solid","gradientH","gradientV","rainbow","alt"].map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </label>
                <div className="flex flex-wrap items-center gap-1.5">
                  {(l.textColors ?? [l.color]).map((c, i) => (
                    <input key={i} type="color" value={c} onChange={(e) => {
                      const arr = [...(l.textColors ?? [l.color])]; arr[i] = e.target.value; p.onLayer({ textColors: arr });
                    }} />
                  ))}
                  <button className="chip" onClick={() => p.onLayer({ textColors: [...(l.textColors ?? [l.color]), "#ffffff"] })}>+ color</button>
                </div>
                <label className="flex items-center gap-2 text-[11px] text-zinc-400">
                  <input type="checkbox" checked={l.textOutline ?? false} onChange={(e) => p.onLayer({ textOutline: e.target.checked })} />
                  1px outline
                </label>
                <label className="flex items-center gap-2 text-[11px] text-zinc-400">
                  <input type="checkbox" checked={l.textShadow ?? false} onChange={(e) => p.onLayer({ textShadow: e.target.checked })} />
                  Drop shadow
                </label>
                <Text3DControls
                  config={normalizeText3D(l.text3d)}
                  onChange={(next) => p.onLayer({ text3d: normalizeText3D({ ...normalizeText3D(l.text3d), ...next }) })}
                />
              </section>
            )}

            {l.effect !== "text" && l.effect !== "dots-lines" && (
            <section className={card}>
              <div className="label">Color engine</div>
              <div className="flex flex-wrap items-center gap-1.5">
                {l.gradient.map((c, i) => (
                  <input key={i} type="color" value={c} onChange={(e) => {
                    const gradient = [...l.gradient]; gradient[i] = e.target.value;
                    p.onLayer({ gradient });
                  }} />
                ))}
                <button className="chip" onClick={() => p.onLayer({ gradient: [...l.gradient, "#ffffff"] })} disabled={l.gradient.length >= 5}>+ stop</button>
              </div>
              <label className="flex items-center gap-2 text-[11px] text-zinc-400">
                <input type="checkbox" checked={l.rainbow} onChange={(e) => p.onLayer({ rainbow: e.target.checked })} />
                Rainbow spectrum cycle
              </label>
              {slider("Hue shift", l.hueShift, 0, 360, 1, (v) => p.onLayer({ hueShift: v }), "°")}
              {slider("Saturation", l.saturation, 0, 100, 1, (v) => p.onLayer({ saturation: v }), "%")}
            </section>
            )}

            <details className={card}>
              <summary className="flex cursor-pointer list-none items-center justify-between text-[11px] font-semibold text-slate-300">
                Blend Mode <Icon name="chevron" size={14} />
              </summary>
              <div className="space-y-3 pt-1">
                <label className="block">
                  <div className="mb-1 label">Blend mode</div>
                  <select className="field" value={l.blend} onChange={(e) => p.onLayer({ blend: e.target.value as BlendMode })}>
                    {["normal", "add", "multiply", "screen", "overlay", "difference", "max"].map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </label>
                <label className="block">
                  <div className="mb-1 label">Symmetry / mirror</div>
                  <select className="field" value={l.symmetry} onChange={(e) => p.onLayer({ symmetry: e.target.value as Symmetry })}>
                    {["none", "horizontal", "vertical", "quad"].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
              </div>
            </details>

            <section className={card}>
              <div className="label">Post FX</div>
              {slider("Trails / afterglow", l.trails, 0, 0.95, 0.01, (v) => p.onLayer({ trails: v }))}
              {slider("Strobe", l.strobeHz, 0, 20, 0.5, (v) => p.onLayer({ strobeHz: v }), " Hz")}
              <label className="flex items-center gap-2 text-[11px] text-zinc-400">
                <input type="checkbox" checked={l.audioReactive} onChange={(e) => p.onLayer({ audioReactive: e.target.checked })} />
                Audio reactive (microphone)
              </label>
              <p className="text-[9px] leading-snug text-zinc-600">
                Trails echo the generator backwards in time. Strobe is a 50% duty gate. Audio follows the mic in preview only.
              </p>
            </section>

            <section>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="label">Automation · {l.keyframes.length} keys</span>
                <button className="chip" onClick={p.onAddKeyframe}>+ key @ {p.time.toFixed(1)}s</button>
              </div>
              <div className="flex flex-wrap gap-1">
                {l.keyframes.map((k) => (
                  <span key={k.id} className="rounded border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 font-mono text-[9px] text-zinc-400">
                    {k.param} {k.t.toFixed(1)}s:{k.value.toFixed(1)}
                  </span>
                ))}
              </div>
            </section>

            <section>
              <div className="label mb-1.5">Clip actions</div>
              <div className="grid grid-cols-2 gap-1.5">
                <button className="btn" onClick={() => p.onAction("duplicate")}><Icon name="copy" />Duplicate</button>
                <button className="btn" onClick={() => p.onAction("split")}><Icon name="split" />Split @ playhead</button>
                <button className="btn" onClick={() => p.onAction("up")}><Icon name="up" />Move up</button>
                <button className="btn" onClick={() => p.onAction("down")}><Icon name="down" />Move down</button>
              </div>
              <button className="btn mt-1.5 w-full text-red-400 hover:bg-red-500/10" onClick={() => p.onAction("delete")}><Icon name="trash" />Delete layer</button>
            </section>
          </>
        )}

        {l && (
          <details className={card}>
            <summary className="flex cursor-pointer list-none items-center justify-between text-[11px] font-semibold text-slate-300">
              Random Scatter <Icon name="chevron" size={14} />
            </summary>
            <div className="pt-1">
              <RandomScatterPanel
                layer={l}
                onLayer={p.onLayer}
                width={p.project.hardware.cols}
                height={p.project.hardware.rows}
              />
            </div>
          </details>
        )}

        <section className={card}>
          <div className="label mb-2">Master output</div>
          {slider("Hardware gamma", p.project.gamma, 1, 2.8, 0.1, p.onGamma)}
          <p className="mt-1 text-[9px] leading-snug text-zinc-600">Match the curve to your WS2811 / UCS1903 drivers so preview matches the physical strip.</p>

          <label className="mt-3 flex items-center justify-between">
            <span className="label">Sparkle Overlay</span>
            <input type="checkbox" checked={p.project.sparkleOverlay ?? false}
              onChange={(e) => p.onProject({ sparkleOverlay: e.target.checked })} />
          </label>
          {p.project.sparkleOverlay && (
            <div className="mt-2 space-y-2 rounded border border-zinc-800 bg-zinc-950/50 p-2">
              <select className="field" value={p.project.sparkleOverlayColorMode ?? "solid"}
                onChange={(e) => p.onProject({ sparkleOverlayColorMode: e.target.value as NonNullable<Project["sparkleOverlayColorMode"]> })}>
                <option value="solid">Solid Color</option>
                <option value="random">Random High-Contrast</option>
                <option value="palette">Random From Palette</option>
              </select>
              {(p.project.sparkleOverlayColorMode ?? "solid") === "solid" && (
                <div className="flex flex-wrap items-center gap-1">
                  {["#ffffff", "#ff0000", "#ffd700", "#00ffff", "#00ff00"].map((color) => (
                    <button key={color} aria-label={`Sparkle ${color}`} title={color}
                      onClick={() => p.onProject({ sparkleOverlayColor: color })}
                      className={`h-6 w-6 rounded border ${p.project.sparkleOverlayColor === color ? "border-zinc-100" : "border-zinc-700"}`}
                      style={{ background: color }} />
                  ))}
                  <input type="color" aria-label="Custom sparkle color" className="h-6 w-7 cursor-pointer bg-transparent"
                    value={p.project.sparkleOverlayColor ?? "#ffffff"}
                    onChange={(e) => p.onProject({ sparkleOverlayColor: e.target.value })} />
                </div>
              )}
              {(p.project.sparkleOverlayColorMode ?? "solid") === "palette" && (
                <div className="flex flex-wrap gap-1">
                  {(p.project.sparkleOverlayPalette ?? []).map((color, i) => (
                    <input key={i} type="color" aria-label={`Sparkle palette ${i + 1}`} value={color}
                      onChange={(e) => {
                        const next = [...(p.project.sparkleOverlayPalette ?? [])];
                        next[i] = e.target.value;
                        p.onProject({ sparkleOverlayPalette: next });
                      }} className="h-6 w-7 cursor-pointer rounded border border-zinc-700 bg-transparent p-0" />
                  ))}
                </div>
              )}
              {slider("Density", p.project.sparkleOverlayDensity ?? 6, 1, 25, 1, (v) => p.onProject({ sparkleOverlayDensity: v }), "%")}
              {slider("Twinkle speed", p.project.sparkleOverlaySpeed ?? 4, 1, 10, 1, (v) => p.onProject({ sparkleOverlaySpeed: v }))}
            </div>
          )}
          <button className={`btn mt-2 w-full ${micOn ? "text-teal-300" : ""}`} onClick={toggleMic} disabled={micBusy}>
            <Icon name="rec" size={11} />{micBusy ? "Opening microphone…" : micOn ? "Microphone live" : "Enable microphone"}
          </button>
          {micError && <p className="mt-1 text-[9px] text-red-400">{micError}</p>}
        </section>
      </div>
    </aside>
  );
}
