"use client";

import { useEffect, useState } from "react";
import { Icon } from "../icons";
import LeftDock from "../LeftDock";
import LayoutsPanel from "../panels/LayoutsPanel";
import LayersPanel from "../panels/LayersPanel";
import TextPanel from "../panels/TextPanel";
import AudioPanel from "../panels/AudioPanel";
import TechnicianToolsPanel from "../panels/TechnicianToolsPanel";
import CharacterSpritesPanel from "../panels/CharacterSpritesPanel";
import type { Project } from "@/types/project";
import { getController, getChipset } from "@/types/hardware";

export type SidebarTabId = "layouts" | "effects" | "layers" | "text" | "audio" | "media" | "tools" | "sprites";

interface TabDef {
  id: SidebarTabId;
  label: string;
  shortcut: string;
  icon: string;
  phase: string;
}

const TABS: TabDef[] = [
  { id: "layouts", label: "Layouts & Wiring", shortcut: "Alt+1", icon: "cpu", phase: "Phase 1" },
  { id: "effects", label: "320+ Effects & Chakras", shortcut: "Alt+2", icon: "sparkles", phase: "Phase 2" },
  { id: "layers", label: "Layers & Blend", shortcut: "Alt+3", icon: "layers", phase: "Phase 3" },
  { id: "text", label: "Hindi/English Text", shortcut: "Alt+4", icon: "sliders", phase: "Phase 3" },
  { id: "audio", label: "Audio Beat-Sync", shortcut: "Alt+5", icon: "wifi", phase: "Phase 3" },
  { id: "media", label: "Media & Python Import", shortcut: "Alt+6", icon: "image", phase: "Phase 4" },
  { id: "tools", label: "Technician Tools & SMPS", shortcut: "Alt+7", icon: "shield", phase: "Phase 5" },
  { id: "sprites", label: "Characters & Sprites", shortcut: "Alt+8", icon: "sparkles", phase: "Phase 6" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeTab: SidebarTabId;
  onActiveTabChange: (tab: SidebarTabId) => void;
  project: Project;
  map: import("@/engine/wiringMapper").WiringMap;
  onProjects: () => void;
  onHardware: () => void;
  onRename: () => void;
  onDeleteProject: () => void;
  onSaveJson: () => void;
  onLoadJson: () => void;
  onExportLed: () => void;
  onExportAvi: () => void;
  onFps: (fps: number) => void;
  onBrightness: (v: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onOpenSettings: () => void;
  onAdd: (effect: string, name?: string) => void;
  onAddPreset: (preset: import("@/engine/presetLibrary").Preset) => void;
  onImportMedia: (file: File, onStatus: (message: string) => void) => Promise<void>;
  onApplyHardware: (hardware: import("@/types/hardware").HardwareConfig) => void;
  onCommit: (updater: (p: import("@/types/project").Project) => import("@/types/project").Project, key?: string) => void;
}

export default function OverlaySidebar(p: Props) {
  const [pinned, setPinned] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    try {
      setPinned(localStorage.getItem("pixleled_sidebar_pinned_v1") === "1");
    } catch { /* ignore */ }
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
        if (index >= 1 && index <= 8) {
          e.preventDefault();
          const tab = TABS[index - 1];
          p.onActiveTabChange(tab.id);
          p.onOpenChange(true);
        }
      }
      if (e.key === "Escape" && p.open) p.onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [p.open, p.onActiveTabChange, p.onOpenChange]);

  const toggleTab = (id: SidebarTabId) => {
    if (p.activeTab === id && p.open) {
      p.onOpenChange(false);
      return;
    }
    p.onActiveTabChange(id);
    p.onOpenChange(true);
  };

  const activeTab = TABS.find((t) => t.id === p.activeTab) ?? TABS[0];
  const ctl = getController(p.project.hardware.controllerId);
  const chip = getChipset(p.project.hardware.chipsetId);
  const amps = (p.project.hardware.cols * p.project.hardware.rows * 0.06 * p.project.masterBrightness) / 100;

  const drawer = (
    <aside
      id="studio-drawer"
      role="region"
      aria-labelledby="drawer-title"
      className={
        "flex flex-col border-zinc-800 bg-[#0F172A]/95 " +
        (pinned
          ? "relative h-full w-[360px] shrink-0 border-r"
          : "fixed inset-x-0 bottom-0 z-40 h-[78vh] w-full border-t md:absolute md:left-14 md:top-0 md:h-full md:w-[360px] md:border-t-0 md:border-r")
      }
    >
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-zinc-800 px-3">
        <h2 id="drawer-title" className="min-w-0 flex-1 truncate text-[12px] font-semibold text-zinc-100">
          {activeTab.label}
        </h2>
        <button
          type="button"
          onClick={() => setPinned((v) => !v)}
          className="btn btn-icon"
          title={pinned ? "Unpin drawer" : "Pin drawer"}
          aria-pressed={pinned}
        >
          <Icon name={pinned ? "x" : "layers"} size={13} />
        </button>
        <button type="button" onClick={() => p.onOpenChange(false)} className="btn btn-icon" title="Close (Esc)" aria-label="Close drawer">
          <Icon name="x" size={13} />
        </button>
      </div>

      {p.activeTab === "tools" && (
        <div className="shrink-0 space-y-2 border-b border-zinc-800 p-3">
          <div className="flex items-center gap-2">
            <button
              onClick={p.onRename}
              title="Rename project"
              className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-zinc-800 px-2 py-1 hover:border-blue-400/50 hover:bg-zinc-900"
            >
              <Icon name="sliders" size={13} />
              <span className="truncate text-[11px] font-semibold text-zinc-100">{p.project.name}</span>
            </button>
            <button onClick={p.onProjects} title="Open Project Launcher / New Project" className="btn btn-icon">
              <Icon name="folder" size={13} />
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button className="btn btn-icon" onClick={p.onUndo} disabled={!p.canUndo} title="Undo (Ctrl+Z)"><Icon name="undo" /></button>
            <button className="btn btn-icon" onClick={p.onRedo} disabled={!p.canRedo} title="Redo (Ctrl+Y)"><Icon name="redo" /></button>
            <button onClick={p.onHardware} title="Open hardware & wiring configurator" className="flex items-center gap-2 rounded-md border border-teal-500/30 bg-teal-500/[.07] px-2 py-1 hover:border-teal-400/60">
              <Icon name="cpu" size={14} />
              <span className="text-[11px] font-semibold text-teal-300">{ctl.id}</span>
            </button>
          </div>

          <div className="flex items-center gap-1">
            <span className="label mr-1">FPS</span>
            {[15, 24, 30, 60].map((f) => (
              <button key={f} onClick={() => p.onFps(f)}
                className={`rounded px-2 py-1 text-[10px] font-semibold ${p.project.fps === f ? "bg-blue-500/15 text-blue-300" : "text-zinc-500 hover:text-zinc-200"}`}>
                {f}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button onClick={p.onExportLed} className="btn flex-1">Export .led</button>
            <button onClick={p.onOpenSettings} className="btn btn-icon" title="Studio settings"><Icon name="sliders" /></button>
          </div>

          <div className="flex items-center gap-2">
            <span className="label">Master</span>
            <input type="range" min="0" max="100" step="1" className="flex-1" value={p.project.masterBrightness}
              onChange={(e) => p.onBrightness(+e.target.value)} title="Master brightness / power safety cap" />
            <span className="w-8 font-mono text-[10px] text-zinc-400">{p.project.masterBrightness}%</span>
          </div>

          <div className="text-[10px] text-zinc-500">
            {p.project.hardware.cols}×{p.project.hardware.rows} · {chip.name} · Est. {amps.toFixed(1)} A
          </div>
        </div>
      )}

      <div className="shrink-0 border-b border-zinc-800 p-2">
        <input className="field" placeholder="Quick search..." value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Quick search" />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {p.activeTab === "layouts" ? (
          <LayoutsPanel project={p.project} onApply={p.onApplyHardware} />
        ) : p.activeTab === "effects" ? (
          <LeftDock onAdd={p.onAdd} onAddPreset={p.onAddPreset} onImportMedia={p.onImportMedia} width="100%" />
        ) : p.activeTab === "layers" ? (
          <LayersPanel project={p.project} onCommit={p.onCommit} />
        ) : p.activeTab === "text" ? (
          <TextPanel project={p.project} onCommit={p.onCommit} onAddText={() => p.onAdd("text", "Text Layer")} />
        ) : p.activeTab === "audio" ? (
          <AudioPanel project={{ id: p.project.id, fps: p.project.fps, duration: p.project.duration }} />
        ) : p.activeTab === "tools" ? (
          <TechnicianToolsPanel project={p.project} map={p.map} />
        ) : p.activeTab === "sprites" ? (
          <CharacterSpritesPanel project={p.project} onCommit={p.onCommit} onAdd={p.onAdd} />
        ) : (
          <div className="space-y-3 p-4">
            <div className="label">{activeTab.phase}</div>
            <h3 className="text-[13px] font-semibold text-zinc-100">{activeTab.label}</h3>
            <p className="text-[11px] leading-relaxed text-zinc-500">
              This panel slot is ready. Its tools will be plugged in during {activeTab.phase}.
            </p>
            <div className="rounded-lg border border-dashed border-zinc-800 p-4 text-center text-[10px] text-zinc-600">
              Placeholder slot
            </div>
          </div>
        )}
      </div>
    </aside>
  );

  return (
    <div className={pinned ? "flex h-full shrink-0 flex-col md:flex-row" : "relative h-full shrink-0"}>
      <nav aria-label="Studio Tools" className="flex w-12 shrink-0 flex-col gap-1 border-r border-zinc-800 bg-zinc-950 p-1.5 md:w-14">
        {TABS.map((tab) => {
          const isActive = p.activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => toggleTab(tab.id)}
              title={`${tab.label} (${tab.shortcut})`}
              aria-label={tab.label}
              aria-expanded={isActive && p.open}
              aria-controls="studio-drawer"
              aria-current={isActive ? "page" : undefined}
              className={
                "flex h-11 w-11 items-center justify-center rounded-md border text-zinc-400 " +
                (isActive && p.open
                  ? "border-blue-500/60 bg-blue-500/10 text-blue-300"
                  : "border-transparent hover:bg-zinc-900 hover:text-zinc-200")
              }
            >
              <Icon name={tab.icon} size={18} />
            </button>
          );
        })}
      </nav>

      {p.open ? drawer : null}
    </div>
  );
}
