"use client";

import type { Layer, Project } from "@/types/project";

interface Props {
  project: Project;
  selectedId?: string | null;
  onCommit: (updater: (p: Project) => Project, key?: string) => void;
}

const FADE_MODES = [
  ["none", "None"], ["fade", "Fade"], ["wipe-lr", "Wipe L→R"], ["wipe-rl", "Wipe R→L"],
  ["wipe-tb", "Wipe T→B"], ["wipe-bt", "Wipe B→T"], ["iris", "Iris"],
  ["curtain", "Curtain"], ["sparkle", "Sparkle"], ["strobe", "Strobe"],
];

export default function LayersPanel({ project, selectedId, onCommit }: Props) {
  const layers = selectedId
    ? project.layers.filter((layer) => layer.id === selectedId)
    : project.layers;
  const patch = (id: string, patch: Partial<Layer>, key: string) =>
    onCommit((p) => ({ ...p, layers: p.layers.map((l) => l.id === id ? { ...l, ...patch } : l) }), key);

  return (
    <div className="space-y-3 text-[11px] text-zinc-200">
      <div className="text-[11px] uppercase tracking-wider text-slate-400">Fades &amp; opacity</div>
      {layers.length === 0 && <div className="text-zinc-500">No active layer.</div>}
      {layers.map((layer) => (
        <section key={layer.id} className="space-y-3 rounded-xl border border-white/10 bg-[#111827] p-3.5">
          <div className="flex items-center gap-1">
            <span className="min-w-0 flex-1 truncate font-semibold">{layer.name}</span>
            <button className={`btn h-9 px-2 ${layer.solo ? "chip-active" : ""}`} onClick={() => patch(layer.id, { solo: !layer.solo }, "layer:solo")}>S</button>
            <button className={`btn h-9 px-2 ${layer.mute ? "chip-active" : ""}`} onClick={() => patch(layer.id, { mute: !layer.mute }, "layer:mute")}>M</button>
            <button className={`btn h-9 px-2 ${layer.locked ? "chip-active" : ""}`} onClick={() => patch(layer.id, { locked: !layer.locked }, "layer:lock")}>L</button>
          </div>
          <div className="flex items-center gap-2">
            <label className="min-w-0 flex-1">
              <span className="mb-1 block text-[9px] uppercase tracking-wider text-zinc-500">In</span>
              <select className="field" value={layer.fadeInEffect ?? "fade"} onChange={(e) => patch(layer.id, { fadeInEffect: e.target.value }, "layer:fadein")}>
                {FADE_MODES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="w-16 shrink-0">
              <span className="mb-1 block text-[9px] uppercase tracking-wider text-zinc-500">Sec</span>
              <input className="field tabular-nums" type="number" min="0" step="0.1" value={layer.fadeIn ?? 0}
                onChange={(e) => patch(layer.id, { fadeIn: Math.max(0, +e.target.value || 0) }, "layer:fadein")} />
            </label>
          </div>
          <div className="flex items-center gap-2">
            <label className="min-w-0 flex-1">
              <span className="mb-1 block text-[9px] uppercase tracking-wider text-zinc-500">Out</span>
              <select className="field" value={layer.fadeOutEffect ?? "fade"} onChange={(e) => patch(layer.id, { fadeOutEffect: e.target.value }, "layer:fadeout")}>
                {FADE_MODES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="w-16 shrink-0">
              <span className="mb-1 block text-[9px] uppercase tracking-wider text-zinc-500">Sec</span>
              <input className="field tabular-nums" type="number" min="0" step="0.1" value={layer.fadeOut ?? 0}
                onChange={(e) => patch(layer.id, { fadeOut: Math.max(0, +e.target.value || 0) }, "layer:fadeout")} />
            </label>
          </div>
          <div className="flex items-center gap-2">
            <label className="min-w-0 flex-1">
              <span className="mb-1 block text-[9px] uppercase tracking-wider text-zinc-500">Direction</span>
              <select className="field" value={layer.direction ?? "normal"} onChange={(e) => patch(layer.id, { direction: e.target.value }, "layer:direction")}>
                {["normal", "reverse", "left", "right", "up", "down", "in", "out", "cw", "ccw"].map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </label>
            <span className="w-9 text-right font-mono text-[10px] tabular-nums text-zinc-400">{layer.opacity ?? 100}%</span>
          </div>
          <input type="range" min="0" max="100" step="1" className="w-full" value={layer.opacity ?? 100}
            aria-label="Layer opacity"
            onChange={(e) => patch(layer.id, { opacity: +e.target.value }, "layer:opacity")} />
        </section>
      ))}
    </div>
  );
}
