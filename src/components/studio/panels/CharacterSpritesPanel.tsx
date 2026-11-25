"use client";

import type { Project } from "@/types/project";

interface Props {
  project: Project;
  onCommit: (updater: (p: Project) => Project, key?: string) => void;
  onAdd: (effect: string, name?: string) => void;
}

export default function CharacterSpritesPanel({ project, onCommit, onAdd }: Props) {
  const spriteLayers = project.layers.filter((l) => l.effect === "sprites");
  const patch = (id: string, p: Partial<Project["layers"][number]>) =>
    onCommit((proj) => ({ ...proj, layers: proj.layers.map((l) => (l.id === id ? { ...l, ...p } : l)) }), "sprite:patch");

  return (
    <div className="space-y-3 p-3 text-[11px] text-zinc-200">
      <div className="label mb-2">Characters & Sprites</div>
      <button className="btn w-full" onClick={() => onAdd("sprites", "Sprite Layer")}>Add Sprite Layer</button>
      {spriteLayers.length === 0 && <div className="text-zinc-500">No sprite layers.</div>}
      {spriteLayers.map((layer) => (
        <div key={layer.id} className="space-y-2 rounded border border-zinc-800 bg-zinc-900/60 p-2">
          <select className="field" value={layer.spriteType || "heart"} onChange={(e) => patch(layer.id, { spriteType: e.target.value })}>
            <option value="heart">Red Heart</option>
          </select>
          <div className="flex items-center gap-2">
            <span>Count</span>
            <input type="range" min="1" max="20" step="1" className="flex-1" value={layer.spriteCount ?? 1}
              onChange={(e) => patch(layer.id, { spriteCount: +e.target.value })} />
            <span>{layer.spriteCount ?? 1}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>Scale</span>
            <input type="range" min="0.5" max="4" step="0.5" className="flex-1" value={layer.spriteScale ?? 1}
              onChange={(e) => patch(layer.id, { spriteScale: +e.target.value })} />
          </div>
          <div className="flex items-center gap-2">
            <span>Speed</span>
            <input type="range" min="0.1" max="5" step="0.1" className="flex-1" value={layer.spriteSpeed ?? 1}
              onChange={(e) => patch(layer.id, { spriteSpeed: +e.target.value })} />
          </div>
          <select className="field" value={layer.spriteDirection || "right"} onChange={(e) => patch(layer.id, { spriteDirection: e.target.value })}>
            <option value="right">Right</option>
            <option value="left">Left</option>
            <option value="up">Up</option>
            <option value="down">Down</option>
          </select>
        </div>
      ))}
    </div>
  );
}
