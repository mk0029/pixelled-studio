"use client";

import { useEffect, useState } from "react";
import { COLOR_ORDERS, DEFAULT_HARDWARE, LAYOUT_PRESETS, type ColorOrder, type HardwareConfig } from "@/types/hardware";
import { Icon } from "./icons";

interface Props {
  open: boolean;
  isNew: boolean;
  name: string;
  hardware: HardwareConfig;
  onClose: () => void;
  onApply: (name: string, hardware: HardwareConfig) => void;
}

const clamp = (v: number) => Math.max(4, Math.min(512, Math.round(v) || 4));

export default function HardwareModal(p: Props) {
  const [draft, setDraft] = useState<HardwareConfig>({ ...DEFAULT_HARDWARE, ...p.hardware });
  const [draftName, setDraftName] = useState(p.name);

  useEffect(() => {
    if (!p.open) return;
    setDraft({ ...DEFAULT_HARDWARE, ...p.hardware });
    setDraftName(p.name);
  }, [p.open, p.hardware, p.name]);

  const set = <K extends keyof HardwareConfig>(key: K, value: HardwareConfig[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  if (!p.open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0B0F17] shadow-2xl">
        <div className="flex h-12 shrink-0 items-center gap-3 border-b border-white/10 bg-[#111827] px-4">
          <Icon name="grid" size={17} />
          <div className="min-w-0">
            <div className="text-[13px] font-bold text-zinc-100">{p.isNew ? "New Project" : "Matrix Geometry"}</div>
            <div className="truncate text-[10px] text-zinc-500">Grid dimensions · color order · channels</div>
          </div>
          <button className="btn btn-icon ml-auto" onClick={p.onClose} title="Close"><Icon name="x" /></button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-4">
          <section>
            <div className="mb-1 text-[11px] uppercase tracking-wider text-slate-400">Project name</div>
            <input className="field" value={draftName} onChange={(e) => setDraftName(e.target.value)} />
          </section>

          <section className="space-y-3 rounded-xl border border-white/10 bg-[#111827] p-3.5">
            <div className="text-[11px] uppercase tracking-wider text-slate-400">Color order &amp; channels</div>
            <div className="flex flex-wrap gap-1.5">
              {COLOR_ORDERS.map((o: ColorOrder) => (
                <button key={o} type="button" className={`chip font-mono ${draft.colorOrder === o ? "chip-active" : ""}`}
                  onClick={() => set("colorOrder", o)}>{o}</button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-zinc-400">Channels</span>
              {([3, 4] as const).map((count) => (
                <button key={count} type="button" className={`chip tabular-nums ${draft.channels === count ? "chip-active" : ""}`}
                  onClick={() => set("channels", count)}>{count} ch</button>
              ))}
            </div>
          </section>

          <section className="space-y-3 rounded-xl border border-white/10 bg-[#111827] p-3.5">
            <div className="text-[11px] uppercase tracking-wider text-slate-400">Matrix size</div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {LAYOUT_PRESETS.map((preset) => {
                const active = draft.cols === preset.cols && draft.rows === preset.rows;
                return (
                  <button key={preset.name} type="button" className={`btn tabular-nums ${active ? "chip-active" : ""}`}
                    onClick={() => { set("cols", preset.cols); set("rows", preset.rows); }}>
                    {preset.cols}×{preset.rows}
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label>
                <div className="mb-1 text-[11px] uppercase tracking-wider text-slate-400">Width</div>
                <input type="number" min={4} max={512} className="field tabular-nums" value={draft.cols}
                  onChange={(e) => set("cols", clamp(Number(e.target.value)))} />
              </label>
              <label>
                <div className="mb-1 text-[11px] uppercase tracking-wider text-slate-400">Height</div>
                <input type="number" min={4} max={512} className="field tabular-nums" value={draft.rows}
                  onChange={(e) => set("rows", clamp(Number(e.target.value)))} />
              </label>
            </div>
            <div className="rounded-lg border border-white/10 bg-[#0B0F17] px-2.5 py-2 font-mono text-[11px] text-zinc-400">
              Total: <span className="tabular-nums text-teal-300">{(draft.cols * draft.rows).toLocaleString()}</span> LEDs
            </div>
          </section>
        </div>

        <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-t border-white/10 bg-[#111827] px-4">
          <button className="btn text-red-400 hover:bg-red-500/10"
            onClick={() => { setDraft({ ...DEFAULT_HARDWARE }); localStorage.removeItem("pixleled_hw_v1"); }}>
            Reset to defaults
          </button>
          <div className="flex gap-2">
            <button className="btn" onClick={p.onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={() => p.onApply(draftName.trim() || "Untitled Show", draft)}>
              <Icon name="grid" size={14} />{p.isNew ? "Create Project" : "Apply Geometry"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
