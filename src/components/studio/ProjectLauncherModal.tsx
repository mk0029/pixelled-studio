"use client";

import { useEffect, useRef, useState } from "react";
import { listSavedProjects, readAutosave, type ProjectMeta } from "@/lib/projectStore";
import { COLOR_ORDERS, DEFAULT_HARDWARE, LAYOUT_PRESETS, type HardwareConfig } from "@/types/hardware";
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

const clamp = (v: number) => Math.max(4, Math.min(512, Math.round(v) || 4));

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
      <div className={`flex w-full flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0B0F17] shadow-[0_18px_60px_#000] ${
        view === "new" ? "max-h-[82dvh] max-w-xl" : "max-h-[80dvh] max-w-2xl"
      }`}>
        <div className="flex h-12 shrink-0 items-center gap-3 border-b border-white/10 bg-[#111827] px-3">
          <span className="text-[13px] font-bold text-zinc-100">{view === "launcher" ? "Saved Shows" : "New Show"}</span>
          {p.allowClose && <button className="btn btn-icon ml-auto" onClick={p.onClose} title="Close panel" aria-label="Close panel"><Icon name="x" /></button>}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4">
          {view === "launcher" ? (
            <div>
              <div className="grid gap-3 md:grid-cols-2">
                <button onClick={() => setView("new")}
                  className="group rounded-xl border border-teal-400/40 bg-gradient-to-br from-teal-500/[.12] to-violet-500/[.08] p-5 text-left shadow-[0_0_38px_-18px_#2dd4bf] transition hover:border-teal-300 hover:shadow-[0_0_44px_-14px_#2dd4bf]">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-teal-400/15 text-teal-300"><Icon name="plus" size={22} /></div>
                  <div className="mt-3 text-[15px] font-bold text-zinc-100">Start New Project</div>
                  <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">
                    Set a project name, color order, channels and matrix dimensions.
                  </p>
                  <div className="mt-3 text-[11px] font-semibold text-teal-300">Configure workspace →</div>
                </button>

                <div className="rounded-xl border border-white/10 bg-[#111827] p-4">
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
                            <div key={m.id} className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#0B0F17] px-2.5 py-2">
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
                    <div className="rounded-lg border border-dashed border-white/15 px-3 py-6 text-center">
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
            <div className="space-y-4">
              <button className="btn" onClick={() => setView("launcher")}>← Back</button>

              <section>
                <div className="mb-1 text-[11px] uppercase tracking-wider text-slate-400">Project Name</div>
                <input className="field" placeholder="Diwali Main Gate Toran" value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
              </section>

              <section className="grid gap-3 sm:grid-cols-2 rounded-xl border border-white/10 bg-[#111827] p-3.5">
                <label>
                  <div className="mb-1 text-[11px] uppercase tracking-wider text-slate-400">Color Order</div>
                  <select className="field" value={draft.hardware.colorOrder} onChange={(e) => setHw("colorOrder", e.target.value as HardwareConfig["colorOrder"])}>
                    {COLOR_ORDERS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </label>
                <div>
                  <div className="mb-1 text-[11px] uppercase tracking-wider text-slate-400">Channels</div>
                  <div className="flex gap-1.5">
                    {([3, 4] as const).map((count) => (
                      <button key={count} type="button" className={`chip tabular-nums ${draft.hardware.channels === count ? "chip-active" : ""}`}
                        onClick={() => setHw("channels", count)}>{count} ch</button>
                    ))}
                  </div>
                </div>
              </section>

              <section className="space-y-3 rounded-xl border border-white/10 bg-[#111827] p-3.5">
                <div className="text-[11px] uppercase tracking-wider text-slate-400">Matrix size</div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {LAYOUT_PRESETS.map((preset) => {
                    const active = draft.hardware.cols === preset.cols && draft.hardware.rows === preset.rows;
                    return (
                      <button key={preset.name} type="button" className={`btn tabular-nums ${active ? "chip-active" : ""}`}
                        onClick={() => { setHw("cols", preset.cols); setHw("rows", preset.rows); }}>
                        {preset.cols}×{preset.rows}
                      </button>
                    );
                  })}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label>
                    <div className="mb-1 text-[11px] uppercase tracking-wider text-slate-400">Width</div>
                    <input type="number" min={4} max={512} className="field tabular-nums" value={draft.hardware.cols}
                      onChange={(e) => setHw("cols", clamp(Number(e.target.value)))} />
                  </label>
                  <label>
                    <div className="mb-1 text-[11px] uppercase tracking-wider text-slate-400">Height</div>
                    <input type="number" min={4} max={512} className="field tabular-nums" value={draft.hardware.rows}
                      onChange={(e) => setHw("rows", clamp(Number(e.target.value)))} />
                  </label>
                </div>
                <div className="rounded-lg border border-white/10 bg-[#0B0F17] px-2.5 py-2 font-mono text-[11px] text-zinc-400">
                  Total: <span className="tabular-nums text-teal-300">{(draft.hardware.cols * draft.hardware.rows).toLocaleString()}</span> LEDs
                </div>
              </section>
            </div>
          )}
        </div>

        <div className="flex h-12 shrink-0 items-center justify-between border-t border-white/10 bg-[#111827] px-3">
          <span className="text-[10px] text-zinc-600">PixleLED Studio · by Jambh Electricals</span>
          {view === "new" ? (
            <div className="flex gap-2">
              <button className="btn" onClick={() => setView("launcher")}>Cancel</button>
              <button className="btn btn-primary" onClick={() => p.onCreate({
                ...draft,
                name: draft.name.trim() || "Untitled Project",
                hardware: { ...DEFAULT_HARDWARE, ...draft.hardware },
              })}><Icon name="plus" size={14} />Create Project →</button>
            </div>
          ) : <span className="text-[10px] text-zinc-600">Choose an option to continue</span>}
        </div>
      </div>
    </div>
  );
}
