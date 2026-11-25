"use client";

import type { Project } from "@/types/project";

interface Props {
  project: Project;
  onCommit: (updater: (p: Project) => Project, key?: string) => void;
  onAddText: () => void;
}

export default function TextPanel({ project, onCommit, onAddText }: Props) {
  const textLayers = project.layers.filter((l) => l.kind === "text");
  const selected = textLayers[0] ?? null;

  const patch = (id: string, patch: Partial<Project["layers"][number]>) => {
    onCommit((p) => ({ ...p, layers: p.layers.map((l) => (l.id === id ? { ...l, ...patch } : l)) }), "text:patch");
  };

  return (
    <div className="space-y-3 p-3 text-[11px] text-zinc-200">
      <div className="label mb-2">Hindi / English Pixel Text</div>
      <button className="btn w-full" onClick={onAddText}>Add Text Layer</button>
      {textLayers.length === 0 && <div className="text-zinc-500">No text layers.</div>}
      {textLayers.map((layer) => (
        <div key={layer.id} className="space-y-2 rounded border border-zinc-800 bg-zinc-900/60 p-2">
          <input className="field" value={layer.textContent || layer.text || ""} onChange={(e) => patch(layer.id, { textContent: e.target.value, text: e.target.value })} placeholder="Text" />
          <div className="grid grid-cols-2 gap-2">
            <select className="field" value={layer.textDirection || "left"} onChange={(e) => patch(layer.id, { textDirection: e.target.value as "left" | "right" | "up" | "down" | "static" })}>
              <option value="left">Scroll Left</option>
              <option value="right">Scroll Right</option>
              <option value="up">Scroll Up</option>
              <option value="down">Scroll Down</option>
              <option value="static">Static</option>
            </select>
            <input className="field" type="number" value={layer.textSize ?? 16} onChange={(e) => patch(layer.id, { textSize: +e.target.value })} placeholder="Size" />
          </div>
          <div className="flex items-center gap-2">
            <span className="label">Speed</span>
            <input type="range" min="0" max="5" step="0.1" className="flex-1" value={layer.textSpeed ?? layer.speed ?? 1}
              onChange={(e) => patch(layer.id, { textSpeed: +e.target.value, speed: +e.target.value })} />
          </div>
          <div className="flex items-center gap-2">
            <input type="color" value={(layer.textColors && layer.textColors[0]) || layer.color || "#ffffff"} onChange={(e) => patch(layer.id, { textColors: [e.target.value], color: e.target.value })} />
            <span className="text-zinc-500">Gradient fill (first color)</span>
          </div>
        </div>
      ))}
    </div>
  );
}
