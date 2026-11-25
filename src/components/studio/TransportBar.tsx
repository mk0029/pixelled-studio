"use client";

import { useState, useRef, useEffect } from "react";
import { Icon } from "./icons";
import type { HistoryEntry } from "@/lib/history";

interface Props {
  playing: boolean;
  canPlay: boolean;
  loop: boolean;
  time: number;
  duration: number;
  fps: number;
  onPlay: () => void;
  onStop: () => void;
  onPrev: () => void;
  onNext: () => void;
  onLoop: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  entries: HistoryEntry[];
  currentIndex: number;
  onJump: (index: number) => void;
  onClearHistory: () => void;
}

const fmt = (t: number) => {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  const ms = Math.floor((t % 1) * 1000);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
};

const relTime = (ts: number) => {
  const diff = Date.now() - ts;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return `${Math.floor(diff / 3600000)}h ago`;
};

export default function TransportBar(p: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const frame = Math.min(Math.round(p.time * p.fps), Math.round(p.duration * p.fps));
  const total = Math.round(p.duration * p.fps);
  return (
    <div className="flex h-11 shrink-0 items-center gap-2 border-t border-zinc-800 bg-zinc-900/60 px-3">
      <button className="btn btn-icon" title="Previous frame" onClick={p.onPrev}><Icon name="prev" /></button>
      <button className={`btn btn-icon ${p.playing ? "text-teal-300" : "btn-primary"} ${!p.canPlay ? "opacity-40 cursor-not-allowed" : ""}`} title={p.canPlay ? "Play / Pause (Space)" : "Add a layer first to play"} onClick={p.canPlay ? p.onPlay : undefined} disabled={!p.canPlay}>
        <Icon name={p.playing ? "pause" : "play"} />
      </button>
      <button className="btn btn-icon" title="Stop" onClick={p.onStop}><Icon name="stop" /></button>
      <button className="btn btn-icon" title="Next frame" onClick={p.onNext}><Icon name="next" /></button>
      <span className="mx-1 h-5 w-px bg-zinc-800" />
      <button className={`btn btn-icon ${p.loop ? "text-teal-300" : ""}`} title="Loop" onClick={p.onLoop}><Icon name="loop" /></button>
      <span className="mx-1 h-5 w-px bg-zinc-800" />
      <div className="font-mono text-[11px] tabular-nums text-zinc-300">{fmt(p.time)}</div>
      <div className="font-mono text-[10px] tabular-nums text-zinc-500">
        Frame {String(frame).padStart(4, "0")} / {String(total).padStart(4, "0")} · {p.fps} fps
      </div>
      <div className="ml-auto hidden items-center gap-2 md:flex">
        <button className="btn btn-icon" onClick={p.onUndo} disabled={!p.canUndo} title="Undo (Ctrl+Z)"><Icon name="undo" /></button>
        <button className="btn btn-icon" onClick={p.onRedo} disabled={!p.canRedo} title="Redo (Ctrl+Y)"><Icon name="redo" /></button>
        <div className="relative" ref={ref}>
          <button className="btn" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls="recent-changes">
            <Icon name="clock" size={13} /> Recent Changes
            <span className="ml-1 rounded bg-zinc-700 px-1.5 py-0.5 text-[9px]">{p.entries.length}</span>
          </button>
          {open && (
            <div id="recent-changes" className="absolute bottom-full right-0 mb-2 z-40 max-h-80 w-72 overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900/95 p-2 shadow-2xl backdrop-blur">
              <div className="space-y-1">
                {p.entries.slice().reverse().map((e, i) => {
                  const idx = p.entries.length - 1 - i;
                  const active = idx === p.currentIndex;
                  return (
                    <button key={idx} onClick={() => { p.onJump(idx); setOpen(false); }}
                      className={`w-full rounded px-2 py-1.5 text-left text-[10px] ${active ? "bg-blue-500/15 text-blue-300" : "text-zinc-300 hover:bg-zinc-800"}`}>
                      <div className="flex items-center justify-between">
                        <span className="truncate">{e.label}</span>
                        <span className="text-zinc-500">{relTime(e.timestamp)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 flex gap-2">
                <button className="btn flex-1" onClick={() => { p.onUndo(); }}>Step Back</button>
                <button className="btn flex-1" onClick={() => { p.onRedo(); }}>Step Forward</button>
                <button className="btn flex-1" onClick={() => { p.onClearHistory(); setOpen(false); }}>Clear</button>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="ml-auto text-[10px] text-zinc-600 md:hidden">Space play · ← → frame</div>
    </div>
  );
}
