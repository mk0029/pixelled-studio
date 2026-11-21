"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildWiringMap } from "@/engine/wiringMapper";
import { getMathEffect } from "@/engine/mathCatalog";
import { type Preset } from "@/engine/presetLibrary";
import { deleteSavedProject, loadProject, openSavedProject, readAutosave, saveProjectRecord } from "@/lib/projectStore";
import { deleteCurrentProject } from "@/lib/db";
import { useProjectHistory } from "@/lib/history";
import { clampLayerTiming, defaultProject, EFFECTS, makeLayer, normalizeProject, type EffectId, type Layer, type Project } from "@/types/project";
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
import { importGif, importImageFile, importLed, importSfx, importSwf, importVideoStill, type ImportedMedia } from "@/engine/mediaImport";
import LeftDock from "./LeftDock";
import ResizeHandle from "./ResizeHandle";
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
  const { project, commit, reset, undo, redo, canUndo, canRedo } = useProjectHistory(initial);
  const { settings } = useStudioSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(initial.layers[0]?.id ?? null);
  const [playing, setPlaying] = useState(true);
  const [loop, setLoop] = useState(true);
  const [split, setSplit] = useState(false);
  const [uiTime, setUiTime] = useState(0);
  const [seek, setSeek] = useState({ t: 0, nonce: 0 });
  const [modal, setModal] = useState<{ open: boolean; isNew: boolean }>({ open: false, isNew: false });
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [exportModal, setExportModal] = useState<{ open: boolean; format: ExportFormat }>({ open: false, format: "zip" });
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

  const doSeek = useCallback((t: number) => {
    const clamped = Math.max(0, Math.min(project.duration, t));
    setSeek((s) => ({ t: clamped, nonce: s.nonce + 1 }));
    setUiTime(clamped);
  }, [project.duration]);

  // Show the launcher on first Studio entry only. Reloads restore silently.
  useEffect(() => {
    if (bootRef.current) return; // StrictMode double-invoke
    bootRef.current = true;
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
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

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
    // Grow-only: an empty new-project timeline must keep its chosen duration.
    const needed = Math.max(MIN_DURATION, project.duration, ...project.layers.map((l) => l.startTime + l.duration));
    if (needed - project.duration > 0.001) {
      commit((p) => ({ ...p, duration: needed }), "auto:duration");
    }
  }, [project.layers, project.duration, commit]);

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
    if (kind === "media" && effect !== "media") {
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
      const media = await importSwf(new File([], "placeholder"), cols, rows, duration, fps);
      // override with bundled URL — Ruffle loads from network path
      const resolvedName = name ?? meta?.name ?? swfUrl.split("/").pop()?.replace(/\.[^.]+$/, "") ?? effect;
      const layer = {
        ...makeLayer("media", layerCount + 1),
        name: `${resolvedName} ${layerCount + 1}`,
        kind: "media",
        effect: "media",
        mediaType: "swf",
        mediaSrc: swfUrl,
        mediaFrames: media.frames,
        mediaFps: media.fps,
        mediaTrimBlack: true,
        mediaFitMode: "stretch",
      } as Layer;
      commit((p) => ({ ...p, layers: [...p.layers, layer] }));
      setSelectedId(layer.id);
      return;
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
  }, [commit, project.layers.length]);

  const addPreset = useCallback((preset: Preset) => {
    const layer = {
      ...makeLayer(preset.effectId, project.layers.length + 1),
      name: preset.name,
      kind: "math" as Layer["kind"],
      ...(preset.params as Partial<Layer>),
    };
    commit((p) => ({ ...p, layers: [...p.layers, layer] }));
    setSelectedId(layer.id);
  }, [commit, project.layers.length]);

  const addMedia = useCallback((media: ImportedMedia, name: string) => {
    const layer = {
      ...makeLayer("media", project.layers.length + 1),
      name,
      kind: "media" as Layer["kind"],
      effect: "media",
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
  }, [commit, project.fps, project.layers.length]);

  const importMedia = useCallback(async (file: File, onStatus: (message: string) => void) => {
    const { cols, rows } = project.hardware;
    const name = file.name.toLowerCase();
    let media: ImportedMedia;
    if (name.endsWith(".swf")) {
      media = await importSwf(file, cols, rows, project.duration, project.fps, onStatus);
    } else if (name.endsWith(".sfx")) {
      media = await importSfx(file, cols, rows, onStatus);
    } else if (name.endsWith(".led") || name.endsWith(".zip")) {
      media = await importLed(await file.arrayBuffer(), map, cols, rows, project.fps, onStatus);
    } else if (name.endsWith(".gif") || file.type === "image/gif") {
      media = await importGif(file, cols, rows, onStatus);
    } else if (file.type.startsWith("video/")) {
      media = await importVideoStill(file, cols, rows);
    } else {
      media = await importImageFile(file);
    }
    addMedia(media, file.name.replace(/\.[^.]+$/, ""));
  }, [addMedia, map, project.duration, project.fps, project.hardware]);

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
      if (e.code === "Space") { e.preventDefault(); setPlaying((v) => !v); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") { e.preventDefault(); doAction("split"); return; }
      if (e.key.toLowerCase() === "s") { e.preventDefault(); doAction("split"); return; }
      if (e.key === "ArrowLeft") { e.preventDefault(); doSeek(uiTime - 1 / project.fps); return; }
      if (e.key === "ArrowRight") { e.preventDefault(); doSeek(uiTime + 1 / project.fps); return; }
      if (e.key === "Delete" && selectedId) { e.preventDefault(); doAction("delete"); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, doSeek, uiTime, project.fps, selectedId, doAction]);

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
    const name = window.prompt("Project name", project.name);
    if (name === null) return;
    const trimmed = name.trim();
    if (trimmed && trimmed !== project.name) commit((p) => ({ ...p, name: trimmed }), "project:rename");
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
        project={project}
        onHome={() => { try { sessionStorage.removeItem(LAUNCHER_SEEN_KEY); } catch {} onHome?.(); }}
        onProjects={() => setLauncherOpen(true)}
        onHardware={() => setModal({ open: true, isNew: false })}
        onRename={renameProject}
        onDeleteProject={deleteCurrentProjectRecord}
        onSaveJson={saveJson}
        onLoadJson={() => importRef.current?.click()}
        onExportLed={() => setExportModal({ open: true, format: "led" })}
        onExportAvi={() => setExportModal({ open: true, format: "zip" })}
        onFps={(fps) => commit((p) => ({ ...p, fps }))}

        onBrightness={(masterBrightness) => commit((p) => ({ ...p, masterBrightness }), "master:brightness")}
        onUndo={undo} onRedo={redo} canUndo={canUndo} canRedo={canRedo}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <input ref={importRef} type="file" accept="application/json,.json" hidden
        onChange={(e) => e.target.files?.[0] && loadJson(e.target.files[0])} />

      <div className="flex min-h-0 flex-1">
        <LeftDock onAdd={addLayer} onAddPreset={addPreset} onImportMedia={importMedia} width={layout.left} />
        <ResizeHandle axis="x" label="effects dock"
          onDrag={(d) => setLayout((s) => ({ ...s, left: clampSize(s.left + d, 200, 440) }))} />
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
          />
          <TransportBar
            playing={playing} loop={loop} time={uiTime}
            duration={project.duration} fps={project.fps}
            onPlay={() => setPlaying((v) => !v)} onStop={() => { setPlaying(false); doSeek(0); }}
            onPrev={() => doSeek(uiTime - 1 / project.fps)} onNext={() => doSeek(uiTime + 1 / project.fps)}
            onLoop={() => setLoop((v) => !v)}
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
      <AnimatePresence>
        {exportModal.open && (
          <MotionExport key="export" open={exportModal.open} project={project} map={map} initialFormat={exportModal.format}
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
