"use client";

import type { Project } from "@/types/project";
import type { BlendMode } from "@/types/project";

interface Props {
  project: Project;
  onCommit: (updater: (p: Project) => Project, key?: string) => void;
}

export default function LayersPanel({ project, onCommit }: Props) {
  return (
    <div className="space-y-2 p-3 text-[11px] text-zinc-200">
      <div className="label mb-2">Layers & Blend</div>
      {project.layers.length === 0 && <div className="text-zinc-500">No layers.</div>}
      {project.layers.map((layer) => (
        <div key={layer.id} className="rounded border border-zinc-800 bg-zinc-900/60 p-2">
          <div className="flex items-center gap-2">
            <button className="btn btn-icon" onClick={() => onCommit((p) => ({ ...p, layers: p.layers.map((l) => l.id === layer.id ? { ...l, enabled: !l.enabled } : l) }), "layer:toggle")}>
              {layer.enabled ? "👁" : "—"}
            </button>
            <span className="flex-1 truncate">{layer.name}</span>
            <button className={`btn btn-icon ${layer.solo ? "chip-active" : ""}`} onClick={() => onCommit((p) => ({ ...p, layers: p.layers.map((l) => l.id === layer.id ? { ...l, solo: !l.solo } : l) }), "layer:solo")}>S</button>
            <button className={`btn btn-icon ${layer.mute ? "chip-active" : ""}`} onClick={() => onCommit((p) => ({ ...p, layers: p.layers.map((l) => l.id === layer.id ? { ...l, mute: !l.mute } : l) }), "layer:mute")}>M</button>
            <button className={`btn btn-icon ${layer.locked ? "chip-active" : ""}`} onClick={() => onCommit((p) => ({ ...p, layers: p.layers.map((l) => l.id === layer.id ? { ...l, locked: !l.locked } : l) }), "layer:lock")}>L</button>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <label className="flex items-center gap-1">
              <span>In</span>
              <select className="field" value={layer.fadeInEffect ?? "fade"} onChange={(e) => onCommit((p) => ({ ...p, layers: p.layers.map((l) => l.id === layer.id ? { ...l, fadeInEffect: e.target.value } : l) }), "layer:fadein")}>
                <option value="none">None</option>
                <option value="fade">Fade</option>
                <option value="wipe-lr">Wipe L→R</option>
                <option value="wipe-rl">Wipe R→L</option>
                <option value="wipe-tb">Wipe T→B</option>
                <option value="wipe-bt">Wipe B→T</option>
                <option value="iris">Iris</option>
                <option value="curtain">Curtain</option>
                <option value="sparkle">Sparkle</option>
                <option value="strobe">Strobe</option>
              </select>
            </label>
            <input className="field w-16" type="number" step="0.1" value={layer.fadeIn ?? 0} onChange={(e) => onCommit((p) => ({ ...p, layers: p.layers.map((l) => l.id === layer.id ? { ...l, fadeIn: +e.target.value } : l) }), "layer:fadein")} />
            <label className="flex items-center gap-1">
              <span>Out</span>
              <select className="field" value={layer.fadeOutEffect ?? "fade"} onChange={(e) => onCommit((p) => ({ ...p, layers: p.layers.map((l) => l.id === layer.id ? { ...l, fadeOutEffect: e.target.value } : l) }), "layer:fadeout")}>
                <option value="none">None</option>
                <option value="fade">Fade</option>
                <option value="wipe-lr">Wipe L→R</option>
                <option value="wipe-rl">Wipe R→L</option>
                <option value="wipe-tb">Wipe T→B</option>
                <option value="wipe-bt">Wipe B→T</option>
                <option value="iris">Iris</option>
                <option value="curtain">Curtain</option>
                <option value="sparkle">Sparkle</option>
                <option value="strobe">Strobe</option>
              </select>
            </label>
            <input className="field w-16" type="number" step="0.1" value={layer.fadeOut ?? 0} onChange={(e) => onCommit((p) => ({ ...p, layers: p.layers.map((l) => l.id === layer.id ? { ...l, fadeOut: +e.target.value } : l) }), "layer:fadeout")} />
          </div>
          <div className="mt-2 flex items-center gap-2">
            <select className="field flex-1" value={layer.direction ?? "normal"} onChange={(e) => onCommit((p) => ({ ...p, layers: p.layers.map((l) => l.id === layer.id ? { ...l, direction: e.target.value } : l) }), "layer:direction")}>
              <option value="normal">Normal</option>
              <option value="reverse">Reverse</option>
              <option value="left">Left</option>
              <option value="right">Right</option>
              <option value="up">Up</option>
              <option value="down">Down</option>
              <option value="in">In</option>
              <option value="out">Out</option>
              <option value="cw">CW</option>
              <option value="ccw">CCW</option>
            </select>
            <select className="field flex-1" value={layer.blend} onChange={(e) => onCommit((p) => ({ ...p, layers: p.layers.map((l) => l.id === layer.id ? { ...l, blend: e.target.value as BlendMode } : l) }), "layer:blend")}>
              <option value="normal">Normal</option>
              <option value="add">Add</option>
              <option value="screen">Screen</option>
              <option value="multiply">Multiply</option>
              <option value="difference">Difference</option>
            </select>
            <input type="range" min="0" max="100" step="1" className="flex-1" value={layer.opacity ?? 100}
              onChange={(e) => onCommit((p) => ({ ...p, layers: p.layers.map((l) => l.id === layer.id ? { ...l, opacity: +e.target.value } : l) }), "layer:opacity")} />
            <span className="w-8 text-right">{layer.opacity ?? 100}%</span>
          </div>
        </div>
      ))}
    </div>
  );
}
