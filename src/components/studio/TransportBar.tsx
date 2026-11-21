"use client";

import { Icon } from "./icons";

interface Props {
  playing: boolean;
  loop: boolean;
  time: number;
  duration: number;
  fps: number;
  onPlay: () => void;
  onStop: () => void;
  onPrev: () => void;
  onNext: () => void;
  onLoop: () => void;
}

const fmt = (t: number) => {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  const ms = Math.floor((t % 1) * 1000);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
};

export default function TransportBar(p: Props) {
  const frame = Math.min(Math.round(p.time * p.fps), Math.round(p.duration * p.fps));
  const total = Math.round(p.duration * p.fps);
  return (
    <div className="flex h-11 shrink-0 items-center gap-2 border-t border-zinc-800 bg-zinc-900/60 px-3">
      <button className="btn btn-icon" title="Previous frame (←)" onClick={p.onPrev}><Icon name="prev" /></button>
      <button className={`btn btn-icon ${p.playing ? "text-teal-300" : "btn-primary"}`} title="Play / Pause (Space)" onClick={p.onPlay}>
        <Icon name={p.playing ? "pause" : "play"} />
      </button>
      <button className="btn btn-icon" title="Stop" onClick={p.onStop}><Icon name="stop" /></button>
      <button className="btn btn-icon" title="Next frame (→)" onClick={p.onNext}><Icon name="next" /></button>
      <span className="mx-1 h-5 w-px bg-zinc-800" />
      <button className={`btn btn-icon ${p.loop ? "text-teal-300" : ""}`} title="Loop" onClick={p.onLoop}><Icon name="loop" /></button>
      <span className="mx-1 h-5 w-px bg-zinc-800" />
      <div className="font-mono text-[11px] tabular-nums text-zinc-300">{fmt(p.time)}</div>
      <div className="font-mono text-[10px] tabular-nums text-zinc-500">
        Frame {String(frame).padStart(4, "0")} / {String(total).padStart(4, "0")} · {p.fps} fps
      </div>
      <div className="ml-auto text-[10px] text-zinc-600">Space play · ← → frame · Ctrl+Z undo</div>
    </div>
  );
}
