"use client";

import { useState } from "react";
import { clampLayerTiming, type Layer, type Project } from "@/types/project";
import { Icon } from "./icons";

interface Props {
  project: Project;
  time: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onCommit: (updater: (p: Project) => Project, key?: string) => void;
  onSeek: (t: number) => void;
  onAction: (
    action:
      | "delete"
      | "duplicate"
      | "split"
      | "up"
      | "down"
      | "trimStart"
      | "trimEnd"
      | "snapStart"
      | "chain",
    id?: string,
  ) => void;
  onAdd: () => void;
  height: number;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const HEADER_W = 240;
const ROW_H = 36;
const BASE_PX_PER_SEC = 72;
const TRACK_COLORS = ["#38e1d4", "#9a7cff", "#ff7ab6", "#ffc857", "#6ee7a8", "#60a5fa", "#fb923c", "#f472b6"];
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const stamp = (t: number) =>
  `${String(Math.floor(t / 60)).padStart(2, "0")}:${(t % 60).toFixed(1).padStart(4, "0")}`;

export default function Timeline(p: Props) {
  const [menu, setMenu] = useState<{ x: number; y: number; id: string } | null>(
    null,
  );
  const [zoom, setZoom] = useState(1);
  const [snap, setSnap] = useState(true);
  const [guide, setGuide] = useState<number | null>(null);
  const PX_PER_SEC = BASE_PX_PER_SEC * zoom;
  const effectiveDuration = Math.max(0, ...p.project.layers.map((l) => l.startTime + l.duration));
  const width = Math.max(900, effectiveDuration * PX_PER_SEC + 120);

  const patch = (id: string, value: Partial<Layer>) =>
    p.onCommit((proj) => ({
      ...proj,
      layers: proj.layers.map((l) => (l.id === id ? { ...l, ...value } : l)),
    }));

  const dragClip = (
    e: React.PointerEvent,
    layer: Layer,
    mode: "move" | "left" | "right",
  ) => {
    e.preventDefault();
    e.stopPropagation();
    p.onSelect(layer.id);
    const x0 = e.clientX;
    const orig = { startTime: layer.startTime, duration: layer.duration };
    const key = `clip:${layer.id}:${mode}`;
    const snapTime = (t: number, targets: number[], enabled: boolean) => {
      if (!enabled) return t;
      let best = t,
        bestD = Infinity;
      for (const tg of targets) {
        const d = Math.abs(t - tg);
        if (d < bestD) {
          bestD = d;
          best = tg;
        }
      }
      const th = 8 / PX_PER_SEC;
      return bestD <= th ? best : t;
    };
    const move = (ev: PointerEvent) => {
      const dt = (ev.clientX - x0) / PX_PER_SEC;
      const edge =
        mode === "move"
          ? Math.max(0, orig.startTime + dt)
          : mode === "left"
            ? Math.max(0, orig.startTime + dt)
            : Math.max(0, orig.startTime + dt) +
              Math.max(0.1, orig.duration + dt);
      const targets: number[] = [0, effectiveDuration, p.time];
      for (const l of p.project.layers) {
        if (l.id === layer.id) continue;
        targets.push(l.startTime, l.startTime + l.duration);
      }
      const snapped = snapTime(edge, targets, snap && !ev.altKey);
      if (snapped !== edge) setGuide(snapped);
      p.onCommit((proj) => {
        let startTime =
          mode === "move"
            ? Math.max(0, orig.startTime + dt)
            : mode === "left"
              ? clamp(
                  orig.startTime + dt,
                  0,
                  orig.startTime + orig.duration - 0.1,
                )
              : orig.startTime;
        let duration =
          mode === "move"
            ? orig.duration
            : mode === "left"
              ? orig.startTime + orig.duration - startTime
              : Math.max(0.1, orig.duration + dt);
        const newEnd = startTime + duration;
        const newDuration = Math.max(proj.duration, newEnd);
        let start = startTime,
          dur = duration;
        if (mode === "left") {
          start = snapped;
          dur = orig.startTime + orig.duration - start;
        } else if (mode === "right") dur = snapped - startTime;
        else if (snapped !== startTime) {
          start = snapped;
        }
        const end2 = start + (mode === "move" ? orig.duration : dur);
        const dur2 = Math.max(proj.duration, end2);
        const finalDur = mode === "move" ? orig.duration : dur;
        return {
          ...proj,
          duration: dur2,
          layers: proj.layers.map((l) =>
            l.id === layer.id
              ? clampLayerTiming(
                  { ...l, startTime: start, duration: finalDur },
                  dur2,
                )
              : l,
          ),
        };
      }, key);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setGuide(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const rulerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const seek = (cx: number) =>
      p.onSeek(clamp((cx - rect.left) / PX_PER_SEC, 0, Math.max(0, effectiveDuration)));
    seek(e.clientX);
    const move = (ev: PointerEvent) => seek(ev.clientX);
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const tokenStep =
    effectiveDuration > 200 ? Math.ceil(effectiveDuration / 200) : 1;
  const tokens = [];
  for (let t = 0; t <= effectiveDuration; t += tokenStep) {
    const major = tokenStep > 1 ? true : t % 5 === 0;
    tokens.push(
      <div
        key={t}
        className="pointer-events-none absolute top-0 h-full"
        style={{ left: t * PX_PER_SEC }}>
        <div
          className={
            major ? "h-2.5 w-px bg-zinc-600" : "h-1.5 w-px bg-zinc-800"
          }
        />
        {major && (
          <span className="absolute left-1 top-2 font-mono text-[9px] text-zinc-500">
            {stamp(t)}
          </span>
        )}
      </div>,
    );
  }

  return (
    <div
      style={{ height: p.collapsed ? 36 : p.height }}
      className="flex shrink-0 flex-col border-t border-zinc-800 bg-zinc-950">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-zinc-800 px-3">
        <button
          className="btn btn-icon"
          title={p.collapsed ? "Expand timeline" : "Collapse timeline"}
          onClick={p.onToggleCollapse}>
          <Icon name="chevron" size={12} />
        </button>
        <span className="label">Timeline / sequencer</span>
        {p.project.layers.length > 0 && (
          <span className="text-[10px] text-zinc-600">
            {p.project.layers.length} tracks
          </span>
        )}
        <div className="ml-auto flex items-center gap-1">
          {!p.collapsed && (
            <button className="btn" onClick={p.onAdd}>
              <Icon name="plus" size={12} />
              Layer
            </button>
          )}
          {!p.collapsed && (
            <>
              <button
                className="btn btn-icon"
                title="Split at playhead (S)"
                onClick={() => p.onAction("split")}
                disabled={!p.selectedId}>
                <Icon name="split" />
              </button>
              <button
                className="btn btn-icon"
                title="Trim start to playhead ([)"
                onClick={() => p.onAction("trimStart")}
                disabled={!p.selectedId}>
                [
              </button>
              <button
                className="btn btn-icon"
                title="Trim end to playhead (])"
                onClick={() => p.onAction("trimEnd")}
                disabled={!p.selectedId}>
                ]
              </button>
              <button
                className="btn btn-icon"
                title="Snap start to playhead"
                onClick={() => p.onAction("snapStart")}
                disabled={!p.selectedId}>
                <Icon name="chevron" />
              </button>
              <button
                className="btn btn-icon"
                title="Chain after previous"
                onClick={() => p.onAction("chain")}
                disabled={!p.selectedId}>
                <Icon name="next" />
              </button>
            </>
          )}
          {!p.collapsed &&
            (
              [
                ["duplicate", "copy"],
                ["split", "split"],
                ["up", "up"],
                ["down", "down"],
                ["delete", "trash"],
              ] as const
            ).map(([a, icon]) => (
              <button
                key={a}
                className="btn btn-icon"
                title={a}
                disabled={a !== "duplicate" && !p.selectedId}
                onClick={() => p.onAction(a)}>
                <Icon name={icon} />
              </button>
            ))}
        </div>
      </div>

      {!p.collapsed && (
        <div
          className="relative min-h-0 flex-1 overflow-auto"
          onWheel={(e) => {
            if (e.ctrlKey || e.metaKey) {
              e.preventDefault();
              setZoom((z) =>
                Math.max(0.25, Math.min(4, z * (e.deltaY > 0 ? 0.9 : 1.1))),
              );
            }
          }}>
          <div
            className="relative min-w-full"
            style={{ width: HEADER_W + width }}
            onClick={() => p.onSelect(null)}>
            <div className="sticky top-0 z-40 flex h-7 bg-zinc-900">
              <div className="sticky left-0 z-50 flex w-60 shrink-0 items-center border-r border-zinc-700 bg-zinc-900 px-2">
                {/* <span className="label">Tracks</span> */}
                <div className="ml-auto flex items-center gap-1">
                  <button
                    className={`chip text-[6px] ${snap ? "chip-active" : ""}`}
                    onClick={() => setSnap((v) => !v)}
                    title="Magnet snap (Alt to bypass)">
                    Auto Align
                  </button>
                  <button
                    className="chip text-[9px]"
                    onClick={() => setZoom((z) => Math.max(0.25, z / 1.25))}
                    title="Zoom out">
                    −
                  </button>
                  <span className="font-mono text-[9px] text-zinc-500">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    className="chip text-[9px]"
                    onClick={() => setZoom((z) => Math.min(4, z * 1.25))}
                    title="Zoom in">
                    +
                  </button>
                </div>
              </div>
              <div
                className="relative cursor-ew-resize"
                style={{ width }}
                onPointerDown={rulerDown}>
                {tokens}
              </div>
            </div>

            {p.project.layers.map((layer, index) => {
              const selected = p.selectedId === layer.id;
              return (
                <div key={layer.id} className="flex" style={{ height: ROW_H }}>
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className={`sticky left-0 z-30 flex w-60 shrink-0 items-center gap-1 border-b border-r border-zinc-800 px-2 ${selected ? "bg-teal-500/[.07]" : "bg-zinc-900"}`}>
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: TRACK_COLORS[index % 8] }}
                    />
                    <button
                      onClick={() => p.onSelect(layer.id)}
                      className="min-w-0 flex-1 truncate text-left text-[10px] text-zinc-300">
                      {layer.name}
                    </button>
                    <button
                      className={`text-zinc-500 hover:text-zinc-200 ${layer.enabled ? "" : "opacity-40"}`}
                      title="Visibility"
                      onClick={() =>
                        patch(layer.id, { enabled: !layer.enabled })
                      }>
                      <Icon name={layer.enabled ? "eye" : "eyeOff"} size={12} />
                    </button>
                    <button
                      className={`rounded px-1 text-[9px] font-bold ${layer.solo ? "bg-amber-400/20 text-amber-300" : "text-zinc-600 hover:text-zinc-300"}`}
                      title="Solo"
                      onClick={() => patch(layer.id, { solo: !layer.solo })}>
                      S
                    </button>
                    <button
                      className={`rounded px-1 text-[9px] font-bold ${layer.mute ? "bg-red-500/20 text-red-300" : "text-zinc-600 hover:text-zinc-300"}`}
                      title="Mute"
                      onClick={() => patch(layer.id, { mute: !layer.mute })}>
                      M
                    </button>
                    <button
                      className="text-zinc-600 hover:text-red-400"
                      title="Delete"
                      onClick={() => p.onAction("delete", layer.id)}>
                      <Icon name="trash" size={11} />
                    </button>
                  </div>

                  <div
                    className="relative border-b border-zinc-900"
                    style={{
                      width,
                      backgroundImage:
                        "linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px)",
                      backgroundSize: `${PX_PER_SEC}px 100%`,
                    }}>
                    <div
                      className={`absolute top-1.5 flex h-6 items-center overflow-hidden rounded border ${selected ? "border-teal-400/70" : "border-zinc-700"}`}
                      style={{
                        left: layer.startTime * PX_PER_SEC,
                        width: Math.max(12, layer.duration * PX_PER_SEC),
                        background: selected
                          ? "linear-gradient(90deg,rgba(45,212,191,.35),rgba(139,92,246,.25))"
                          : "rgba(63,63,70,.5)",
                      }}
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => dragClip(e, layer, "move")}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        p.onSelect(layer.id);
                        setMenu({ x: e.clientX, y: e.clientY, id: layer.id });
                      }}>
                      <span
                        className="absolute inset-y-0 left-0 w-1.5 cursor-ew-resize bg-teal-400/70"
                        onPointerDown={(e) => dragClip(e, layer, "left")}
                      />
                      <span className="min-w-0 flex-1 truncate px-2 text-[10px] font-semibold text-zinc-100">
                        {layer.name}
                      </span>
                      {(layer.fadeIn > 0 || layer.fadeOut > 0) && (
                        <span className="mr-2 shrink-0 font-mono text-[9px] text-teal-200/70">
                          F{layer.fadeIn.toFixed(1)}/{layer.fadeOut.toFixed(1)}
                        </span>
                      )}
                      <span
                        className="absolute inset-y-0 right-0 w-1.5 cursor-ew-resize bg-violet-400/70"
                        onPointerDown={(e) => dragClip(e, layer, "right")}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            {!p.project.layers.length && (
              <div className="ml-60 flex h-20 items-center justify-center text-[11px] text-zinc-600">
                No layers — add one from the dock or the Add Layer button.
              </div>
            )}

            {p.project.layers.length > 0 && (
              <div
                className="pointer-events-none absolute bottom-0 top-0 z-[25] w-px bg-red-500 shadow-[0_0_7px_#ef4444]"
                style={{ left: HEADER_W + p.time * PX_PER_SEC }}>
                <span className="absolute -left-[4px] top-0 h-2 w-2 rotate-45 bg-red-500" />
              </div>
            )}
            {p.project.layers.length > 0 && effectiveDuration > 0 && (
              <div
                className="pointer-events-none absolute bottom-0 top-0 z-[24] w-px border-l border-dashed border-zinc-400/60"
                style={{ left: HEADER_W + effectiveDuration * PX_PER_SEC }}>
                <span className="absolute -top-4 left-1 whitespace-nowrap font-mono text-[9px] text-zinc-500">
                  End
                </span>
              </div>
            )}
            {guide != null && (
              <div
                className="pointer-events-none absolute bottom-0 top-0 z-[26] w-px bg-[#38bdf8]"
                style={{ left: HEADER_W + guide * PX_PER_SEC }}>
                <span className="absolute -left-[4px] top-0 h-2 w-2 rotate-45 bg-[#38bdf8]" />
                <span className="absolute -top-5 left-0 rounded bg-zinc-900 px-1 font-mono text-[9px] text-[#38bdf8]">
                  {String(Math.floor(guide / 60)).padStart(2, "0")}:
                  {(guide % 60).toFixed(1).padStart(4, "0")}s
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {menu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenu(null)} />
          <div
            className="fixed z-50 w-44 rounded-lg border border-zinc-700 bg-zinc-900 p-1 shadow-2xl"
            style={{ left: menu.x, top: menu.y }}>
            {(
              [
                ["duplicate", "Duplicate layer"],
                ["split", "Split at playhead"],
                ["up", "Move up"],
                ["down", "Move down"],
                ["delete", "Delete layer"],
              ] as const
            ).map(([a, label]) => (
              <button
                key={a}
                onClick={() => {
                  p.onAction(a, menu.id);
                  setMenu(null);
                }}
                className={`block w-full rounded px-2 py-1.5 text-left text-[11px] hover:bg-zinc-700/60 ${a === "delete" ? "text-red-400" : "text-zinc-300"}`}>
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
