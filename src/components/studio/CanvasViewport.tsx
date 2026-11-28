"use client";

import { useEffect, useRef, useState } from "react";
import { renderFrame } from "@/engine/compositor";
import { drawSimulatorFrame } from "@/engine/ledSimulator";
import type { Project } from "@/types/project";
import { Icon } from "./icons";

interface Props {
  project: Project;
  playing: boolean;
  loop: boolean;
  loopStart: number;
  loopEnd: number;
  seek: { t: number; nonce: number };
  time: number;
  duration: number;
  fps: number;
  onTime: (t: number) => void;
  onSeek: (t: number) => void;
  onEnd: () => void;
  onDeselect: () => void;
  onPlayPause: () => void;
  onTogglePitch: () => void;
  placeEmojiActive?: boolean;
  onPlaceEmoji?: (x: number, y: number) => void;
  paused?: boolean;
  fontsReady?: boolean;
  onRegisterZoomControls?: (controls: { zoomIn: () => void; zoomOut: () => void; fit: () => void; hundred: () => void }) => void;
}

interface Geom { ox: number; oy: number; cell: number }
interface PointerPoint { x: number; y: number }

export default function CanvasViewport(p: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const playRef = useRef(0);
  const viewRef = useRef({ zoom: 1, panX: 0, panY: 0 });
  const geomRef = useRef<Geom>({ ox: 0, oy: 0, cell: 10 });
  const sizeRef = useRef({ w: 0, h: 0 });
  const propsRef = useRef(p);
  propsRef.current = p;
  const pointersRef = useRef(new Map<number, PointerPoint>());
  const gestureRef = useRef({ x: 0, y: 0, panX: 0, panY: 0, dist: 1, midX: 0, midY: 0, zoom: 1 });
  const [hover, setHover] = useState<string>("—");
  const [zoomLabel, setZoomLabel] = useState(100);
  const [isCanvasToolbarOpen, setIsCanvasToolbarOpen] = useState(false);
  const placeStartRef = useRef<{ x: number; y: number } | null>(null);

  const zoom = (factor: number) => {
    viewRef.current.zoom = Math.max(0.25, Math.min(6, viewRef.current.zoom * factor));
    setZoomLabel(Math.round(viewRef.current.zoom * 100));
    try { localStorage.setItem("pixleled_zoom_v1", String(viewRef.current.zoom)); } catch {}
  };

  const resetGesture = () => {
    const pts = [...pointersRef.current.values()];
    const view = viewRef.current;
    if (pts.length === 1) {
      gestureRef.current = {
        x: pts[0].x, y: pts[0].y, panX: view.panX, panY: view.panY,
        dist: 1, midX: 0, midY: 0, zoom: view.zoom,
      };
    } else if (pts.length >= 2) {
      gestureRef.current = {
        x: 0, y: 0, panX: view.panX, panY: view.panY,
        dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1,
        midX: (pts[0].x + pts[1].x) / 2, midY: (pts[0].y + pts[1].y) / 2,
        zoom: view.zoom,
      };
    }
  };

  useEffect(() => { playRef.current = p.seek.t; }, [p.seek.nonce]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    let raf = 0;
    let last = performance.now();
    let lastUi = 0;
    const host = canvas.parentElement;
    const ro = host && typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => {
      sizeRef.current = { w: host.clientWidth, h: host.clientHeight };
    }) : null;
    if (host) sizeRef.current = { w: host.clientWidth, h: host.clientHeight };
    if (host) ro?.observe(host);

    const tick = (now: number) => {
      const { project, playing, loop, loopStart, loopEnd, onTime, onEnd, paused } = propsRef.current;
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const seqEnd = Math.max(0, ...project.layers.map((l) => l.startTime + l.duration));
      if (!paused && playing) {
        playRef.current += dt;
        if (playRef.current < loopStart) playRef.current = loopStart;
        if (playRef.current >= loopEnd) {
          if (loop) playRef.current = loopStart;
          else { playRef.current = loopEnd; onEnd(); }
        }
        // Never let the playhead run past the end of the sequence.
        if (seqEnd > 0 && playRef.current > seqEnd) {
          if (loop) playRef.current = 0;
          else { playRef.current = seqEnd; onEnd(); }
        }
      }
      if (now - lastUi > 90) { onTime(playRef.current); lastUi = now; }
      if (propsRef.current.fontsReady === false && project.layers.some((l) => l.effect === "text" || l.kind === "text")) {
        raf = requestAnimationFrame(tick);
        return;
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = sizeRef.current.w || canvas.clientWidth, h = sizeRef.current.h || canvas.clientHeight;
      if (!w || !h) { raf = requestAnimationFrame(tick); return; }
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const frame = renderFrame(project, playRef.current);
      const { cols, rows, showPitch } = project.hardware;
      const view = viewRef.current;
      const pad = 20;
      const cell = Math.max(2, Math.min((w - pad * 2) / cols, (h - pad * 2) / rows) * view.zoom);
      const ox = (w - cell * cols) / 2 + view.panX;
      const oy = (h - cell * rows) / 2 + view.panY;
      geomRef.current = { ox, oy, cell };
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, w, h);
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip();
      if (showPitch && cell > 4) {
        ctx.strokeStyle = "rgba(255,255,255,0.035)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x <= cols; x++) { ctx.moveTo(ox + x * cell, oy); ctx.lineTo(ox + x * cell, oy + rows * cell); }
        for (let y = 0; y <= rows; y++) { ctx.moveTo(ox, oy + y * cell); ctx.lineTo(ox + cols * cell, oy + y * cell); }
        ctx.stroke();
      }
      drawSimulatorFrame(ctx, frame, { cols, rows, ox, oy, cell });
      ctx.restore();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); ro?.disconnect(); };
  }, []);

  useEffect(() => {
    try {
      const z = parseFloat(localStorage.getItem("pixleled_zoom_v1") || "1");
      if (z >= 0.25 && z <= 6) { viewRef.current.zoom = z; setZoomLabel(Math.round(z * 100)); }
    } catch {}
  }, []);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (canvasContainerRef.current && !canvasContainerRef.current.contains(e.target as Node)) {
        setIsCanvasToolbarOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsCanvasToolbarOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoom(e.deltaY > 0 ? 0.9 : 1.1);
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!propsRef.current.placeEmojiActive && pointersRef.current.size === 0) p.onDeselect();
    e.currentTarget.setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (propsRef.current.placeEmojiActive) {
      placeStartRef.current = { x: e.clientX, y: e.clientY };
      return;
    }
    resetGesture();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pointers = pointersRef.current;
    if (pointers.has(e.pointerId)) {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const pts = [...pointers.values()];
      const g = gestureRef.current;
      if (!propsRef.current.placeEmojiActive && pts.length === 1) {
        viewRef.current.panX = g.panX + pts[0].x - g.x;
        viewRef.current.panY = g.panY + pts[0].y - g.y;
      } else if (!propsRef.current.placeEmojiActive && pts.length >= 2) {
        const [a, b] = pts;
        const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        const midX = (a.x + b.x) / 2, midY = (a.y + b.y) / 2;
        zoom((g.zoom * dist / g.dist) / viewRef.current.zoom);
        viewRef.current.panX = g.panX + midX - g.midX;
        viewRef.current.panY = g.panY + midY - g.midY;
      }
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const { ox, oy, cell } = geomRef.current;
    const { cols, rows } = p.project.hardware;
    const gx = Math.floor((e.clientX - rect.left - ox) / cell);
    const gy = Math.floor((e.clientY - rect.top - oy) / cell);
    if (gx >= 0 && gx < cols && gy >= 0 && gy < rows) setHover(`(${gx},${gy}) · #${gy * cols + gx}`);
    else setHover("—");
  };

  const onPointerEnd = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const start = placeStartRef.current;
    placeStartRef.current = null;
    pointersRef.current.delete(e.pointerId);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (propsRef.current.placeEmojiActive && start) {
      const dx = e.clientX - start.x, dy = e.clientY - start.y;
      if (Math.hypot(dx, dy) < 6) {
        const rect = e.currentTarget.getBoundingClientRect();
        const { ox, oy, cell } = geomRef.current;
        const { cols, rows } = propsRef.current.project.hardware;
        const gx = Math.floor((e.clientX - rect.left - ox) / cell);
        const gy = Math.floor((e.clientY - rect.top - oy) / cell);
        if (gx >= 0 && gx < cols && gy >= 0 && gy < rows) propsRef.current.onPlaceEmoji?.(gx, gy);
      }
    }
    if (!propsRef.current.placeEmojiActive) resetGesture();
  };

  useEffect(() => {
    p.onRegisterZoomControls?.({
      zoomIn: () => zoom(1.15),
      zoomOut: () => zoom(0.85),
      fit: () => { viewRef.current = { zoom: 1, panX: 0, panY: 0 }; setZoomLabel(100); },
      hundred: () => { viewRef.current.zoom = 1; setZoomLabel(100); },
    });
  }, [p.onRegisterZoomControls]);

  const frame = Math.round(p.time * p.fps);
  const maxFrame = Math.round(p.duration * p.fps);

  return (
    <div ref={canvasContainerRef} className="relative min-h-0 flex-1 bg-zinc-950"
      onClick={() => setIsCanvasToolbarOpen(true)}
      onContextMenu={(e) => { e.preventDefault(); setIsCanvasToolbarOpen(true); }}>
      <canvas ref={canvasRef} className="h-full w-full cursor-crosshair touch-none"
        onPointerDown={onPointerDown} onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd} onPointerCancel={onPointerEnd}
        onDoubleClick={() => { viewRef.current = { zoom: 1, panX: 0, panY: 0 }; setZoomLabel(100); }} />

      <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5">
        <span className="rounded bg-black/60 px-2 py-1 font-mono text-[10px] text-zinc-400 backdrop-blur">{p.project.hardware.cols} × {p.project.hardware.rows} · {p.project.hardware.cols * p.project.hardware.rows} px</span>
        <span className="rounded bg-black/60 px-2 py-1 font-mono text-[10px] text-teal-300 backdrop-blur">{hover}</span>
      </div>

      {p.playing && p.project.layers.length > 0 && (
        <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-1.5 rounded bg-black/60 px-2 py-1 font-mono text-[10px] text-teal-300 backdrop-blur">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-teal-400" />
          <span>{String(Math.floor(p.seek.t / 60)).padStart(2, "0")}:{(p.seek.t % 60).toFixed(1).padStart(4, "0")}</span>
        </div>
      )}

      {isCanvasToolbarOpen ? (
        <div className="absolute right-3 top-3 flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900/85 p-1 backdrop-blur">
          <button className="btn btn-icon" title="Zoom out" onClick={(e) => { e.stopPropagation(); zoom(0.85); }}><Icon name="zoomOut" /></button>
          <span className="w-9 text-center font-mono text-[10px] text-zinc-400">{zoomLabel}%</span>
          <button className="btn btn-icon" title="Zoom in" onClick={(e) => { e.stopPropagation(); zoom(1.15); }}><Icon name="zoomIn" /></button>
          <button className="btn btn-icon" title="Fit / reset view" onClick={(e) => { e.stopPropagation(); viewRef.current = { zoom: 1, panX: 0, panY: 0 }; setZoomLabel(100); }}><Icon name="fit" /></button>
          <span className="mx-0.5 h-4 w-px bg-zinc-700" />
          <button className={`btn btn-icon ${p.project.hardware.showPitch ? "text-teal-300" : ""}`} title="Pitch grid" onClick={(e) => { e.stopPropagation(); p.onTogglePitch(); }}><Icon name="grid" /></button>
        </div>
      ) : !p.playing ? (
        <div className="absolute bottom-3 left-3 text-[11px] text-zinc-600 pointer-events-none">
          Click or right-click canvas for view tools
        </div>
      ) : null}

      <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-white/10 bg-[#111827] px-2 py-1.5 text-white shadow-lg md:hidden"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.stopPropagation()}>
        <button className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-teal-300"
          aria-label={p.playing ? "Pause" : "Play"} onClick={() => p.onPlayPause()}>
          <Icon name={p.playing ? "pause" : "play"} size={18} />
        </button>
        <input type="range" className="h-11 w-40 accent-teal-400" aria-label="Frame scrub"
          min={0} max={maxFrame} value={frame}
          onChange={(e) => p.onSeek(Number(e.target.value) / p.fps)} />
        <span className="w-14 shrink-0 text-center font-mono text-[10px] text-zinc-400">{frame}/{maxFrame}</span>
      </div>

      <div className="pointer-events-none absolute bottom-2 right-3 text-[9px] text-zinc-700">drag to pan · wheel to zoom · double-click to fit</div>
    </div>
  );
}
