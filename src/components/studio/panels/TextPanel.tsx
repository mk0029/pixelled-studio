"use client";

import { useState } from "react";
import { FONT_FAMILIES } from "@/engine/fontFamilies";
import type { Project } from "@/types/project";

interface Props {
  project: Project;
  onCommit: (updater: (p: Project) => Project, key?: string) => void;
  onAddText: () => void;
}

const SCRIPTS = [
  { id: "all", label: "All" },
  { id: "hindi", label: "Hindi (देवनागरी)" },
  { id: "pixel", label: "Pixel / LED" },
  { id: "display", label: "Bold Display" },
] as const;

export default function TextPanel({ project, onCommit, onAddText }: Props) {
  const [fontScript, setFontScript] = useState<(typeof SCRIPTS)[number]["id"]>("all");
  const textLayers = project.layers.filter((l) => l.effect === "text" || l.kind === "text");

  const patch = (id: string, patch: Partial<Project["layers"][number]>) => {
    onCommit((p) => ({ ...p, layers: p.layers.map((l) => (l.id === id ? { ...l, ...patch } : l)) }), "text:patch");
  };

  return (
    <div className="space-y-3 p-3 text-[11px] text-zinc-200">
      <div className="label mb-2">Hindi / English Pixel Text</div>
      <button className="btn w-full" onClick={onAddText}>Add Text Layer</button>
      {textLayers.length === 0 && <div className="text-zinc-500">No text layers.</div>}
      {textLayers.map((layer) => {
        const font = layer.textFont ?? FONT_FAMILIES[0].css;
        return (
          <div key={layer.id} className="space-y-2 rounded border border-zinc-800 bg-zinc-900/60 p-2">
            <input className="field" value={layer.textContent || layer.text || ""} onChange={(e) => patch(layer.id, { textContent: e.target.value, text: e.target.value })} placeholder="शुभ विवाह / Welcome" />
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
            <div className="flex flex-wrap gap-1">
              {SCRIPTS.map((s) => (
                <button key={s.id} className={`chip ${fontScript === s.id ? "chip-active" : ""}`} onClick={() => setFontScript(s.id)}>{s.label}</button>
              ))}
            </div>
            <select className="field" value={font} onChange={(e) => patch(layer.id, { textFont: e.target.value })}>
              {FONT_FAMILIES.filter((f) => fontScript === "all" || f.script === fontScript).map((f) => (
                <option key={f.name} value={f.css} style={{ fontFamily: f.css }}>{f.name}</option>
              ))}
            </select>
            <div className="rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-[12px]"
              style={{ fontFamily: font, fontWeight: 700 }}>
              शुभ विवाह · Hindi 123 · ABC
            </div>
            <div className="flex items-center gap-2">
              <span className="label">Stroke 0–4px</span>
              <input type="range" min="0" max="4" step="0.5" className="flex-1" value={layer.textStroke ?? 0}
                onChange={(e) => patch(layer.id, { textStroke: +e.target.value })} />
              <span className="w-6 text-right font-mono text-zinc-400">{layer.textStroke ?? 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="label">Letter spacing</span>
              <input type="range" min="-4" max="16" step="1" className="flex-1" value={layer.textSpacing ?? 1}
                onChange={(e) => patch(layer.id, { textSpacing: +e.target.value })} />
              <span className="w-6 text-right font-mono text-zinc-400">{layer.textSpacing ?? 1}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="label">Speed</span>
              <input type="range" min="0" max="5" step="0.1" className="flex-1" value={layer.textSpeed ?? layer.speed ?? 1}
                onChange={(e) => patch(layer.id, { textSpeed: +e.target.value, speed: +e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <input type="color" value={(layer.textColors && layer.textColors[0]) || layer.color || "#ffffff"} onChange={(e) => patch(layer.id, { textColors: [e.target.value], color: e.target.value })} />
              <span className="text-zinc-500">Text colour</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
