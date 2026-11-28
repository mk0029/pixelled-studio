"use client";

import { useState } from "react";
import type { Layer, Project } from "@/types/project";
import CanvasViewport from "./CanvasViewport";
import Inspector from "./Inspector";
import CompactLayerList, { type LayerAction } from "./panels/CompactLayerList";
import LayersPanel from "./panels/LayersPanel";
import MatrixLayoutPanel from "./panels/MatrixLayoutPanel";
import RandomScatterPanel from "./panels/RandomScatterPanel";
import LeftDock from "./LeftDock";
import { Icon } from "./icons";

type Tab = "layers" | "edit" | "effects" | "scatter" | "matrix";

interface Props {
  project: Project;
  playing: boolean;
  loop: boolean;
  loopStart: number;
  loopEnd: number;
  seek: { t: number; nonce: number };
  time: number;
  duration: number;
  fps: number;
  selected: Layer | null;
  paused?: boolean;
  fontsReady?: boolean;
  onTime: (t: number) => void;
  onSeek: (t: number) => void;
  onEnd: () => void;
  onDeselect: () => void;
  onPlayPause: () => void;
  onTogglePitch: () => void;
  placeEmojiActive?: boolean;
  onPlaceEmoji?: (x: number, y: number) => void;
  onSelectLayer: (id: string) => void;
  onLayer: (patch: Partial<Layer>) => void;
  onAction: (action: LayerAction, id?: string) => void;
  onGamma: (v: number) => void;
  onProject: (patch: Partial<Project>) => void;
  onAddKeyframe: () => void;
  onCommit: (updater: (p: Project) => Project, key?: string) => void;
  onMatrixChange: (cols: number, rows: number) => void;
  onAdd: (effect: string, name?: string) => void;
  onAddPreset: (preset: any) => void;
  onAddVideo: () => void;
  onImportMedia: (file: File, onStatus: (message: string) => void, effect?: "media" | "character-video") => Promise<void>;
  onLibrary: () => void;
  onExport: () => void;
}

const TABS: [Tab, string, string][] = [
  ["layers", "Layers", "layers"],
  ["edit", "Edit", "sliders"],
  ["effects", "Effects", "sparkles"],
  ["scatter", "Scatter", "sparkles"],
  ["matrix", "Size", "grid"],
];

export default function MobileStudio(p: Props) {
  const [tab, setTab] = useState<Tab>("layers");
  const { cols, rows } = p.project.hardware;

  return (
    <main className="flex h-[100dvh] w-full flex-col overflow-hidden bg-[#0B0F17] text-zinc-100 select-none">
      <header className="flex min-h-12 shrink-0 items-center gap-2 border-b border-white/10 bg-[#0B0F17] px-3"
        style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-gradient-to-br from-blue-500 to-amber-500 text-[13px] font-black text-zinc-950">T</div>
        <span className="shrink-0 text-[11px] font-bold">PixleLED</span>
        <span className="rounded-full border border-white/10 bg-[#111827] px-2.5 py-1 font-mono text-[11px] tabular-nums text-teal-300">
          {cols}×{rows}
        </span>
        <button type="button" className="btn ml-auto" onClick={p.onLibrary}>Library</button>
        <button type="button" className="btn btn-primary" onClick={p.onExport}>Export .avi</button>
      </header>

      <div className="flex h-[40dvh] min-h-0 shrink-0 flex-col border-b border-white/10 bg-[#0B0F17]">
        <CanvasViewport
          project={p.project}
          playing={p.playing}
          loop={p.loop}
          loopStart={p.loopStart}
          loopEnd={p.loopEnd}
          seek={p.seek}
          time={p.time}
          duration={p.duration}
          fps={p.fps}
          onTime={p.onTime}
          onSeek={p.onSeek}
          onEnd={p.onEnd}
          onDeselect={p.onDeselect}
          onPlayPause={p.onPlayPause}
          onTogglePitch={p.onTogglePitch}
          placeEmojiActive={p.placeEmojiActive}
          onPlaceEmoji={p.onPlaceEmoji}
          paused={p.paused}
          fontsReady={p.fontsReady}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col bg-[#0B0F17]" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="max-h-20 shrink-0 overflow-y-auto overscroll-contain border-b border-white/10 p-2">
          <CompactLayerList
            project={p.project}
            selectedId={p.selected?.id ?? null}
            onSelectLayer={p.onSelectLayer}
            onAction={p.onAction}
            onCommit={p.onCommit}
            onAdd={p.onAdd}
            onAddVideo={p.onAddVideo}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-pb-4 p-3">
          {tab === "layers" && (
            <LayersPanel project={p.project} selectedId={p.selected?.id ?? null} onCommit={p.onCommit} />
          )}
          {tab === "edit" && (
            <Inspector
              embedded
              project={p.project}
              layer={p.selected}
              time={p.time}
              onLayer={p.onLayer}
              onAction={p.onAction}
              onGamma={p.onGamma}
              onProject={p.onProject}
              onAddKeyframe={p.onAddKeyframe}
            />
          )}
          {tab === "effects" && (
            <LeftDock embedded onAdd={p.onAdd} onAddPreset={p.onAddPreset} onImportMedia={p.onImportMedia} width="100%" />
          )}
          {tab === "scatter" && (
            p.selected ? (
              <RandomScatterPanel layer={p.selected} onLayer={p.onLayer} width={cols} height={rows} />
            ) : (
              <div className="rounded-xl border border-white/10 bg-[#111827] p-3.5 text-[11px] text-zinc-500">Select a layer to configure scatter.</div>
            )
          )}
          {tab === "matrix" && <MatrixLayoutPanel project={p.project} onChange={p.onMatrixChange} />}
        </div>

        <nav className="grid h-12 shrink-0 grid-cols-5 border-t border-white/10 bg-[#111827]" aria-label="Mobile studio tools">
          {TABS.map(([id, label, icon]) => (
            <button key={id} type="button" aria-current={tab === id ? "page" : undefined}
              onClick={() => setTab(id)}
              className={`flex min-h-[44px] flex-col items-center justify-center gap-0.5 text-[9px] font-semibold ${
                tab === id ? "text-teal-300" : "text-zinc-400"
              }`}>
              <Icon name={icon} size={16} />
              {label}
            </button>
          ))}
        </nav>
      </div>
    </main>
  );
}
