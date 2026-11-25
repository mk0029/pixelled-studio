"use client";

import { useEffect, useMemo, useState } from "react";
import {
  COLOR_ORDERS, DEFAULT_HARDWARE, LAYOUT_PRESETS, ROUTINGS, START_CORNERS,
  type ColorOrder, type HardwareConfig, type RoutingPattern, type StartCorner,
} from "@/types/hardware";
import { buildWiringMap, PORT_COLORS } from "@/engine/wiringMapper";
import { Icon } from "./icons";

interface Props {
  open: boolean;
  isNew: boolean;
  name: string;
  hardware: HardwareConfig;
  onClose: () => void;
  onApply: (name: string, hardware: HardwareConfig) => void;
}

const ROUTING_LABEL: Record<RoutingPattern, { name: string; glyph: string; detail: string }> = {
  "vertical-snake": { name: "Vertical S-Snake", glyph: "↓↑", detail: "Zig-zag down each drop — standard toran" },
  "vertical-progressive": { name: "Vertical Progressive", glyph: "↓↓", detail: "Top-to-bottom on every drop" },
  "horizontal-snake": { name: "Horizontal S-Snake", glyph: "→←", detail: "Zig-zag across each row" },
  "horizontal-progressive": { name: "Horizontal Progressive", glyph: "→→", detail: "Left-to-right on every row" },
};

const CORNER_LABEL: Record<StartCorner, string> = {
  "top-left": "↖ Top Left", "top-right": "↗ Top Right",
  "bottom-left": "↙ Bottom Left", "bottom-right": "↘ Bottom Right",
};

export default function HardwareModal(p: Props) {
  const [draft, setDraft] = useState<HardwareConfig>({ ...DEFAULT_HARDWARE, ...p.hardware });
  const [draftName, setDraftName] = useState(p.name);

  useEffect(() => {
    if (!p.open) return;
    setDraft({ ...DEFAULT_HARDWARE, ...p.hardware });
    setDraftName(p.name);
  }, [p.open, p.hardware, p.name]);

  const map = useMemo(() => buildWiringMap(draft), [draft]);
  const busiestPort = Math.max(1, ...map.ports.map((port) => port.pixels));
  const set = <K extends keyof HardwareConfig>(key: K, value: HardwareConfig[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  if (!p.open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="flex h-[min(90dvh,860px)] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-zinc-700 bg-zinc-950 shadow-2xl">
        <div className="flex h-12 shrink-0 items-center gap-3 border-b border-zinc-800 px-4">
          <Icon name="cpu" size={17} />
          <div>
            <div className="text-[13px] font-bold text-zinc-100">{p.isNew ? "New Project & Hardware Setup" : "Hardware & Wiring Configurator"}</div>
            <div className="text-[10px] text-zinc-500">PixleLED Studio · by Jambh Electricals · grid dimensions · color order · physical pixel routing</div>
          </div>
          <button className="btn btn-icon ml-auto" onClick={p.onClose} title="Close"><Icon name="x" /></button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <section className="mb-5">
            <div className="label mb-2">Project name</div>
            <input className="field max-w-sm" value={draftName} onChange={(e) => setDraftName(e.target.value)} />
          </section>

          <div className="grid gap-5 lg:grid-cols-2">
            <section>
              <div className="label mb-2">1 · Color order & ports</div>
              <div className="label mb-1.5">Channel byte order (export serialization)</div>
              <div className="flex flex-wrap gap-1.5">
                {COLOR_ORDERS.map((o: ColorOrder) => (
                  <button key={o} className={`chip font-mono ${draft.colorOrder === o ? "chip-active" : ""}`} onClick={() => set("colorOrder", o)}>{o}</button>
                ))}
              </div>
              <div className="label mb-1.5 mt-3">Active ports · {draft.activePorts}</div>
              <div className="flex items-center gap-3">
                <input type="range" min="1" max="16" value={draft.activePorts}
                  onChange={(e) => set("activePorts", +e.target.value)} className="flex-1" />
                <span className="w-20 text-right font-mono text-[11px] text-zinc-300">{draft.activePorts}</span>
              </div>
            </section>

            <section>
              <div className="label mb-2">2 · Toran / matrix dimensions</div>
              <div className="mb-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {LAYOUT_PRESETS.map((preset) => {
                  const active = draft.cols === preset.cols && draft.rows === preset.rows;
                  return (
                    <button key={preset.name} className={`chip text-left ${active ? "chip-active" : ""}`}
                      onClick={() => { set("cols", preset.cols); set("rows", preset.rows); }}>
                      <span className="block font-semibold">{preset.name}</span>
                      <span className="block text-[9px] text-zinc-600">{preset.detail}</span>
                    </button>
                  );
                })}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label><div className="label mb-1">Columns (drops)</div>
                  <input type="number" min="1" max="256" className="field" value={draft.cols}
                    onChange={(e) => set("cols", Math.max(1, Math.min(256, +e.target.value || 1)))} /></label>
                <label><div className="label mb-1">Rows (LEDs / drop)</div>
                  <input type="number" min="1" max="256" className="field" value={draft.rows}
                    onChange={(e) => set("rows", Math.max(1, Math.min(256, +e.target.value || 1)))} /></label>
              </div>
              <div className="mt-2 rounded-md border border-zinc-800 bg-zinc-900/60 px-2.5 py-2 font-mono text-[11px] text-zinc-400">
                {draft.cols} × {draft.rows} = <span className="text-teal-300">{map.totalPixels.toLocaleString()} px</span>
                {" · "}{busiestPort} px / busiest port
              </div>
            </section>
          </div>

          <section className="mt-5">
            <div className="label mb-2">3 · Wiring topology</div>
            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <div className="label mb-1.5">Start corner (data entry)</div>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                  {START_CORNERS.map((c) => (
                    <button key={c} className={`chip ${draft.startCorner === c ? "chip-active" : ""}`} onClick={() => set("startCorner", c as StartCorner)}>{CORNER_LABEL[c]}</button>
                  ))}
                </div>
              </div>
              <div>
                <div className="label mb-1.5">Routing pattern</div>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {ROUTINGS.map((r) => (
                    <button key={r} className={`chip flex items-center gap-2 text-left ${draft.routing === r ? "chip-active" : ""}`} onClick={() => set("routing", r)}>
                      <span className="font-mono text-[13px]">{ROUTING_LABEL[r].glyph}</span>
                      <span><span className="block font-semibold">{ROUTING_LABEL[r].name}</span>
                        <span className="block text-[9px] text-zinc-600">{ROUTING_LABEL[r].detail}</span></span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="mt-5">
            <div className="label mb-2">4 · Port chain / Z connection</div>
            <div className="grid gap-2 sm:grid-cols-2">
              <button className={`rounded-lg border p-2.5 text-left ${draft.portChain === "z" ? "border-amber-400 bg-amber-400/[.08]" : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-600"}`}
                onClick={() => set("portChain", "z")}>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[16px] text-amber-300">Z</span>
                  <span className={`text-[12px] font-bold ${draft.portChain === "z" ? "text-amber-300" : "text-zinc-200"}`}>Z Connection · daisy chain</span>
                </div>
                <div className="mt-1 text-[10px] leading-snug text-zinc-500">One continuous data path — the last pixel of P1 feeds P2, then P3…</div>
              </button>
              <button className={`rounded-lg border p-2.5 text-left ${draft.portChain === "parallel" ? "border-amber-400 bg-amber-400/[.08]" : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-600"}`}
                onClick={() => set("portChain", "parallel")}>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[16px] text-teal-300">∥</span>
                  <span className={`text-[12px] font-bold ${draft.portChain === "parallel" ? "text-amber-300" : "text-zinc-200"}`}>Parallel · independent feeds</span>
                </div>
                <div className="mt-1 text-[10px] leading-snug text-zinc-500">Each port starts at its own corner; no inter-port data link.</div>
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-900/60 px-2.5 py-2">
              <label className="flex cursor-pointer items-center gap-2 text-[11px] text-zinc-400">
                <input type="checkbox" checked={draft.showZLinks} onChange={(e) => set("showZLinks", e.target.checked)} />
                Highlight Z hand-off links on the wiring overlay
              </label>
              <span className="font-mono text-[10px] text-amber-300">{map.zLinks.length} link{map.zLinks.length === 1 ? "" : "s"}</span>
            </div>
          </section>

          <section className="mt-5 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="label">Live port allocation</span>
              <span className="text-[10px] text-zinc-500">{map.ports.length} port{map.ports.length === 1 ? "" : "s"} · {busiestPort} px busiest</span>
            </div>
            <div className="space-y-1.5">
              {map.ports.map((port) => {
                const pct = (port.pixels / busiestPort) * 100;
                return (
                  <div key={port.port} className="flex items-center gap-2">
                    <span className="flex w-11 items-center gap-1 font-mono text-[10px]" style={{ color: PORT_COLORS[(port.port - 1) % 8] }}>
                      <span className="h-2 w-2 rounded-full" style={{ background: PORT_COLORS[(port.port - 1) % 8] }} />P{port.port}
                    </span>
                    <span className="w-28 text-[10px] text-zinc-500">{port.axis === "column" ? "Drops" : "Rows"} {port.from + 1}–{port.to + 1}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
                      <div className="h-full rounded-full bg-teal-400" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-20 text-right font-mono text-[10px] text-zinc-400">{port.pixels} px</span>
                  </div>
                );
              })}
            </div>
            {map.warnings.length > 0 && (
              <div className="mt-3 space-y-1">
                {map.warnings.map((w) => (
                  <div key={w} className="flex items-center gap-2 rounded border border-amber-500/30 bg-amber-500/[.07] px-2 py-1.5 text-[10px] text-amber-300">
                    <Icon name="warning" size={12} />{w}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-t border-zinc-800 px-4">
          <button className="btn text-red-400 hover:bg-red-500/10" onClick={() => { setDraft({ ...DEFAULT_HARDWARE }); localStorage.removeItem("pixleled_hw_v1"); localStorage.removeItem("pixleled_prefs_v1"); }}>
            Reset to defaults
          </button>
          <div className="flex gap-2">
            <button className="btn" onClick={p.onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={() => p.onApply(draftName.trim() || "Untitled Show", draft)}>
              <Icon name="cpu" size={14} />{p.isNew ? "Create Project" : "Apply Hardware"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
