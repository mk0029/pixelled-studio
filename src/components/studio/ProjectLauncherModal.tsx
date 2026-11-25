"use client";

import { useEffect, useRef, useState } from "react";
import { listSavedProjects, readAutosave, type ProjectMeta } from "@/lib/projectStore";
import {
  COLOR_ORDERS, DEFAULT_HARDWARE, ROUTINGS, START_CORNERS,
  type HardwareConfig, type RoutingPattern,
} from "@/types/hardware";
import { Icon } from "./icons";

export interface NewProjectConfig {
  name: string;
  fps: number;
  duration: number;
  hardware: HardwareConfig;
}

interface Props {
  open: boolean;
  allowClose?: boolean;
  config: NewProjectConfig;
  onClose: () => void;
  onContinue: () => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onCreate: (config: NewProjectConfig) => void;
  onLoadJson: () => void;
}

const ROUTING_LABEL: Record<RoutingPattern, string> = {
  "vertical-snake": "Vertical S-Snake",
  "vertical-progressive": "Vertical Progressive",
  "horizontal-snake": "Horizontal S-Snake",
  "horizontal-progressive": "Horizontal Progressive",
};
const ROUTING_GLYPH: Record<RoutingPattern, string> = {
  "vertical-snake": "↓↑", "vertical-progressive": "↓↓",
  "horizontal-snake": "→←", "horizontal-progressive": "→→",
};
const CORNER_LABEL: Record<string, string> = {
  "top-left": "Top-Left", "top-right": "Top-Right",
  "bottom-left": "Bottom-Left", "bottom-right": "Bottom-Right",
};

export default function ProjectLauncherModal(p: Props) {
  const [view, setView] = useState<"launcher" | "new">("launcher");
  const [saved, setSaved] = useState<ProjectMeta[]>([]);
  const [auto, setAuto] = useState<ProjectMeta | null>(null);
  const [draft, setDraft] = useState<NewProjectConfig>(p.config);
  const configRef = useRef(p.config);
  configRef.current = p.config;

  const refresh = () => { setSaved(listSavedProjects()); setAuto(readAutosave()); };
  useEffect(() => {
    if (!p.open) return;
    setView("launcher");
    setDraft(configRef.current);
    refresh();
  }, [p.open]);

  const setHw = <K extends keyof HardwareConfig>(key: K, value: HardwareConfig[K]) =>
    setDraft((d) => ({ ...d, hardware: { ...d.hardware, [key]: value } }));

  const hero = auto ?? saved[0];
  const others = saved.filter((m) => m.id !== hero?.id);
  const metaLine = (m: ProjectMeta) => (
    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-zinc-400">
      <span>{m.cols}×{m.rows} • {m.layerCount} Layer{m.layerCount === 1 ? "" : "s"}</span>
      <span>{ROUTING_LABEL[m.routing as RoutingPattern] ?? m.routing}</span>
    </div>
  );

  const deleteOne = (m: ProjectMeta) => {
    p.onDelete(m.id);
    const next = saved.filter((x) => x.id !== m.id);
    setSaved(next);
    if (auto?.id === m.id) setAuto(next[0] ?? null);
  };

  if (!p.open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-3">
      <div className={`flex w-full flex-col overflow-hidden rounded-xl border border-zinc-700 bg-zinc-950 shadow-[0_18px_60px_#000] ${
        view === "new" ? "max-h-[82dvh] max-w-xl" : "max-h-[80dvh] max-w-2xl"
      }`}>
        <div className="flex h-12 shrink-0 items-center gap-3 border-b border-zinc-800 px-3">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-teal-400 to-violet-500 text-[15px] font-black text-zinc-950">T</div>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-bold text-zinc-100">PixleLED Studio <span className="text-zinc-500">— by Jambh Electricals</span></div>
            <div className="text-[10px] text-zinc-500">{view === "launcher" ? "Project Launcher" : "Start New Project"}</div>
          </div>
          {p.allowClose && <button className="btn btn-icon ml-auto" onClick={p.onClose} title="Close launcher"><Icon name="x" /></button>}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
          {view === "launcher" ? (
            <div>
              <div className="grid gap-3 md:grid-cols-2">
                <button onClick={() => setView("new")}
                  className="group rounded-xl border border-teal-400/40 bg-gradient-to-br from-teal-500/[.12] to-violet-500/[.08] p-5 text-left shadow-[0_0_38px_-18px_#2dd4bf] transition hover:border-teal-300 hover:shadow-[0_0_44px_-14px_#2dd4bf]">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-teal-400/15 text-teal-300"><Icon name="plus" size={22} /></div>
                  <div className="mt-3 text-[15px] font-bold text-zinc-100">Start New Project</div>
                  <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">
                    Configure a fresh Toran or Matrix setup with your grid dimensions and wiring topology.
                  </p>
                  <div className="mt-3 text-[11px] font-semibold text-teal-300">Configure workspace →</div>
                </button>

                <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Icon name="layers" size={15} />
                    <span className="text-[13px] font-bold text-zinc-100">Continue Existing Project</span>
                  </div>
                  {hero ? (
                    <>
                      <button onClick={p.onContinue}
                        className="w-full rounded-lg border border-teal-400/40 bg-teal-500/[.08] px-3 py-3 text-left transition hover:border-teal-300">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-[12px] font-bold text-teal-200">{hero.name}</span>
                          <span className="shrink-0 rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] text-zinc-400">Last session</span>
                        </div>
                        <div className="mt-1 text-[9px] text-zinc-500">Modified {new Date(hero.savedAt).toLocaleString()}</div>
                        {metaLine(hero)}
                        <div className="mt-2 text-[11px] font-semibold text-teal-300">Continue Last Session →</div>
                      </button>
                      {others.length > 0 && (
                        <div className="mt-3 space-y-1.5">
                          <div className="label">Other saved projects</div>
                          {others.map((m) => (
                            <div key={m.id} className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-2">
                              <button className="min-w-0 flex-1 text-left" onClick={() => p.onOpen(m.id)}>
                                <div className="truncate text-[11px] font-semibold text-zinc-200">{m.name}</div>
                                {metaLine(m)}
                              </button>
                              <button className="btn btn-icon text-zinc-500 hover:text-red-400" onClick={() => deleteOne(m)} title="Delete project"><Icon name="trash" size={13} /></button>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="rounded-lg border border-dashed border-zinc-700 px-3 py-6 text-center">
                      <Icon name="folder" size={20} />
                      <div className="mt-2 text-[11px] text-zinc-400">No saved projects found on this device yet</div>
                      <button className="btn mt-3" onClick={p.onLoadJson}><Icon name="folder" size={13} /> Load .json Project File</button>
                    </div>
                  )}
                </div>
              </div>
              {(hero || saved.length > 0) && (
                <button className="btn mt-3" onClick={p.onLoadJson}><Icon name="folder" size={13} /> Load .json Project File</button>
              )}
            </div>
          ) : (
            <div>
              <button className="btn mb-4" onClick={() => setView("launcher")}>← Back</button>

              <section className="mb-4">
                <div className="label mb-1.5">Project Name</div>
                <input className="field" placeholder="Diwali Main Gate Toran 30x20" value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
              </section>

              <section className="mb-4 grid gap-3 sm:grid-cols-2">
                <label><div className="label mb-1.5">Color Order</div>
                  <select className="field" value={draft.hardware.colorOrder} onChange={(e) => setHw("colorOrder", e.target.value as HardwareConfig["colorOrder"])}>
                    {COLOR_ORDERS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </label>
                <label><div className="label mb-1.5">Active Ports</div>
                  <input type="number" min="1" max="16" className="field" value={draft.hardware.activePorts}
                    onChange={(e) => setHw("activePorts", Math.max(1, Math.min(16, +e.target.value || 1)))} />
                </label>
              </section>

              <section className="mb-4">
                <div className="label mb-1.5">Matrix size</div>
                <div className="grid max-w-sm grid-cols-2 gap-3">
                  <label><div className="mb-1 text-[11px] text-zinc-400">Columns / Drops</div>
                    <input type="number" min="1" max="256" className="field" value={draft.hardware.cols}
                      onChange={(e) => setHw("cols", Math.max(1, Math.min(256, +e.target.value || 1)))} /></label>
                  <label><div className="mb-1 text-[11px] text-zinc-400">LEDs per Drop</div>
                    <input type="number" min="1" max="256" className="field" value={draft.hardware.rows}
                      onChange={(e) => setHw("rows", Math.max(1, Math.min(256, +e.target.value || 1)))} /></label>
                </div>
              </section>

              <section>
                <div className="label mb-1.5">Connections</div>
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {START_CORNERS.map((c) => (
                    <button key={c} className={`chip ${draft.hardware.startCorner === c ? "chip-active" : ""}`}
                      onClick={() => setHw("startCorner", c)}>{CORNER_LABEL[c]}</button>
                  ))}
                </div>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {ROUTINGS.map((r) => (
                    <button key={r} className={`chip flex items-center gap-2 text-left ${draft.hardware.routing === r ? "chip-active" : ""}`}
                      onClick={() => setHw("routing", r)}>
                      <span className="font-mono text-[13px]">{ROUTING_GLYPH[r]}</span>{ROUTING_LABEL[r]}
                    </button>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>

        <div className="flex h-12 shrink-0 items-center justify-between border-t border-zinc-800 px-3">
          <span className="text-[10px] text-zinc-600">PixleLED Studio · by Jambh Electricals</span>
          {view === "new" ? (
            <div className="flex gap-2">
              <button className="btn" onClick={() => setView("launcher")}>Cancel</button>
              <button className="btn btn-primary" onClick={() => p.onCreate({
                ...draft,
                name: draft.name.trim() || "Untitled Toran Project",
                hardware: { ...DEFAULT_HARDWARE, ...draft.hardware },
              })}><Icon name="plus" size={14} />Create & Open Workspace →</button>
            </div>
          ) : <span className="text-[10px] text-zinc-600">Choose an option to continue</span>}
        </div>
      </div>
    </div>
  );
}
