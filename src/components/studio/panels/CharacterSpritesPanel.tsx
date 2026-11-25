"use client";

import { useRef, useState } from "react";
import { CHARACTER_VIDEO_PRESETS } from "@/engine/effects/characterSprites";
import type { Project } from "@/types/project";

interface Props {
  project: Project;
  onCommit: (updater: (p: Project) => Project, key?: string) => void;
  onAdd: (effect: string, name?: string) => void;
  onImportMedia: (file: File, onStatus: (message: string) => void, effect?: "media" | "character-video") => Promise<void>;
}

export default function CharacterSpritesPanel({ project, onCommit, onAdd, onImportMedia }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const videoLayers = project.layers.filter((l) => l.effect === "character-video");
  const spriteLayers = project.layers.filter((l) => l.effect === "sprites");
  const patch = (id: string, p: Partial<Project["layers"][number]>) =>
    onCommit((proj) => ({ ...proj, layers: proj.layers.map((l) => (l.id === id ? { ...l, ...p } : l)) }), "character:patch");

  const importFile = async (file: File) => {
    setBusy(true);
    setStatus("Importing…");
    try {
      await onImportMedia(file, setStatus, "character-video");
      setStatus(`Added ${file.name}`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const slider = (label: string, value: number, min: number, max: number, step: number, apply: (v: number) => void, unit = "") => (
    <label className="block">
      <div className="mb-1 flex justify-between"><span className="label">{label}</span><span className="font-mono text-zinc-400">{value}{unit}</span></div>
      <input type="range" min={min} max={max} step={step} value={value} className="w-full" onChange={(e) => apply(+e.target.value)} />
    </label>
  );

  return (
    <div className="space-y-3 p-3 text-[11px] text-zinc-200">
      <div className="label mb-2">Characters & Video</div>
      <div className="flex gap-2">
        <button className="btn flex-1" onClick={() => onAdd("character-video", "Character Video")}>Add Character / Video</button>
        <button className="btn flex-1" disabled={busy} onClick={() => fileRef.current?.click()}>Import clip</button>
      </div>
      <input ref={fileRef} type="file" hidden accept=".mp4,.webm,.gif,.avi,video/*,image/gif"
        onChange={(e) => e.target.files?.[0] && void importFile(e.target.files[0])} />
      {status && <div className="text-[10px] text-zinc-500">{status}</div>}
      {videoLayers.length === 0 && spriteLayers.length === 0 && <div className="text-zinc-500">No character layers yet.</div>}

      {videoLayers.map((layer) => (
        <div key={layer.id} className="space-y-2 rounded border border-teal-500/20 bg-teal-500/[.03] p-2">
          <div className="font-semibold">{layer.name}</div>
          {!layer.mediaSrc && (
            <select className="field" value={layer.spriteType || CHARACTER_VIDEO_PRESETS[0].id}
              onChange={(e) => patch(layer.id, { spriteType: e.target.value })}>
              {CHARACTER_VIDEO_PRESETS.map((preset) => <option key={preset.id} value={preset.id}>{preset.name}</option>)}
            </select>
          )}
          {layer.mediaSrc && <div className="text-[10px] text-zinc-500">Loaded clip: {layer.mediaSrc.startsWith("data:") ? "sampled frames" : layer.mediaSrc}</div>}
          {slider("Scale", Math.max(0.1, Math.min(3, layer.mediaScale ?? 1)), 0.1, 3, 0.05, (v) => patch(layer.id, { mediaScale: v, mediaScaleY: v }), "×")}
          {slider("Speed", Math.max(0.25, Math.min(3, layer.mediaSpeed ?? 1)), 0.25, 3, 0.05, (v) => patch(layer.id, { mediaSpeed: v }), "×")}
          {slider("X offset", layer.mediaOffsetX ?? 0, -100, 100, 1, (v) => patch(layer.id, { mediaOffsetX: v }), " px")}
          {slider("Y offset", layer.mediaOffsetY ?? 0, -100, 100, 1, (v) => patch(layer.id, { mediaOffsetY: v }), " px")}
          <label className="flex items-center gap-2 text-[11px] text-zinc-400">
            <input type="checkbox" checked={!!layer.mediaFlipX} onChange={(e) => patch(layer.id, { mediaFlipX: e.target.checked })} />
            Flip horizontal
          </label>
          <label className="flex items-center gap-2 text-[11px] text-zinc-400">
            <input type="checkbox" checked={!!layer.mediaSilhouette} onChange={(e) => patch(layer.id, { mediaSilhouette: e.target.checked })} />
            High-contrast silhouette
          </label>
          {slider("Threshold", layer.mediaThreshold ?? 0, 0, 255, 1, (v) => patch(layer.id, { mediaThreshold: v }))}
          {slider("Brightness", layer.mediaBrightness ?? 100, 0, 200, 1, (v) => patch(layer.id, { mediaBrightness: v }), "%")}
          {slider("Contrast", layer.mediaContrast ?? 100, 0, 200, 1, (v) => patch(layer.id, { mediaContrast: v }), "%")}
          {slider("Saturation", layer.mediaSaturation ?? 100, 0, 200, 1, (v) => patch(layer.id, { mediaSaturation: v }), "%")}
          <label className="flex items-center gap-2 text-[11px] text-zinc-400">
            <input type="checkbox" checked={!!layer.mediaChromaEnabled} onChange={(e) => patch(layer.id, { mediaChromaEnabled: e.target.checked })} />
            Chroma key
          </label>
          {layer.mediaChromaEnabled && (
            <>
              <div className="flex gap-2">
                {["#000000", "#00ff00"].map((color) => (
                  <button key={color} className={`chip ${layer.mediaChromaColor === color ? "chip-active" : ""}`}
                    onClick={() => patch(layer.id, { mediaChromaColor: color })}>{color}</button>
                ))}
              </div>
              {slider("Tolerance", Math.round((layer.mediaChromaTolerance ?? 0.35) * 100), 0, 100, 1,
                (v) => patch(layer.id, { mediaChromaTolerance: v / 100 }), "%")}
            </>
          )}
          <label className="block">
            <div className="mb-1 label">Blend</div>
            <select className="field" value={layer.blend} onChange={(e) => patch(layer.id, { blend: e.target.value as any })}>
              <option value="normal">Normal</option>
              <option value="screen">Screen</option>
              <option value="lighter">Lighter</option>
            </select>
          </label>
        </div>
      ))}

      {spriteLayers.map((layer) => (
        <div key={layer.id} className="space-y-2 rounded border border-zinc-800 bg-zinc-900/60 p-2">
          <div className="font-semibold">{layer.name}</div>
          <select className="field" value={layer.spriteType || "heart"} onChange={(e) => patch(layer.id, { spriteType: e.target.value })}>
            <option value="heart">Beating Heart</option>
          </select>
          {slider("Count", layer.spriteCount ?? 1, 1, 20, 1, (v) => patch(layer.id, { spriteCount: v }))}
          {slider("Scale", layer.spriteScale ?? 1, 0.5, 4, 0.5, (v) => patch(layer.id, { spriteScale: v }))}
          {slider("Speed", layer.spriteSpeed ?? 1, 0.25, 3, 0.05, (v) => patch(layer.id, { spriteSpeed: v }))}
        </div>
      ))}
    </div>
  );
}
