"use client";

import { useState } from "react";
import { makeDotsStamp, type Layer, type Project } from "@/types/project";

interface Props {
  project: Project;
  onCommit: (updater: (p: Project) => Project, key?: string) => void;
  onAdd: (effect: string, name?: string) => void;
}

const DIRECTIONS = ["up", "down", "left", "right", "diag-ul", "diag-ur", "diag-dl", "diag-dr", "expand", "converge", "bounce"] as const;
const PARTICLE_DIRECTIONS = [...DIRECTIONS, "radial-out", "radial-in", "drift"] as const;

export default function DotsLinesPanel({ project, onCommit, onAdd }: Props) {
  const [selectedId, setSelectedId] = useState<string>("");
  const layers = project.layers.filter((l) => l.effect === "dots-lines");
  const layer = layers.find((l) => l.id === selectedId) ?? layers[0];

  const patch = (fields: Partial<Layer>) => {
    if (!layer) return;
    const id = layer.id;
    onCommit((p) => ({ ...p, layers: p.layers.map((l) => (l.id === id ? { ...l, ...fields } : l)) }), "dots:patch");
  };

  const slider = (label: string, value: number, min: number, max: number, step: number, apply: (v: number) => void, unit = "") => (
    <label className="block">
      <div className="mb-1 flex justify-between"><span className="label">{label}</span><span className="font-mono text-zinc-400">{value}{unit}</span></div>
      <input type="range" min={min} max={max} step={step} value={value} className="w-full" onChange={(e) => apply(+e.target.value)} />
    </label>
  );

  const stampShape = (shape: "clear" | "invert" | "sparse" | "diamond" | "diagonal") => {
    if (!layer) return;
    const size = layer.dotsStampSize === 16 ? 16 : 8;
    let bits: boolean[];
    if (shape === "clear") bits = Array(size * size).fill(false);
    else if (shape === "invert") bits = (layer.dotsStamp ?? makeDotsStamp(size)).map((v) => !v);
    else if (shape === "sparse") bits = Array.from({ length: size * size }, () => Math.random() < 0.2);
    else bits = Array.from({ length: size * size }, (_, i) => {
      const x = i % size, y = Math.floor(i / size), c = (size - 1) / 2;
      return shape === "diamond" ? Math.abs(x - c) + Math.abs(y - c) <= (size - 1) / 2 : x === y || x + y === size - 1;
    });
    patch({ dotsStamp: bits.slice(0, size * size), dotsGenerator: "stamp" });
  };

  return (
    <div className="space-y-3 p-3 text-[11px] text-zinc-200">
      <div className="label mb-2">Dots & Lines</div>
      <button className="btn w-full" onClick={() => onAdd("dots-lines", "Dots / Lines")}>Add Dots / Lines Layer</button>
      {layers.length === 0 && <div className="text-zinc-500">No dots/lines layers yet. Layers stack like any other effect.</div>}
      {layers.length > 0 && (
        <select className="field" value={layer?.id ?? ""} onChange={(e) => setSelectedId(e.target.value)}>
          {layers.map((l, i) => <option key={l.id} value={l.id}>{l.name || `Dots / Lines ${i + 1}`}</option>)}
        </select>
      )}

      {layer && (
        <div className="space-y-3 rounded border border-teal-500/20 bg-teal-500/[.03] p-2">
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <div className="mb-1 label">Mode</div>
              <select className="field" value={layer.dotsMode ?? "dots"}
                onChange={(e) => {
                  const mode = e.target.value as Layer["dotsMode"];
                  patch({ dotsMode: mode, dotsGenerator: mode === "gravity-stack" ? "gravity-stack"
                    : layer.dotsGenerator === "gravity-stack" ? "classic" : layer.dotsGenerator });
                }}>
                <option value="dots">Dots</option><option value="lines">Lines</option><option value="dashed">Dashed</option>
                <option value="gravity-stack">Gravity Stack / Fill</option>
              </select>
            </label>
            <label className="block">
              <div className="mb-1 label">Layout</div>
              <select className="field" value={layer.dotsLayout ?? "grid"} onChange={(e) => patch({ dotsLayout: e.target.value as Layer["dotsLayout"] })}>
                {(["grid", "checkerboard", "hstrips", "vstrips", "diag", "border"] as const).map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </label>
          </div>

          <div className="flex flex-wrap gap-1">
            {([
              ["classic", "Classic Layout"], ["particles", "Procedural Particles"],
              ["stamp", "Custom Dot Stamp"], ["gravity-stack", "Gravity Stack / Fill"],
            ] as const).map(([g, label]) => (
              <button key={g} className={`chip ${(layer.dotsGenerator ?? "classic") === g ? "chip-active" : ""}`}
                onClick={() => patch({ dotsGenerator: g, dotsMode: g === "gravity-stack" ? "gravity-stack" : layer.dotsMode === "gravity-stack" ? "dots" : layer.dotsMode })}>{label}</button>
            ))}
          </div>

          {layer.dotsGenerator === "stamp" ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="label">Stamp</span>
                {([8, 16] as const).map((s) => (
                  <button key={s} className={`chip ${layer.dotsStampSize === s ? "chip-active" : ""}`}
                    onClick={() => patch({ dotsStampSize: s, dotsStamp: makeDotsStamp(s) })}>{s}×{s}</button>
                ))}
              </div>
              <div className="grid gap-[1px] rounded border border-zinc-700 bg-zinc-950 p-1"
                style={{ gridTemplateColumns: `repeat(${layer.dotsStampSize === 16 ? 16 : 8}, minmax(0, 1fr))` }}>
                {(layer.dotsStamp ?? []).map((on, i) => (
                  <button key={i} aria-label={`Stamp cell ${i}`} onClick={() => {
                    const bits = [...(layer.dotsStamp ?? [])];
                    bits[i] = !bits[i];
                    patch({ dotsStamp: bits });
                  }} className={`aspect-square rounded-[1px] ${on ? "bg-teal-400" : "bg-zinc-800"}`} />
                ))}
              </div>
              <div className="flex flex-wrap gap-1">
                {(["clear", "invert", "sparse", "diamond", "diagonal"] as const).map((shape) => (
                  <button key={shape} className="chip" onClick={() => stampShape(shape)}>{shape === "sparse" ? "Random Sparse" : shape[0].toUpperCase() + shape.slice(1)}</button>
                ))}
              </div>
              <label className="flex items-center gap-2 text-zinc-400">
                <input type="checkbox" checked={layer.dotsTile ?? false} onChange={(e) => patch({ dotsTile: e.target.checked })} />
                Tile stamp across matrix
              </label>
              {slider("Motion speed", layer.dotsParticleSpeed ?? 30, 0, 100, 1, (v) => patch({ dotsParticleSpeed: v }), "%")}
              {slider("Speed variance", layer.dotsSpeedVariance ?? 20, 0, 100, 1, (v) => patch({ dotsSpeedVariance: v }), "%")}
            </div>
          ) : layer.dotsGenerator === "particles" ? (
            <div className="space-y-2">
              <label className="block">
                <div className="mb-1 label">Distribution</div>
                <select className="field" value={layer.dotsDistribution ?? "starfield"} onChange={(e) => patch({ dotsDistribution: e.target.value as Layer["dotsDistribution"] })}>
                  {(["starfield", "rain", "cluster", "wave"] as const).map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </label>
              {slider("Dots", layer.dotsCount ?? 80, 1, 500, 1, (v) => patch({ dotsCount: v }))}
              {slider("Size", layer.dotsSizeMin ?? 1, 1, 8, 1, (v) => patch({ dotsSizeMin: v, dotsSizeMax: v }))}
              {slider("Motion speed", layer.dotsParticleSpeed ?? 30, 0, 100, 1, (v) => patch({ dotsParticleSpeed: v }), "%")}
              {slider("Speed variance", layer.dotsSpeedVariance ?? 20, 0, 100, 1, (v) => patch({ dotsSpeedVariance: v }), "%")}
              {slider("Jitter", layer.dotsJitter ?? 0, 0, 100, 1, (v) => patch({ dotsJitter: v }), "%")}
              {slider("Trail", layer.dotsTrail ?? 0, 0, 20, 1, (v) => patch({ dotsTrail: v }))}
            </div>
          ) : layer.dotsGenerator === "classic" ? (
            <div className="space-y-2">
              {slider("Count", layer.dotsCount ?? 8, 1, 64, 1, (v) => patch({ dotsCount: v }))}
              {slider("Thickness", layer.dotsThickness ?? 2, 1, 16, 1, (v) => patch({ dotsThickness: v }))}
              {slider("Length", layer.dotsLength ?? 8, 1, 64, 1, (v) => patch({ dotsLength: v }))}
              {slider("Spacing", layer.dotsSpacing ?? 4, 1, 32, 1, (v) => patch({ dotsSpacing: v }))}
              {slider("Speed", layer.dotsSpeed ?? 1, 0, 10, 0.1, (v) => patch({ dotsSpeed: v }), "×")}
            </div>
          ) : null}

          {layer.dotsGenerator === "gravity-stack" && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <div className="mb-1 label">Spawn edge</div>
                  <select className="field" value={layer.dotsGravityDirection ?? "top-bottom"}
                    onChange={(e) => patch({ dotsGravityDirection: e.target.value as Layer["dotsGravityDirection"] })}>
                    <option value="top-bottom">Top → Bottom</option><option value="bottom-top">Bottom → Top</option>
                    <option value="left-right">Left → Right</option><option value="right-left">Right → Left</option>
                  </select>
                </label>
                <label className="block">
                  <div className="mb-1 label">Fill pattern</div>
                  <select className="field" value={layer.dotsGravityFill ?? "all"}
                    onChange={(e) => patch({ dotsGravityFill: e.target.value as Layer["dotsGravityFill"] })}>
                    <option value="all">All Lines Together</option><option value="wave">Wave / Staggered</option>
                    <option value="random">Random Rain Fill</option>
                  </select>
                </label>
                <label className="block">
                  <div className="mb-1 label">Per-dot color</div>
                  <select className="field" value={layer.dotsGravityColorMode ?? "palette"}
                    onChange={(e) => patch({ dotsGravityColorMode: e.target.value as Layer["dotsGravityColorMode"] })}>
                    <option value="single">Current Layer Color / Gradient</option>
                    <option value="palette">Per-Dot Palette Cycle</option>
                    <option value="rainbow">Rainbow Stack</option>
                    <option value="random">Random High-Contrast</option>
                  </select>
                </label>
                <label className="block">
                  <div className="mb-1 label">On complete</div>
                  <select className="field" value={layer.dotsGravityOnComplete ?? "cycle-hold"}
                    onChange={(e) => patch({ dotsGravityOnComplete: e.target.value as Layer["dotsGravityOnComplete"] })}>
                    <option value="cycle-hold">Color Cycle & Hold</option><option value="drain">Drain Out (Bottom Drop)</option>
                    <option value="flash">Flash & Reset</option>
                  </select>
                </label>
              </div>
              {slider("Drop speed", layer.dotsParticleSpeed ?? 30, 5, 100, 1, (v) => patch({ dotsParticleSpeed: v }), "%")}
              {slider("Hold frames", layer.dotsGravityHoldFrames ?? 40, 20, 120, 1, (v) => patch({ dotsGravityHoldFrames: v }))}
              <div>
                <div className="mb-1 label">Stack palette (live editable)</div>
                <div className="flex flex-wrap gap-1">
                  {(layer.dotsPalette ?? []).map((color, i) => (
                    <input key={i} type="color" aria-label={`Stack color ${i + 1}`} value={color}
                      onChange={(e) => {
                        const next = [...(layer.dotsPalette ?? [])];
                        next[i] = e.target.value;
                        patch({ dotsPalette: next });
                      }} className="h-6 w-7 cursor-pointer rounded border border-zinc-700 bg-transparent p-0" />
                  ))}
                  {(layer.dotsPalette?.length ?? 0) < 8 &&
                    <button className="chip" onClick={() => patch({ dotsPalette: [...(layer.dotsPalette ?? []), "#ffffff"] })}>+</button>}
                </div>
              </div>
            </div>
          )}

          <label className="flex items-center gap-2 text-zinc-400">
            <input type="checkbox" checked={layer.dotsBounce ?? false}
              onChange={(e) => patch({ dotsBounce: e.target.checked, dotsWrap: !e.target.checked })} />
            Bounce / Ping-Pong (all modes & directions)
          </label>

          {layer.dotsGenerator !== "gravity-stack" && (
            <label className="block">
              <div className="mb-1 label">Direction</div>
              <select className="field" value={(layer.dotsGenerator === "classic" ? layer.dotsDirection : layer.dotsParticleDirection) ?? "down"}
                onChange={(e) => patch(layer.dotsGenerator === "classic"
                  ? { dotsDirection: e.target.value as Layer["dotsDirection"] }
                  : { dotsParticleDirection: e.target.value as Layer["dotsParticleDirection"] })}>
                {(layer.dotsGenerator === "classic" ? DIRECTIONS : PARTICLE_DIRECTIONS).map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </label>
          )}
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <div className="mb-1 label">Effect</div>
              <select className="field" value={layer.dotsEffect ?? "solid"} onChange={(e) => patch({ dotsEffect: e.target.value as Layer["dotsEffect"] })}>
                {(["solid", "blink", "pulse", "chase", "twinkle"] as const).map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </label>
            <label className="block">
              <div className="mb-1 label">Blink</div>
              <select className="field" value={layer.dotsBlinkMode ?? "none"} onChange={(e) => patch({ dotsBlinkMode: e.target.value as Layer["dotsBlinkMode"] })}>
                {(["none", "sync", "twinkle", "sparkle"] as const).map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </label>
          </div>
          <label className="flex items-center gap-2 text-zinc-400">
            <input type="checkbox" checked={layer.dotsWrap ?? false} onChange={(e) => patch({ dotsWrap: e.target.checked, dotsBounce: e.target.checked ? false : layer.dotsBounce })} />
            Wrap at edges
          </label>
          <label className="flex items-center gap-2 text-zinc-400">
            <input type="checkbox" checked={layer.dotsGlow ?? false} onChange={(e) => patch({ dotsGlow: e.target.checked })} />
            Glow
          </label>
        </div>
      )}
    </div>
  );
}
