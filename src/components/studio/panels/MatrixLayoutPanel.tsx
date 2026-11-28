"use client";

import { useEffect, useRef, useState } from "react";
import { LAYOUT_PRESETS } from "@/types/hardware";
import type { Project } from "@/types/project";

interface Props {
  project: Project;
  onChange: (cols: number, rows: number) => void;
}

const clamp = (v: number) => Math.max(4, Math.min(512, Math.round(v) || 4));
const card = "space-y-3 rounded-xl border border-white/10 bg-[#111827] p-3.5";

export default function MatrixLayoutPanel({ project, onChange }: Props) {
  const { cols, rows } = project.hardware;
  const [draftCols, setDraftCols] = useState(String(cols));
  const [draftRows, setDraftRows] = useState(String(rows));
  const editing = useRef<"cols" | "rows" | null>(null);

  useEffect(() => { if (editing.current !== "cols") setDraftCols(String(cols)); }, [cols]);
  useEffect(() => { if (editing.current !== "rows") setDraftRows(String(rows)); }, [rows]);

  const setCols = (v: number) => onChange(clamp(v), rows);
  const setRows = (v: number) => onChange(cols, clamp(v));
  const typeCols = (v: string) => { setDraftCols(v); setCols(Number(v)); };
  const typeRows = (v: string) => { setDraftRows(v); setRows(Number(v)); };

  return (
    <div className="space-y-3 text-[11px] text-zinc-200">
      <div className={card}>
        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
          <label className="min-w-0">
            <div className="mb-1 text-[11px] uppercase tracking-wider text-slate-400">Width</div>
            <div className="flex items-center gap-1">
              <button type="button" className="btn btn-icon h-9 w-9 shrink-0" aria-label="Decrease width" onClick={() => setCols(cols - 1)}>−</button>
              <input type="number" min={4} max={512} aria-label="Matrix width" value={draftCols}
                className="field h-9 min-w-0 text-center tabular-nums"
                onFocus={() => { editing.current = "cols"; }}
                onChange={(e) => typeCols(e.target.value)}
                onBlur={() => { editing.current = null; setDraftCols(String(cols)); }} />
              <button type="button" className="btn btn-icon h-9 w-9 shrink-0" aria-label="Increase width" onClick={() => setCols(cols + 1)}>+</button>
            </div>
          </label>
          <button type="button" className="btn h-9 shrink-0 px-2" title="Swap width and height"
            onClick={() => onChange(rows, cols)}>SWAP</button>
          <label className="min-w-0">
            <div className="mb-1 text-[11px] uppercase tracking-wider text-slate-400">Height</div>
            <div className="flex items-center gap-1">
              <button type="button" className="btn btn-icon h-9 w-9 shrink-0" aria-label="Decrease height" onClick={() => setRows(rows - 1)}>−</button>
              <input type="number" min={4} max={512} aria-label="Matrix height" value={draftRows}
                className="field h-9 min-w-0 text-center tabular-nums"
                onFocus={() => { editing.current = "rows"; }}
                onChange={(e) => typeRows(e.target.value)}
                onBlur={() => { editing.current = null; setDraftRows(String(rows)); }} />
              <button type="button" className="btn btn-icon h-9 w-9 shrink-0" aria-label="Increase height" onClick={() => setRows(rows + 1)}>+</button>
            </div>
          </label>
        </div>
        <div className="rounded-lg border border-white/10 bg-[#0B0F17] px-2.5 py-2 font-mono text-[11px] text-zinc-400">
          Total: <span className="tabular-nums text-teal-300">{(cols * rows).toLocaleString()}</span> LEDs
        </div>
      </div>

      <div className={card}>
        <div className="text-[11px] uppercase tracking-wider text-slate-400">Presets</div>
        <div className="grid grid-cols-3 gap-2">
          {LAYOUT_PRESETS.map((preset) => {
            const active = cols === preset.cols && rows === preset.rows;
            return (
              <button key={`${preset.cols}x${preset.rows}`} type="button"
                className={`btn h-9 tabular-nums ${active ? "chip-active" : ""}`}
                onClick={() => onChange(preset.cols, preset.rows)}>
                {preset.cols}×{preset.rows}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
