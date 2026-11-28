"use client";

import { useState } from "react";
import type { EffectId, Project } from "@/types/project";
import { Icon } from "../icons";

export type LayerAction = "delete" | "duplicate" | "split" | "up" | "down";

interface Props {
  project: Project;
  selectedId: string | null;
  onSelectLayer: (id: string) => void;
  onAction: (action: LayerAction, id?: string) => void;
  onCommit: (updater: (p: Project) => Project, key?: string) => void;
  onAdd: (effect: EffectId, name?: string) => void;
  onAddVideo: () => void;
}

export default function CompactLayerList(p: Props) {
  const [addOpen, setAddOpen] = useState(false);

  const add = (effect: EffectId, name?: string) => {
    setAddOpen(false);
    p.onAdd(effect, name);
  };

  return (
    <div className="space-y-1.5 text-[11px] text-zinc-200">
      {p.project.layers.length === 0 && <div className="px-1 py-2 text-zinc-500">No layers yet — add one below.</div>}
      {p.project.layers.map((layer) => (
        <div key={layer.id}
          className={`flex items-center gap-1 rounded-lg border bg-[#111827] px-1.5 py-1 ${
            p.selectedId === layer.id ? "border-teal-400/60" : "border-white/10"
          }`}>
          <button type="button" className="min-w-0 flex-1 truncate px-1 py-1 text-left font-semibold"
            aria-current={p.selectedId === layer.id ? "true" : undefined}
            onClick={() => p.onSelectLayer(layer.id)}>{layer.name}</button>
          <button type="button" className="btn btn-icon h-7 w-7" title={layer.enabled ? "Hide layer" : "Show layer"}
            aria-label={layer.enabled ? "Hide layer" : "Show layer"}
            onClick={() => p.onCommit((proj) => ({
              ...proj,
              layers: proj.layers.map((l) => l.id === layer.id ? { ...l, enabled: !l.enabled } : l),
            }), "layer:toggle")}>
            <Icon name={layer.enabled ? "eye" : "eyeOff"} size={12} />
          </button>
          <button type="button" className="btn btn-icon h-7 w-7" title="Move up" aria-label="Move layer up"
            onClick={() => p.onAction("up", layer.id)}><Icon name="up" size={12} /></button>
          <button type="button" className="btn btn-icon h-7 w-7" title="Move down" aria-label="Move layer down"
            onClick={() => p.onAction("down", layer.id)}><Icon name="down" size={12} /></button>
          <button type="button" className="btn btn-icon h-7 w-7 text-red-400 hover:bg-red-500/10" title="Delete layer" aria-label="Delete layer"
            onClick={() => p.onAction("delete", layer.id)}><Icon name="trash" size={12} /></button>
        </div>
      ))}

      <div className="relative">
        <button type="button" className="btn w-full border-dashed border-white/20 bg-white/[0.03]"
          aria-expanded={addOpen} onClick={() => setAddOpen((v) => !v)}>
          <Icon name="plus" size={13} /> Add Layer
        </button>
        {addOpen && (
          <div className="mt-1 space-y-1 rounded-lg border border-white/10 bg-[#0B0F17] p-1 shadow-2xl">
            <button type="button" className="btn w-full justify-start border-transparent bg-transparent" onClick={() => add("text", "Text Layer")}>Text</button>
            <button type="button" className="btn w-full justify-start border-transparent bg-transparent" onClick={() => add("dots-lines", "Dots / Lines")}>Dots / Lines</button>
            <button type="button" className="btn w-full justify-start border-transparent bg-transparent" onClick={() => add("character-video", "2D Character / Flower")}>2D Character / Flower</button>
            <button type="button" className="btn w-full justify-start border-transparent bg-transparent" onClick={() => { setAddOpen(false); p.onAddVideo(); }}>Video</button>
          </div>
        )}
      </div>
    </div>
  );
}
