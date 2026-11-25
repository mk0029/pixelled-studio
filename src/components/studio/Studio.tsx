"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildWiringMap } from "@/engine/wiringMapper";
import { getMathEffect } from "@/engine/mathCatalog";
import { type Preset } from "@/engine/presetLibrary";
import { deleteSavedProject, loadProject, openSavedProject, readAutosave, saveProjectRecord } from "@/lib/projectStore";
import { deleteCurrentProject } from "@/lib/db";
import { useProjectHistory } from "@/lib/history";
import { clampLayerTiming, defaultProject, EFFECTS, effectiveDuration, makeLayer, normalizeProject, type EffectId, type Layer, type Project } from "@/types/project";
import { swfFileFor, isOnline } from "@/lib/swfEffects";
import type { HardwareConfig } from "@/types/hardware";
import { DEFAULT_HARDWARE } from "@/types/hardware";
import CanvasViewport from "./CanvasViewport";
import ExportModal from "./ExportModal";

import HardwareModal from "./HardwareModal";
import Inspector from "./Inspector";
import ProjectLauncherModal, { type NewProjectConfig } from "./ProjectLauncherModal";
import { AnimatePresence, motion } from "framer-motion";
import type { ExportFormat } from "@/engine/exporters";
import { importGif, importImageFile, importSfx, importSwf, importVideo, type ImportedMedia } from "@/engine/mediaImport";
import { importAviUrl } from "@/lib/aviImporter";
import LeftDock from "./LeftDock";
import OverlaySidebar, { type SidebarTabId } from "./shell/OverlaySidebar";
import { migrateLocalStorageProjects } from "@/lib/db";import ResizeHandle from "./ResizeHandle";
import Timeline from "./Timeline";
import TopBar from "./TopBar";
import TransportBar from "./TransportBar";
import StudioSettingsModal from "./StudioSettingsModal";
import { useStudioSettings } from "@/context/StudioSettingsContext";

const MotionExport = motion.create(ExportModal);

type Action = "delete" | "duplicate" | "split" | "up" | "down" | "trimStart" | "trimEnd" | "snapStart" | "chain";

const LAUNCHER_SEEN_KEY = "pixleled_launcher_seen_v1";

function readSavedHw(): HardwareConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("pixleled_hw_v1");
    if (!raw) return null;
    return { ...DEFAULT_HARDWARE, ...JSON.parse(raw) };
  } catch { return null; }
}

const clampSize = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
interface Layout { left: number; right: number; timeline: number }
const defaultLayout = (): Layout => ({ left: 288, right: 320, timeline: 256 });
function readLayout(): Layout {
  if (typeof window === "undefined") return defaultLayout();
  try {
    const s = JSON.parse(localStorage.getItem("tohran-layout") ?? "{}");
    return { ...defaultLayout(), ...s };
  } catch { return defaultLayout(); }
}

export default function Studio({ onHome }: { onHome?: () => void }) {
  const initial = useMemo(() => defaultProject(), []);
  const { project, commit, reset, undo, redo, jumpTo, clear, canUndo, canRedo, entries, currentIndex } = useProjectHistory(initial);
  const { settings } = useStudioSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<SidebarTabId>("layouts");
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(initial.layers[0]?.id ?? null);
  const [playing, setPlaying] = useState(false);
  const [loop, setLoop] = useState(true);
  const [split, setSplit] = useState(false);
  const [uiTime, setUiTime] = useState(0);
  const uiTimeRef = useRef(0);
  uiTimeRef.current = uiTime;
  const [seek, setSeek] = useState({ t: 0, nonce: 0 });
  const [modal, setModal] = useState<{ open: boolean; isNew: boolean }>({ open: false, isNew: false });
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [exportModal, setExportModal] = useState<{ open: boolean; format: ExportFormat }>({ open: false, format: "zip" });
  const [fontsReady, setFontsReady] = useState(true);

  const zoomControlsRef = useRef<{ zoomIn: () => void; zoomOut: () => void; fit: () => void; hundred: () => void } | null>(null);
  const libraryLoadedRef = useRef(false);
  const [layout, setLayout] = useState(readLayout);
  const [timelineCollapsed, setTimelineCollapsed] = useState(false);
  const [saveState, setSaveState] = useState<"loading" | "saved" | "saving" | "error">("loading");
  const MIN_DURATION = 1;
  const importRef = useRef<HTMLInputElement>(null);
  const hydrated = useRef(false);
  const choiceRef = useRef(false);
  const bootRef = useRef(false);

  const map = useMemo(() => buildWiringMap(project.hardware), [project.hardware]);
  const selected = project.layers.find((l) => l.id === selectedId) ?? null;
  const textFontKey = project.layers
    .filter((l) => l.effect === "text" || l.kind === "text")
    .map((l) => l.textFont ?? "")
    .join("|");

  useEffect(() => {
    if (!textFontKey) { setFontsReady(true); return; }
    let cancelled = false;
    setFontsReady(false);
    void (async () => {
      const { preloadProjectFonts } = await import("@/engine/fontFamilies");
      await preloadProjectFonts(project);
      if (!cancelled) setFontsReady(true);
    })();
    return () => { cancelled = true; };
  }, [textFontKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const doSeek = useCallback((t: number) => {
    const clamped = Math.max(0, Math.min(project.duration, t));
    setSeek((s) => ({ t: clamped, nonce: s.nonce + 1 }));
    setUiTime(clamped);
  }, [project.duration]);

  useEffect(() => {
    if (project.layers.length === 0) {
      setPlaying(false);
      doSeek(0);
    }
  }, [project.layers.length, doSeek]);

  // Show the launcher on first Studio entry only. Reloads restore silently.
  useEffect(() => {
    if (bootRef.current) return; // StrictMode double-invoke
    bootRef.current = true;
    void migrateLocalStorageProjects();
    let seen = false;
    try {
      seen = sessionStorage.getItem(LAUNCHER_SEEN_KEY) === "1";
      sessionStorage.setItem(LAUNCHER_SEEN_KEY, "1");
    } catch { /* storage unavailable */ }
    hydrated.current = true;

    if (!seen) {
      setLauncherOpen(true);
      setSaveState("saved");
      return;
    }

    choiceRef.current = true;
    setLauncherOpen(false);
    setSaveState("loading");
    loadProject().then((stored) => {
      if (stored?.layers && stored.hardware) {
        reset(normalizeProject(stored));
        setSelectedId(stored.layers[0]?.id ?? null);
      } else {
        const next = defaultProject();
        const savedHw = readSavedHw();
        if (savedHw) next.hardware = { ...DEFAULT_HARDWARE, ...savedHw };
        reset(next);
        setSelectedId(null);
      }
      setSaveState("saved");
    }).catch(() => setSaveState("error"));
  }, [reset]);

  useEffect(() => {
    if (!settings.autoSaveProject) return;
    if (!hydrated.current || !choiceRef.current || saveState === "loading") return;
    setSaveState("saving");
    const id = setTimeout(() => {
      saveProjectRecord(project).then(() => setSaveState("saved")).catch(() => setSaveState("error"));
    }, 450);
    return () => clearTimeout(id);
  }, [project, settings.autoSaveProject]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    localStorage.setItem("tohran-layout", JSON.stringify(layout));
  }, [layout]);

  useEffect(() => {
    try { localStorage.setItem("pixleled_hw_v1", JSON.stringify(project.hardware)); } catch {}
  }, [project.hardware]);
  useEffect(() => {
    try { localStorage.setItem("pixleled_prefs_v1", JSON.stringify({ fps: project.fps, masterBrightness: project.masterBrightness })); } catch {}
  }, [project.fps, project.masterBrightness]);

  useEffect(() => {
    // Sequence end follows the clips: shrink as well as grow, so the playhead
    // can never run past the last clip into empty space.
    const needed = effectiveDuration(project);
    if (Math.abs(needed - project.duration) > 0.001) {
      commit((p) => ({ ...p, duration: needed }), "auto:duration");
    }
  }, [project.layers, project.duration, commit, project]);

  useEffect(() => {
    const ed = effectiveDuration(project);
    if (uiTime > ed + 0.001) doSeek(ed);
  }, [project.layers, uiTime, doSeek, project]);

  const patchLayer = useCallback((id: string, patch: Partial<Layer>) => {
    commit((p) => {
      const target = p.layers.find((l) => l.id === id);
      if (!target) return p;
      const patched = clampLayerTiming({ ...target, ...patch }, Math.max(p.duration, (target.startTime + (patch.duration ?? target.duration)) + 0.1));
      const newDuration = Math.max(p.duration, patched.startTime + patched.duration);
      return {
        ...p,
        duration: newDuration,
        layers: p.layers.map((l) => l.id === id ? clampLayerTiming({ ...l, ...patch }, newDuration) : l),
      };
    }, `patch:${id}:${Object.keys(patch).join(",")}`);
  }, [commit]);

  const doAction = useCallback((action: Action, id?: string) => {
    const targetId = id ?? selectedId;
    if (!targetId) return;
    if (action === "delete" && settings.confirmLayerDelete && !window.confirm("Delete this layer?")) return;
    commit((p) => {
      const index = p.layers.findIndex((l) => l.id === targetId);
      if (index < 0) return p;
      const layer = p.layers[index];
      const layers = [...p.layers];
      if (action === "delete") {
        layers.splice(index, 1);
        return { ...p, layers };
      }
      if (action === "duplicate") {
        layers.splice(index + 1, 0, { ...layer, id: Math.random().toString(36).slice(2, 9), name: `${layer.name} copy`, keyframes: layer.keyframes.map((k) => ({ ...k, id: Math.random().toString(36).slice(2, 9) })) });
        return { ...p, layers };
      }
      if (action === "up" && index < layers.length - 1) {
        [layers[index], layers[index + 1]] = [layers[index + 1], layers[index]];
        return { ...p, layers };
      }
      if (action === "down" && index > 0) {
        [layers[index], layers[index - 1]] = [layers[index - 1], layers[index]];
        return { ...p, layers };
      }
      if (action === "split") {
        const t = uiTime;
        if (t <= layer.startTime || t >= layer.startTime + layer.duration) return p;
        const left = clampLayerTiming({ ...layer, duration: t - layer.startTime }, p.duration);
        const right = clampLayerTiming({
          ...layer, id: Math.random().toString(36).slice(2, 9), name: `${layer.name} B`,
          startTime: t, duration: layer.startTime + layer.duration - t,
        }, p.duration);
        layers.splice(index, 1, left, right);
        return { ...p, layers };
      }
      if (action === "trimStart") {
        const t = uiTime;
        const startTime = Math.max(0, Math.min(layer.startTime, layer.startTime + layer.duration));
        const duration = Math.max(0.1, layer.startTime + layer.duration - startTime);
        return { ...p, layers: p.layers.map((l) => l.id === layer.id ? { ...l, startTime, duration } : l) };
      }
      if (action === "trimEnd") {
        const t = uiTime;
        const startTime = layer.startTime;
        const duration = Math.max(0.1, Math.min(layer.duration, t - layer.startTime));
        return { ...p, layers: p.layers.map((l) => l.id === layer.id ? { ...l, duration } : l) };
      }
      if (action === "snapStart") {
        const t = uiTime;
        const layer2 = p.layers[index];
        const end = Math.max(layer2.startTime + layer2.duration, t);
        return { ...p, duration: Math.max(p.duration, end), layers: p.layers.map((l) => l.id === layer.id ? { ...l, startTime: t, duration: Math.max(0.1, l.startTime + l.duration - t) } : l) };
      }
      if (action === "chain") {
        const layer2 = p.layers[index];
        const prev = p.layers[index - 1];
        if (prev) return { ...p, duration: Math.max(p.duration, layer2.startTime), layers: p.layers.map((l, i) => i === index ? { ...l, startTime: prev.startTime + prev.duration } : l) };
        return p;
      }
      return p;
    });
  }, [commit, selectedId, uiTime, settings]);

  const addLayer = useCallback(async (effect: EffectId, name?: string) => {
    const me = getMathEffect(effect);
    const meta = EFFECTS.find((e) => e.id === effect);
    const kind = me ? "math" : (meta?.kind ?? "effect");

    // LEDEdit .swf effects served from your cloud (NEXT_PUBLIC_SWF_BASE_URL).
    // Only available when online — SWFs are not bundled in the project.
    if (effect.startsWith("swf-")) {
      if (!isOnline()) {
        window.alert("SWF effects need an internet connection. Connect to the internet and try again.");
        return;
      }
      const layerCount = project.layers.length;
      const { cols, rows } = project.hardware;
      const duration = project.duration;
      const fps = project.fps;
      const swfUrl = swfFileFor(effect);
      if (!swfUrl) return;
      const ctrl = new AbortController();
      const cancelBtn = document.createElement("button");
      cancelBtn.textContent = "Cancel import";
      cancelBtn.className = "fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm";
      cancelBtn.innerHTML = `<div style="background:#09090b;border:1px solid #3f3f46;border-radius:12px;padding:16px;color:#e4e4e7;font:600 14px ui-sans-serif,system-ui;text-align:center">
        Cancelling import… <span style="font-weight:400;font-size:12px;color:#a1a1aa;margin-left:8px">×</span>
      </div>`;
      document.body.appendChild(cancelBtn);
      ctrl.signal.addEventListener("abort", () => {
        cancelBtn.remove();
      }, { once: true });
      cancelBtn.addEventListener("click", () => ctrl.abort(), { once: true });
      try {
        const media = await importSwf(swfUrl, cols, rows, duration, fps, undefined, ctrl.signal);
        cancelBtn.remove();
        const resolvedName = name ?? meta?.name ?? swfUrl.split("/").pop()?.replace(/\.[^.]+$/, "") ?? effect;
        const layer = {
          ...makeLayer("media", layerCount + 1),
          name: `${resolvedName} ${layerCount + 1}`,
          kind: "media",
          effect: "media",
          mediaType: "swf",
          mediaSrc: media.src,
          mediaFrames: media.frames,
          mediaFps: media.fps,
          mediaSrcW: cols,
          mediaSrcH: rows,
          mediaTrimBlack: true,
          mediaFitMode: "stretch",
        } as Layer;
        commit((p) => ({ ...p, layers: [...p.layers, layer] }));
        setSelectedId(layer.id);
        if (uiTimeRef.current >= layer.startTime + layer.duration) doSeek(layer.startTime);
        return;
      } catch (err) {
        cancelBtn.remove();
        if (err instanceof DOMException && err.name === "AbortError") return;
        throw err;
      }
    }

    const resolvedName = name ?? me?.name ?? meta?.name ?? effect;
    const layer = {
      ...makeLayer(effect, project.layers.length + 1),
      name: `${resolvedName} ${project.layers.length + 1}`,
      kind: kind as Layer["kind"],
      ...(effect === "text" ? { textSize: 16, textContent: "TOHRAN", text: "TOHRAN", textColors: ["#ffffff"] } : {}),
    };
    commit((p) => ({ ...p, layers: [...p.layers, layer] }));
    setSelectedId(layer.id);
    if (uiTimeRef.current >= layer.startTime + layer.duration) doSeek(layer.startTime);
  }, [commit, doSeek, project.layers.length, project.duration, project.fps, project.hardware]);

  const addPreset = useCallback((preset: Preset) => {
    const layer = {
      ...makeLayer(preset.effectId, project.layers.length + 1),
      name: preset.name,
      kind: "math" as Layer["kind"],
      ...(preset.params as Partial<Layer>),
    };
    commit((p) => ({ ...p, layers: [...p.layers, layer] }));
    setSelectedId(layer.id);
    if (uiTimeRef.current >= layer.startTime + layer.duration) doSeek(layer.startTime);
  }, [commit, doSeek, project.layers.length]);

  const addMedia = useCallback((media: ImportedMedia, name: string, effect: "media" | "character-video" = "media") => {
    const layer = {
      ...makeLayer(effect, project.layers.length + 1),
      name,
      kind: "media" as Layer["kind"],
      effect,
      mediaType: media.type,
      mediaSrc: media.src,
      mediaFrames: media.frames,
      mediaFps: media.fps || project.fps,
      mediaSrcW: media.srcW || project.hardware.cols,
      mediaSrcH: media.srcH || project.hardware.rows,
      mediaCropX: media.cropX ?? 0,
      mediaCropY: media.cropY ?? 0,
      mediaCropW: media.cropW ?? 0,
      mediaCropH: media.cropH ?? 0,
      mediaFitMode: "stretch" as Layer["mediaFitMode"],
      mediaTrimBlack: true,
    };
    commit((p) => ({ ...p, layers: [...p.layers, layer] }));
    setSelectedId(layer.id);
    if (uiTimeRef.current >= layer.startTime + layer.duration) doSeek(layer.startTime);
  }, [commit, doSeek, project.fps, project.layers.length]);

  const importMedia = useCallback(async (file: File, onStatus: (message: string) => void, effect: "media" | "character-video" = "media") => {
    const { cols, rows } = project.hardware;
    const name = file.name.toLowerCase();
    let media: ImportedMedia;
    if (name.endsWith(".swf")) {
      media = await importSwf(file, cols, rows, project.duration, project.fps, onStatus);
    } else if (name.endsWith(".sfx")) {
      media = await importSfx(file, cols, rows, onStatus);
    } else if (name.endsWith(".gif") || file.type === "image/gif") {
      media = await importGif(file, cols, rows, onStatus);
    } else if (name.endsWith(".avi")) {
      const objectUrl = URL.createObjectURL(file);
      try { media = await importAviUrl(objectUrl, cols, rows, onStatus); }
      finally { URL.revokeObjectURL(objectUrl); }
    } else if (file.type.startsWith("video/")) {
      media = await importVideo(file, cols, rows, onStatus);
    } else {
      media = await importImageFile(file);
    }
    addMedia(media, file.name.replace(/\.[^.]+$/, ""), effect);
  }, [addMedia, project.duration, project.fps, project.hardware]);

  // Asset library handoff: load the clip the user chose on /library once.
  useEffect(() => {
    if (libraryLoadedRef.current) return;
    let raw: string | null = null;
    try { raw = sessionStorage.getItem("pixleled_library_asset"); sessionStorage.removeItem("pixleled_library_asset"); } catch { return; }
    if (!raw) return;
    libraryLoadedRef.current = true;
    try {
      const asset = JSON.parse(raw) as { url: string; title: string };
      void importAviUrl(asset.url, project.hardware.cols, project.hardware.rows)
        .then((media) => addMedia(media, asset.title.replace(/\.[^.]+$/, ""), "character-video"))
        .catch(() => { /* offline or unsupported AVI: library download remains available */ });
    } catch { /* malformed handoff */ }
    // Handoff is one-shot; project hardware is already resolved on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addKeyframe = useCallback(() => {
    if (!selected) return;
    patchLayer(selected.id, {
      keyframes: [...selected.keyframes, {
        id: Math.random().toString(36).slice(2, 9), t: +uiTime.toFixed(2), value: selected.brightness, param: "brightness" as const,
      }].sort((a, b) => a.t - b.t),
    });
  }, [selected, patchLayer, uiTime]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT")) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault(); e.shiftKey ? redo() : undo(); return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); return; }
      if (e.code === "Space") { e.preventDefault(); if (project.layers.length > 0) setPlaying((v) => !v); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") { e.preventDefault(); doAction("split"); return; }
      if (e.key.toLowerCase() === "s") { e.preventDefault(); doAction("split"); return; }
      if (e.key === "ArrowLeft") { e.preventDefault(); doSeek(uiTime - 1 / project.fps); return; }
      if (e.key === "ArrowRight") { e.preventDefault(); doSeek(uiTime + 1 / project.fps); return; }
      if (e.key === "Delete" && selectedId) { e.preventDefault(); doAction("delete"); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, doSeek, uiTime, project.fps, project.layers.length, selectedId, doAction]);

  const saveJson = () => {
    const blob = new Blob([JSON.stringify({ ...project, generator: "PixleLED Studio by Jambh Electricals" }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name.replace(/[^\w-]+/g, "_") || "show"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadJson = (file: File) => {
    choiceRef.current = true;
    file.text().then((text) => {
      const parsed = JSON.parse(text) as Project;
      if (!parsed?.layers || !parsed?.hardware) throw new Error("invalid");
      const next = normalizeProject(parsed);
      reset(next);
      setSelectedId(next.layers[0]?.id ?? null);
      doSeek(0);
      setLauncherOpen(false);
      saveProjectRecord(next).catch(() => {});
    }).catch(() => alert("That file is not a Tohran LED Studio project."));
  };

  const applyHardware = (name: string, hardware: HardwareConfig) => {
    if (modal.isNew) {
      const next = defaultProject();
      const saved = readSavedHw();
      if (saved) next.hardware = { ...DEFAULT_HARDWARE, ...saved };
      reset({ ...next, id: Math.random().toString(36).slice(2, 9), name, hardware });
      setSelectedId(null);
    } else {
      commit((p) => ({ ...p, name: name.trim() || p.name, hardware }), "project:configure");
    }
    setModal({ open: false, isNew: false });
    doSeek(0);
  };

  const renameProject = () => {
    setRenameValue(project.name);
    setRenameOpen(true);
  };
  const commitRename = () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== project.name) commit((p) => ({ ...p, name: trimmed }), "project:rename");
    setRenameOpen(false);
  };

  const deleteCurrentProjectRecord = async () => {
    if (!window.confirm(`Delete "${project.name}" from this device? This cannot be undone.`)) return;
    await Promise.all([deleteSavedProject(project.id), deleteCurrentProject()]).catch(() => {});
    choiceRef.current = false;
    try { sessionStorage.removeItem(LAUNCHER_SEEN_KEY); } catch {}
    reset(defaultProject());
    setSelectedId(null);
    doSeek(0);
    setLauncherOpen(true);
  };

  const adopt = (next: Project) => {
    choiceRef.current = true;
    const normalized = normalizeProject(next);
    reset(normalized);
    setSelectedId(normalized.layers[0]?.id ?? null);
    doSeek(0);
    setLauncherOpen(false);
  };

  const continueLast = async () => {
    const auto = readAutosave();
    const next = (auto ? await openSavedProject(auto.id) : null) ?? await loadProject() ?? defaultProject();
    adopt(next);
  };

  const openSaved = async (id: string) => {
    const next = await openSavedProject(id);
    if (next) adopt(next);
  };

  const createProject = async (config: NewProjectConfig) => {
    const next: Project = {
      ...defaultProject(),
      id: Math.random().toString(36).slice(2, 9),
      name: config.name,
      fps: config.fps,
      duration: config.duration,
      hardware: config.hardware,
      layers: [],
      lineAnimations: [],
    };
    choiceRef.current = true;
    reset(next);
    setSelectedId(null);
    doSeek(0);
    setLauncherOpen(false);
    await saveProjectRecord(next).catch(() => {});
  };

  return (
    <main className="flex h-[100dvh] w-screen flex-col overflow-hidden bg-zinc-950 text-zinc-100 select-none">
      <TopBar
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        onExport={() => setExportModal({ open: true, format: "avi" })}
      />
      <input ref={importRef} type="file" accept="application/json,.json" hidden
        onChange={(e) => e.target.files?.[0] && loadJson(e.target.files[0])} />

      <div className="flex min-h-0 flex-1">
        <OverlaySidebar
          open={sidebarOpen}
          onOpenChange={setSidebarOpen}
          activeTab={sidebarTab}
          onActiveTabChange={setSidebarTab}
          project={project}
          onProjects={() => setLauncherOpen(true)}
          onHardware={() => setModal({ open: true, isNew: false })}
          onRename={renameProject}
          onDeleteProject={deleteCurrentProjectRecord}
          onSaveJson={saveJson}
          onLoadJson={() => importRef.current?.click()}
          onExportAvi={() => setExportModal({ open: true, format: "avi" })}
          onFps={(fps) => commit((p) => ({ ...p, fps }))}
          onBrightness={(masterBrightness) => commit((p) => ({ ...p, masterBrightness }), "master:brightness")}
          onUndo={undo} onRedo={redo} canUndo={canUndo} canRedo={canRedo}
          onOpenSettings={() => setSettingsOpen(true)}
          onAdd={addLayer} onAddPreset={addPreset} onImportMedia={importMedia}
          onApplyHardware={(hardware) => commit((pp) => ({ ...pp, hardware }), "hardware:layout")}
          onCommit={commit}
          map={map}
        />
        <section className="flex min-w-0 min-h-0 flex-1 flex-col">
          <CanvasViewport
            project={project} map={map} playing={playing} loop={loop} seek={seek}
            loopStart={selected?.startTime ?? 0}
            loopEnd={selected ? selected.startTime + selected.duration : project.duration}
            onTime={setUiTime} onEnd={() => setPlaying(false)} onDeselect={() => setSelectedId(null)}
            onToggleWiring={() => commit((p) => ({ ...p, hardware: { ...p.hardware, showWiring: !p.hardware.showWiring } }))}
            onToggleIndices={() => commit((p) => ({ ...p, hardware: { ...p.hardware, showIndices: !p.hardware.showIndices } }))}
            onTogglePitch={() => commit((p) => ({ ...p, hardware: { ...p.hardware, showPitch: !p.hardware.showPitch } }))}
            split={split} onSplit={() => setSplit((v) => !v)}
            paused={launcherOpen}
            fontsReady={fontsReady}
          />
          <TransportBar
            playing={playing} canPlay={project.layers.length > 0} loop={loop} time={uiTime}
            duration={project.duration} fps={project.fps}
            onPlay={() => setPlaying((v) => project.layers.length > 0 ? !v : false)} onStop={() => { setPlaying(false); doSeek(0); }}
            onPrev={() => doSeek(uiTime - 1 / project.fps)} onNext={() => doSeek(uiTime + 1 / project.fps)}
            onLoop={() => setLoop((v) => !v)}
            onUndo={undo} onRedo={redo} canUndo={canUndo} canRedo={canRedo}
            entries={entries} currentIndex={currentIndex} onJump={jumpTo} onClearHistory={clear}
          />
        </section>
        <ResizeHandle axis="x" label="inspector"
          onDrag={(d) => setLayout((s) => ({ ...s, right: clampSize(s.right - d, 260, 500) }))} />
        <Inspector
          width={layout.right}
          project={project} layer={selected} time={uiTime}
          onLayer={(patch) => selected && patchLayer(selected.id, patch)}
          onAction={doAction} onAddKeyframe={addKeyframe}
          onLineAnimations={(updater) => commit((p) => ({ ...p, lineAnimations: updater(p.lineAnimations ?? []) }), "lines")}
          onGamma={(gamma) => commit((p) => ({ ...p, gamma }), "master:gamma")}
        />
      </div>

      {!timelineCollapsed && (
        <ResizeHandle axis="y" label="timeline"
          onDrag={(d) => setLayout((s) => ({ ...s, timeline: clampSize(s.timeline - d, 120, 440) }))} />
      )}
      <Timeline
        project={project} time={uiTime} selectedId={selectedId}
        onSelect={setSelectedId} onCommit={commit} onSeek={doSeek}
        onAction={doAction} onAdd={() => addLayer("sweep")}
        height={layout.timeline} collapsed={timelineCollapsed}
        onToggleCollapse={() => setTimelineCollapsed((v) => !v)}
      />

      <div className="sr-only" aria-live="polite">{saveState}</div>
      {modal.open && (
        <HardwareModal
          open={modal.open} isNew={modal.isNew} name={project.name} hardware={project.hardware}
          onClose={() => setModal({ open: false, isNew: false })} onApply={applyHardware}
        />
      )}
      {renameOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg border border-zinc-700 bg-zinc-900 p-4 shadow-2xl">
            <label className="label mb-2 block">Project name</label>
            <input
              className="field"
              value={renameValue}
              autoFocus
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") setRenameOpen(false);
              }}
            />
            <div className="mt-3 flex justify-end gap-2">
              <button className="btn" onClick={() => setRenameOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={commitRename}>Rename</button>
            </div>
          </div>
        </div>
      )}
      <AnimatePresence>
        {exportModal.open && (
          <MotionExport key="export" open={exportModal.open} project={project} map={map} initialFormat={exportModal.format}
            fontsReady={fontsReady}
            onClose={() => setExportModal((s) => ({ ...s, open: false }))} />
        )}
      </AnimatePresence>
      <ProjectLauncherModal
        open={launcherOpen} allowClose={choiceRef.current}
        config={{ name: project.name, fps: project.fps, duration: project.duration, hardware: project.hardware }}
        onClose={() => setLauncherOpen(false)}
        onContinue={continueLast}
        onOpen={openSaved}
        onDelete={deleteSavedProject}
        onCreate={createProject}
        onLoadJson={() => importRef.current?.click()}
      />

      <StudioSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} onOpenFeedback={() => { setSettingsOpen(false); window.open("https://www.instagram.com/jambh_elecricals/", "_blank", "noopener,noreferrer"); }} />
    </main>
  );
}
