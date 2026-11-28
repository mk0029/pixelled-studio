"use client";

import { useEffect, useState } from "react";
import { Icon } from "../icons";
import Inspector from "../Inspector";
import LeftDock from "../LeftDock";
import CompactLayerList, { type LayerAction } from "../panels/CompactLayerList";
import MatrixLayoutPanel from "../panels/MatrixLayoutPanel";
import LayersPanel from "../panels/LayersPanel";
import TextPanel from "../panels/TextPanel";
import AudioPanel from "../panels/AudioPanel";
import CharacterSpritesPanel from "../panels/CharacterSpritesPanel";
import DotsLinesPanel from "../panels/DotsLinesPanel";
import type { EffectId, Layer, Project } from "@/types/project";
import type { Preset } from "@/engine/presetLibrary";

export type SidebarTabId = "layouts" | "effects" | "layers" | "text" | "audio" | "sprites" | "dots";

interface TabDef {
  id: SidebarTabId;
  label: string;
  shortcut: string;
  icon: string;
  disabled?: boolean;
}

const TABS: TabDef[] = [
  { id: "layouts", label: "Matrix Layout", shortcut: "Alt+1", icon: "grid" },
  { id: "effects", label: "Effects / Library", shortcut: "Alt+2", icon: "sparkles" },
  { id: "layers", label: "Layers", shortcut: "Alt+3", icon: "layers" },
  { id: "sprites", label: "Sprites", shortcut: "Alt+4", icon: "image" },
  { id: "audio", label: "Audio", shortcut: "Alt+5", icon: "wifi", disabled: true },
];

type Commit = (updater: (p: Project) => Project, key?: string) => void;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeTab: SidebarTabId;
  onActiveTabChange: (tab: SidebarTabId) => void;
  project: Project;
  selected: Layer | null;
  time: number;
  /** Hide the project header while an overlay modal/drawer owns the screen. */
  modalOpen?: boolean;
  onProjects: () => void;
  onHardware: () => void;
  onNewShow: () => void;
  onSaveShow: () => void;
  onResetCanvas: () => void;
  onSaveJson: () => void;
  onLoadJson: () => void;
  onExportAvi: () => void;
  onLibrary: () => void;
  onFps: (fps: number) => void;
  onBrightness: (v: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onOpenSettings: () => void;
  onOpenTextSettings: () => void;
  onOpenDotsSettings: () => void;
  onAdd: (effect: EffectId, name?: string) => void;
  onAddVideo: () => void;
  onAddPreset: (preset: Preset) => void;
  onImportMedia: (file: File, onStatus: (message: string) => void, effect?: "media" | "character-video") => Promise<void>;
  onCommit: Commit;
  onMatrixChange: (cols: number, rows: number) => void;
  onSelectLayer: (id: string) => void;
  onLayer: (patch: Partial<Layer>) => void;
  onAction: (action: LayerAction, id?: string) => void;
  onGamma: (v: number) => void;
  onProject: (patch: Partial<Project>) => void;
  onAddKeyframe: () => void;
}

const card = "space-y-3 rounded-xl border border-white/10 bg-[#111827] p-3.5";

export default function OverlaySidebar(p: Props) {
  const [pinned, setPinned] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [title, setTitle] = useState(p.project.name);

  useEffect(() => {
    try { setPinned(localStorage.getItem("pixleled_sidebar_pinned_v1") === "1"); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem("pixleled_sidebar_pinned_v1", pinned ? "1" : "0"); } catch { /* ignore */ }
  }, [pinned]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT")) return;
      if (e.altKey) {
        const index = Number(e.key);
        if (index >= 1 && index <= TABS.length) {
          const tab = TABS[index - 1];
          if (tab?.disabled) return;
          e.preventDefault();
          p.onActiveTabChange(tab.id);
          p.onOpenChange(true);
        }
      }
      if (e.key === "Escape" && p.open) p.onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [p.open, p.onActiveTabChange, p.onOpenChange]);

  useEffect(() => setTitle(p.project.name), [p.project.name]);

  const toggleTab = (id: SidebarTabId) => {
    const tab = TABS.find((t) => t.id === id);
    if (tab?.disabled) return;
    if (p.activeTab === id && p.open) { p.onOpenChange(false); return; }
    p.onActiveTabChange(id);
    p.onOpenChange(true);
  };

  const commitTitle = () => {
    const next = title.trim();
    if (next && next !== p.project.name) p.onProject({ name: next });
    else setTitle(p.project.name);
  };

  const activeTab = TABS.find((t) => t.id === p.activeTab) ?? TABS[0];
  const hideProjectHeader = Boolean(p.modalOpen) || (p.open && p.activeTab !== "layers");
  const amps = (p.project.hardware.cols * p.project.hardware.rows * 0.06 * p.project.masterBrightness) / 100;

  const drawer = (
    <aside
      id="studio-drawer"
      role="region"
      aria-label="Studio tools"
      className={
        "flex min-h-0 flex-col border-white/10 bg-[#0B0F17] shadow-2xl " +
        (pinned
          ? "relative h-full w-[360px] shrink-0 border-r"
          : "absolute inset-y-0 left-12 z-30 w-[min(380px,calc(100vw-48px))] border-r")
      }
    >
      {/* Main header — suppressed while a panel/modal owns the screen */}
      {!hideProjectHeader && (
        <>
          <div className="flex h-10 shrink-0 items-center gap-1 border-b border-white/10 bg-[#111827] px-2">
            <input
              aria-label="Project title"
              title="Project title"
              className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1.5 py-1 text-[11px] font-semibold text-zinc-100 hover:border-white/10 focus:border-teal-400/50 focus:bg-white/[0.03] focus:outline-none"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
                if (e.key === "Escape") { setTitle(p.project.name); e.currentTarget.blur(); }
              }}
            />
            <div className="relative shrink-0"
              onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setMenuOpen(false); }}>
              <button type="button" className="btn h-9 px-2" title="Project menu" aria-expanded={menuOpen}
                onClick={() => setMenuOpen((v) => !v)}>Project ▾</button>
              {menuOpen && (
                <div className="absolute right-0 top-full z-40 mt-1 w-52 rounded-xl border border-white/10 bg-[#111827] p-1 shadow-2xl">
                  <button type="button" className="btn w-full justify-start border-transparent bg-transparent" onClick={() => { setMenuOpen(false); p.onNewShow(); }}>New Show</button>
                  <button type="button" className="btn w-full justify-start border-transparent bg-transparent" onClick={() => { setMenuOpen(false); p.onProjects(); }}>Saved Shows / Open</button>
                  <button type="button" className="btn w-full justify-start border-transparent bg-transparent" onClick={() => { setMenuOpen(false); p.onSaveShow(); }}>Save Show</button>
                  <button type="button" className="btn w-full justify-start border-transparent bg-transparent" onClick={() => { setMenuOpen(false); p.onSaveJson(); }}>Backup Project (.json)</button>
                  <button type="button" className="btn w-full justify-start border-transparent bg-transparent" onClick={() => { setMenuOpen(false); p.onLoadJson(); }}>Load Project (.json)</button>
                  <button type="button" className="btn w-full justify-start border-transparent bg-transparent" onClick={() => { setMenuOpen(false); p.onOpenSettings(); }}>Settings</button>
                  <div className="my-1 border-t border-white/10" />
                  <button type="button" className="btn w-full justify-start border-transparent bg-transparent text-red-400" onClick={() => { setMenuOpen(false); p.onResetCanvas(); }}>Reset Canvas</button>
                </div>
              )}
            </div>
          </div>
          <div className="flex h-[38px] shrink-0 items-center gap-1 border-b border-white/10 bg-[#111827] px-2">
            <button className={`btn btn-icon ${p.canUndo ? "" : "opacity-40"}`} title="Undo (Ctrl+Z)" aria-label="Undo" onClick={p.onUndo} disabled={!p.canUndo}><Icon name="undo" size={13} /></button>
            <button className={`btn btn-icon ${p.canRedo ? "" : "opacity-40"}`} title="Redo (Ctrl+Y)" aria-label="Redo" onClick={p.onRedo} disabled={!p.canRedo}><Icon name="redo" size={13} /></button>
            <button type="button" onClick={p.onHardware} title="Matrix size — Width × Height"
              className="mx-auto rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 font-mono text-[10px] tabular-nums text-teal-300">
              {p.project.hardware.cols}×{p.project.hardware.rows}
            </button>
            <button className="btn" onClick={p.onLibrary} title="Cloud library">Library</button>
            <button className="btn" onClick={p.onOpenTextSettings} title="Text settings">Text</button>
            <button className="btn" onClick={p.onOpenDotsSettings} title="Dots settings">Dots</button>
            <button className="btn btn-primary" onClick={p.onExportAvi} title="Export AVI">Export .avi</button>
          </div>
        </>
      )}

      {/* Zone 2 — one scroll container; Layers owns the stack, other tabs own their header */}
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain scroll-pb-4 py-4 pl-3 pr-3">
        {p.activeTab === "layers" ? (
          <section className={card}>
            <div className="flex items-center justify-between">
              <span className="label">Layer stack</span>
              <span className="font-mono text-[9px] tabular-nums text-zinc-500">{p.project.layers.length}</span>
            </div>
            <CompactLayerList
              project={p.project}
              selectedId={p.selected?.id ?? null}
              onSelectLayer={p.onSelectLayer}
              onAction={p.onAction}
              onCommit={p.onCommit}
              onAdd={p.onAdd}
              onAddVideo={p.onAddVideo}
            />
            <LayersPanel project={p.project} selectedId={p.selected?.id ?? null} onCommit={p.onCommit} />
          </section>
        ) : (
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 pb-2">
            <span className="text-[11px] font-semibold text-zinc-100">{activeTab.label}</span>
            <button type="button" className="btn btn-icon" title={`Close ${activeTab.label}`} aria-label={`Close ${activeTab.label}`}
              onClick={() => { p.onActiveTabChange("layers"); p.onOpenChange(false); }}>
              <Icon name="x" size={14} />
            </button>
          </div>
        )}

        {p.activeTab === "layouts" ? (
          <MatrixLayoutPanel project={p.project} onChange={p.onMatrixChange} />
        ) : p.activeTab === "effects" ? (
          <LeftDock embedded onAdd={p.onAdd} onAddPreset={p.onAddPreset} onImportMedia={p.onImportMedia} width="100%" />
        ) : p.activeTab === "layers" ? (
          <LayersPanel project={p.project} selectedId={p.selected?.id ?? null} onCommit={p.onCommit} />
        ) : p.activeTab === "audio" ? (
          <AudioPanel project={{ id: p.project.id, fps: p.project.fps, duration: p.project.duration }} />
        ) : p.activeTab === "sprites" ? (
          <CharacterSpritesPanel project={p.project} onCommit={p.onCommit} onAdd={p.onAdd} onImportMedia={p.onImportMedia} />
        ) : null}

        <details className="rounded-xl border border-white/10 bg-[#111827] p-3.5 text-[11px] text-zinc-300">
          <summary className="cursor-pointer list-none text-[11px] uppercase tracking-wider text-slate-400">Project settings</summary>
          <div className="space-y-3 pt-3">
            <div className="flex items-center gap-1">
              <span className="label mr-1">FPS</span>
              {[15, 24, 30, 60].map((f) => (
                <button key={f} type="button" onClick={() => p.onFps(f)}
                  className={`btn h-9 px-2 ${p.project.fps === f ? "chip-active" : ""}`}>{f}</button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="label">Master</span>
              <input type="range" min="0" max="100" step="1" className="min-w-0 flex-1" value={p.project.masterBrightness}
                onChange={(e) => p.onBrightness(+e.target.value)} title="Master brightness / power safety cap" />
              <span className="w-9 text-right font-mono text-[10px] tabular-nums text-zinc-400">{p.project.masterBrightness}%</span>
            </div>
            <div className="font-mono text-[10px] text-zinc-500">
              {p.project.hardware.cols}×{p.project.hardware.rows} · {p.project.hardware.colorOrder} · Est. {amps.toFixed(1)} A
            </div>
            <button type="button" className="btn w-full" onClick={p.onHardware}>Matrix geometry…</button>
          </div>
        </details>
      </div>
    </aside>
  );

  return (
    <div className={pinned ? "flex h-full shrink-0" : "relative h-full shrink-0"}>
      <nav aria-label="Studio tools" className="flex w-16 shrink-0 flex-col gap-1 border-r border-white/10 bg-[#0B0F17] p-1.5">
        {TABS.map((tab) => {
          const isActive = p.activeTab === tab.id;
          return (
            <button key={tab.id} type="button" disabled={tab.disabled} onClick={() => toggleTab(tab.id)}
              title={`${tab.label} (${tab.shortcut})`} aria-label={tab.label}
              aria-expanded={isActive && p.open} aria-controls="studio-drawer"
              aria-current={isActive ? "page" : undefined}
              className={`flex h-14 w-full flex-col items-center justify-center gap-0.5 rounded-md border text-[9px] font-semibold ${
                tab.disabled ? "cursor-not-allowed opacity-40" :
                isActive && p.open
                  ? "border-teal-400/50 bg-teal-400/10 text-teal-300"
                  : "border-transparent text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
              }`}>
              <Icon name={tab.icon} size={16} />
              <span className="truncate">{tab.label.split(" ")[0]}</span>
            </button>
          );
        })}

      </nav>
      {p.open ? drawer : null}
    </div>
  );
}
