"use client";

import { useState } from "react";
import type { BlendMode, EffectId, Layer, LineAnimation, Project, Symmetry } from "@/types/project";
import { EFFECTS, makeLineAnimation } from "@/types/project";
import { validateExpression } from "@/engine/expression";
import { audioStore, startAudio, stopAudio } from "@/engine/audio";
import { Icon } from "./icons";

interface Props {
  project: Project;
  layer: Layer | null;
  time: number;
  onLayer: (patch: Partial<Layer>) => void;
  onAction: (action: "delete" | "duplicate" | "split" | "up" | "down") => void;
  onGamma: (v: number) => void;
  onAddKeyframe: () => void;
  onLineAnimations: (updater: (prev: LineAnimation[]) => LineAnimation[]) => void;
  width: number;
}

const ANGLES = [["↑", 0], ["↗", 45], ["→", 90], ["↘", 135], ["↓", 180], ["↙", 225], ["←", 270], ["↖", 315]] as const;
const EFFECT_OPTIONS = EFFECTS.filter((e) => e.kind === "effect" || e.kind === "math");
const EXPR_PRESETS: [string, string][] = [
  ["Plasma", "sin(u * 12 + t) * cos(v * 9 - t)"],
  ["Sweep", "max(0, 1 - abs(u - fract(t * 0.28)) * 9)"],
  ["Rings", "max(0, 1 - abs(r * 2 - fract(t * 0.4)) * 9)"],
  ["Checker", "mod(floor(u * 8) + floor(v * 8), 2)"],
  ["Noise", "step(0.5, hash(floor(x * 1.7), floor(y * 1.7) + floor(t * 9)))"],
  ["Spiral", "wave(atan2(v - 0.5, u - 0.5) / pi * 3 + r * 8 - t)"],
];

export default function Inspector(p: Props) {
  const l = p.layer;
  const lines = p.project.lineAnimations ?? [];
  const [micOn, setMicOn] = useState(audioStore.enabled);
  const [micBusy, setMicBusy] = useState(false);
  const [micError, setMicError] = useState("");
  const exprError = l?.effect === "custom" ? validateExpression(l.expression) : null;

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
  const patchLine = (id: string, patch: Partial<LineAnimation>) =>
    p.onLineAnimations((prev) => prev.map((x) => x.id === id ? { ...x, ...patch } : x));

  return (
    <aside style={{ width: p.width }} className="flex shrink-0 flex-col border-l border-zinc-800 bg-zinc-950">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-zinc-800 px-3">
        <Icon name="sliders" size={14} />
        <span className="label">Layer & post-process inspector</span>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-auto p-3">
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

            <section>
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

            <section className="space-y-3">
              {slider("Brightness", l.brightness, 0, 100, 1, (v) => p.onLayer({ brightness: v }), "%")}
              {l.effect !== "media" && slider("Speed", l.speed < 0.2 ? 0.2 : l.speed, 0.2, 3, 0.1, (v) => p.onLayer({ speed: Math.max(0.2, v) }), "×")}
              {l.effect !== "media" && slider("Density / Scale", l.density, 0.1, 5, 0.1, (v) => p.onLayer({ density: Math.max(0.1, Math.min(5, v)) }), "×")}
              {l.effect !== "media" && slider("Direction / Angle", l.angle, 0, 360, 1, (v) => p.onLayer({ angle: v }), "°")}
              {l.effect !== "media" && angleChips(l.angle, (v) => p.onLayer({ angle: v }))}
              {l.effect !== "media" && (
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
              <section className="space-y-2 rounded-lg border border-violet-500/25 bg-violet-500/[.04] p-2.5">
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
              <section className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-900/40 p-2.5">
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

            {l.effect === "media" && l.mediaSrc ? (
              <section className="space-y-3 rounded-lg border border-teal-500/20 bg-teal-500/[.03] p-2.5">
                <div className="label">Transform</div>
                {slider("Width", l.mediaScale ?? 1, 0.1, 2, 0.05, (v) => p.onLayer({ mediaScale: v }), "×")}
                {slider("Height", l.mediaScaleY ?? l.mediaScale ?? 1, 0.1, 2, 0.05, (v) => p.onLayer({ mediaScaleY: v }), "×")}
                {slider("Offset X", l.mediaOffsetX ?? 0, -Math.max(1, p.project.hardware.cols), Math.max(1, p.project.hardware.cols), 1, (v) => p.onLayer({ mediaOffsetX: v }), " px")}
                {slider("Offset Y", l.mediaOffsetY ?? 0, -Math.max(1, p.project.hardware.rows), Math.max(1, p.project.hardware.rows), 1, (v) => p.onLayer({ mediaOffsetY: v }), " px")}
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

            {l.effect === "media" && l.mediaSrc ? (
              <section className="space-y-3 rounded-lg border border-teal-500/20 bg-teal-500/[.03] p-2.5">
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

            {l.effect === "media" && l.mediaFrames ? (
              <section className="space-y-3 rounded-lg border border-teal-500/20 bg-teal-500/[.03] p-2.5">
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
              <section className="space-y-3 rounded-lg border border-teal-500/20 bg-teal-500/[.03] p-2.5">
                <div className="label">Image fit</div>
                <label className="flex items-center gap-2 text-[11px] text-zinc-400">
                  <input type="checkbox" checked={l.mediaSmoothing !== false} onChange={(e) => p.onLayer({ mediaSmoothing: e.target.checked })} />
                  Smooth (bilinear) sampling
                </label>
                <p className="text-[9px] leading-snug text-zinc-600">Still images are centred and keep their aspect ratio; toggle smoothing for pixel-art sources.</p>
              </section>
            ) : null}

            {l.effect === "sparkle" && (
              <section className="space-y-3 rounded-lg border border-teal-500/20 bg-teal-500/[.03] p-2.5">
                <div className="label">Twinkle / sparkle control</div>
                {slider("Lit pixels", l.sparkleDensity ?? 6, 0, 40, 1, (v) => p.onLayer({ sparkleDensity: v }), "%")}
                {slider("Flicker rate", l.sparkleRate ?? 9, 1, 30, 1, (v) => p.onLayer({ sparkleRate: v }), " /s")}
                <p className="text-[9px] leading-snug text-zinc-600">Density sets how many drops flash at once; rate sets how often each one re-rolls.</p>
              </section>
            )}

            {(l.effect === "text" || l.kind === "text") && (
              <section className="space-y-3 rounded-lg border border-teal-500/20 bg-teal-500/[.03] p-2.5">
                <div className="label">Text layer</div>
                <label className="block">
                  <div className="mb-1 label">Content</div>
                  <input className="field" value={l.textContent ?? l.text ?? ""} onChange={(e) => p.onLayer({ textContent: e.target.value, text: e.target.value })} />
                </label>
                <div className="flex flex-wrap gap-1">
                  {["★","♥","ॐ","卐","✦","❖","☀","☾"].map((s) => (
                    <button key={s} className="chip" onClick={() => p.onLayer({ textContent: (l.textContent ?? l.text ?? "") + s, text: (l.textContent ?? l.text ?? "") + s })}>{s}</button>
                  ))}
                </div>
                <label className="block">
                  <div className="mb-1 label">Font</div>
                  <select className="field" value={l.textFont ?? "ui-monospace, monospace"} onChange={(e) => p.onLayer({ textFont: e.target.value })}>
                    <option value="ui-monospace, monospace">Pixel Mono</option>
                    <option value="monospace">Monospace</option>
                    <option value="sans-serif">Sans</option>
                    <option value="serif">Serif</option>
                    <option value="cursive">Cursive</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 text-[11px] text-zinc-400">
                  <input type="checkbox" checked={l.textAutoFit !== false} onChange={(e) => p.onLayer({ textAutoFit: e.target.checked })} />
                  Auto-fit height (scales with matrix)
                </label>
                {slider("Size", l.textSize && l.textSize >= 6 ? l.textSize : 16, 6, 64, 1, (v) => p.onLayer({ textSize: v }), l.textAutoFit === false ? "px" : "×")}
                {slider("Spacing", l.textSpacing ?? 1, 0, 5, 0.1, (v) => p.onLayer({ textSpacing: v }), "×")}
                {slider("X offset", l.textX ?? 0, -10, 10, 1, (v) => p.onLayer({ textX: v }), "px")}
                {slider("Y offset", l.textY ?? 0, -10, 10, 1, (v) => p.onLayer({ textY: v }), "px")}
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
              </section>
            )}

            {l.effect !== "text" && (
            <section className="space-y-3">
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

            <section className="space-y-3">
              <div className="label">Compositing</div>
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
            </section>

            <section className="space-y-3">
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

        <section className="rounded-lg border border-amber-400/20 bg-amber-400/[.03] p-2.5">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="label">Per-line animation · {lines.length}</span>
            <button className="chip" onClick={() => p.onLineAnimations((prev) => [...prev, makeLineAnimation(prev.length + 1)])}>
              + New line
            </button>
          </div>
          <p className="mb-2 text-[9px] leading-snug text-zinc-600">
            Assign an effect to one drop/row with its own colour. Line animations replace other layers on those lines, so no other colour bleeds in.
          </p>
          {lines.map((la) => (
            <details key={la.id} className="mb-1.5 rounded border border-zinc-800 bg-zinc-900/60">
              <summary className="flex cursor-pointer list-none items-center gap-1.5 px-2 py-1.5 text-[10px]">
                <input type="checkbox" checked={la.enabled} onClick={(e) => e.stopPropagation()}
                  onChange={(e) => patchLine(la.id, { enabled: e.target.checked })} />
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: la.color }} />
                <span className="min-w-0 flex-1 truncate text-zinc-200">{la.name}</span>
                <span className="shrink-0 font-mono text-[9px] text-zinc-500">
                  {la.axis === "column" ? "Drop" : "Row"} {la.from}{la.from !== la.to ? `–${la.to}` : ""}
                </span>
                <button className="shrink-0 text-zinc-600 hover:text-red-400" onClick={(e) => {
                  e.preventDefault(); e.stopPropagation();
                  p.onLineAnimations((prev) => prev.filter((x) => x.id !== la.id));
                }}>✕</button>
              </summary>
              <div className="space-y-2 border-t border-zinc-800 p-2">
                <input className="field" value={la.name} onChange={(e) => patchLine(la.id, { name: e.target.value })} />
                <div className="grid grid-cols-2 gap-2">
                  <label>
                    <div className="mb-1 label">Axis</div>
                    <select className="field" value={la.axis} onChange={(e) => patchLine(la.id, { axis: e.target.value as "column" | "row" })}>
                      <option value="column">Drop / column</option>
                      <option value="row">Row</option>
                    </select>
                  </label>
                  <label>
                    <div className="mb-1 label">Effect</div>
                    <select className="field" value={la.effect} onChange={(e) => patchLine(la.id, { effect: e.target.value as EffectId })}>
                      {EFFECT_OPTIONS.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="color" value={la.color} onChange={(e) => patchLine(la.id, { color: e.target.value })} />
                  <label className="flex-1">
                    <div className="mb-1 label">From line</div>
                    <input type="number" min="1" className="field font-mono" value={la.from}
                      onChange={(e) => patchLine(la.id, { from: Math.max(1, +e.target.value || 1) })} />
                  </label>
                  <label className="flex-1">
                    <div className="mb-1 label">To line</div>
                    <input type="number" min="1" className="field font-mono" value={la.to}
                      onChange={(e) => patchLine(la.id, { to: Math.max(1, +e.target.value || 1) })} />
                  </label>
                </div>
                {slider("Brightness", la.brightness, 0, 100, 1, (v) => patchLine(la.id, { brightness: v }), "%")}
                {slider("Speed", la.speed < 0.2 ? 0.2 : la.speed, 0.2, 3, 0.1, (v) => patchLine(la.id, { speed: Math.max(0.2, v) }), "×")}
                {slider("Density", la.density, 0.1, 5, 0.1, (v) => patchLine(la.id, { density: Math.max(0.1, Math.min(5, v)) }), "×")}
                {slider("Direction / Angle", la.angle, 0, 360, 1, (v) => patchLine(la.id, { angle: v }), "°")}
                {angleChips(la.angle, (v) => patchLine(la.id, { angle: v }))}
                {la.effect === "sparkle" && (
                  <>
                    {slider("Lit pixels", la.sparkleDensity ?? 6, 0, 40, 1, (v) => patchLine(la.id, { sparkleDensity: v }), "%")}
                    {slider("Flicker rate", la.sparkleRate ?? 9, 1, 30, 1, (v) => patchLine(la.id, { sparkleRate: v }), " /s")}
                  </>
                )}
              </div>
            </details>
          ))}
        </section>

        <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
          <div className="label mb-2">Master output</div>
          {slider("Hardware gamma", p.project.gamma, 1, 2.8, 0.1, p.onGamma)}
          <p className="mt-1 text-[9px] leading-snug text-zinc-600">Match the curve to your WS2811 / UCS1903 drivers so preview matches the physical strip.</p>
          <button className={`btn mt-2 w-full ${micOn ? "text-teal-300" : ""}`} onClick={toggleMic} disabled={micBusy}>
            <Icon name="rec" size={11} />{micBusy ? "Opening microphone…" : micOn ? "Microphone live" : "Enable microphone"}
          </button>
          {micError && <p className="mt-1 text-[9px] text-red-400">{micError}</p>}
        </section>
      </div>
    </aside>
  );
}
