"use client";

import { useEffect, useRef, useState } from "react";
import { renderFrame } from "@/engine/compositor";
import { drawSimulatorFrame } from "@/engine/ledSimulator";
import { PORT_COLORS, type WiringMap } from "@/engine/wiringMapper";
import type { Project } from "@/types/project";
import { Icon } from "./icons";

interface Props {
  project: Project;
  map: WiringMap;
  playing: boolean;
  loop: boolean;
  loopStart: number;
  loopEnd: number;
  seek: { t: number; nonce: number };
  onTime: (t: number) => void;
  onEnd: () => void;
  onDeselect: () => void;
  onToggleWiring: () => void;
  onToggleIndices: () => void;
  onTogglePitch: () => void;
  split: boolean;
  onSplit: () => void;
  paused?: boolean;
}

interface Geom { ox: number; oy: number; cell: number }
interface Pane { x: number; y: number; w: number; h: number }
type PreviewMode = "current" | "simulator";

export default function CanvasViewport(p: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playRef = useRef(0);
  const viewRef = useRef({ zoom: 1, panX: 0, panY: 0 });
  const geomRef = useRef<Geom>({ ox: 0, oy: 0, cell: 10 });
  const sizeRef = useRef({ w: 0, h: 0 });
  const propsRef = useRef(p);
  propsRef.current = p;
  const [hover, setHover] = useState<string>("—");
  const [zoomLabel, setZoomLabel] = useState(100);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("simulator");
  const previewModeRef = useRef(previewMode);
  previewModeRef.current = previewMode;

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

    const paneRect = (x: number, y: number, w: number, h: number): Pane => ({ x, y, w, h });

    const drawPane = (rect: Pane, frame: Uint8ClampedArray, wiring: boolean) => {
      const { project, map, split } = propsRef.current;
      const { cols, rows, showPitch, showIndices, showZLinks, portChain } = project.hardware;
      const view = viewRef.current;
      ctx.fillStyle = "#08090d";
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      const pad = 20;
      const dense = cols * rows > 2500;
      const cell = Math.max(2, Math.min((rect.w - pad * 2) / cols, (rect.h - pad * 2) / rows) * view.zoom);
      const ox = rect.x + (rect.w - cell * cols) / 2 + view.panX;
      const oy = rect.y + (rect.h - cell * rows) / 2 + view.panY;
      if (rect === panes[0]) geomRef.current = { ox, oy, cell };

      if (showPitch && cell > 4) {
        ctx.strokeStyle = "rgba(255,255,255,0.035)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x <= cols; x++) { ctx.moveTo(ox + x * cell, oy); ctx.lineTo(ox + x * cell, oy + rows * cell); }
        for (let y = 0; y <= rows; y++) { ctx.moveTo(ox, oy + y * cell); ctx.lineTo(ox + cols * cell, oy + y * cell); }
        ctx.stroke();
      }

      if (wiring && cell > 2) {
        ctx.lineWidth = Math.max(1, cell * 0.05);
        for (let i = 0; i < map.pixels.length - 1; i++) {
          const a = map.pixels[i], b = map.pixels[i + 1];
          ctx.strokeStyle = PORT_COLORS[(a.port - 1) % 8] + "80";
          ctx.beginPath();
          ctx.moveTo(ox + (a.x + 0.5) * cell, oy + (a.y + 0.5) * cell);
          ctx.lineTo(ox + (b.x + 0.5) * cell, oy + (b.y + 0.5) * cell);
          ctx.stroke();
          if (i % Math.max(12, Math.round(24 / Math.max(0.4, view.zoom))) === 0) {
            const dx = b.x - a.x, dy = b.y - a.y;
            const mx = ox + (a.x + 0.5 + dx * 0.5) * cell;
            const my = oy + (a.y + 0.5 + dy * 0.5) * cell;
            const ang = Math.atan2(dy * cell, dx * cell);
            ctx.save();
            ctx.translate(mx, my); ctx.rotate(ang);
            ctx.fillStyle = PORT_COLORS[(a.port - 1) % 8];
            ctx.beginPath(); ctx.moveTo(3, 0); ctx.lineTo(-2, 2); ctx.lineTo(-2, -2); ctx.fill();
            ctx.restore();
          }
        }
      }

      const radius = Math.max(1.1, cell * 0.31);
      if (dense) {
        // One path per colour bucket: avoids 10k fillStyle changes and per-LED arcs.
        const buckets = new Map<number, number[]>();
        for (let i = 0; i < cols * rows; i++) {
          const q = i * 3;
          const r = frame[q], g = frame[q + 1], b = frame[q + 2];
          const px = ox + ((i % cols) + 0.5) * cell, py = oy + (((i / cols) | 0) + 0.5) * cell;
          if (px < rect.x - cell || px > rect.x + rect.w + cell || py < rect.y - cell || py > rect.y + rect.h + cell) continue;
          const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
          let bucket = buckets.get(key);
          if (!bucket) { bucket = [r, g, b]; buckets.set(key, bucket); }
          bucket.push(px - radius, py - radius, radius * 2, radius * 2);
        }
        for (const bucket of buckets.values()) {
          ctx.fillStyle = `rgb(${bucket[0] | 0},${bucket[1] | 0},${bucket[2] | 0})`;
          ctx.beginPath();
          for (let k = 3; k < bucket.length; k += 4) ctx.rect(bucket[k], bucket[k + 1], bucket[k + 2], bucket[k + 3]);
          ctx.fill();
        }
      } else {
        const glow = radius >= 4; // small LEDs skip the expensive second glow arc
        for (let i = 0; i < cols * rows; i++) {
          const x = i % cols, y = (i / cols) | 0;
          const q = i * 3;
          const r = frame[q], g = frame[q + 1], b = frame[q + 2];
          const px = ox + (x + 0.5) * cell, py = oy + (y + 0.5) * cell;
          if (px < rect.x - cell || px > rect.x + rect.w + cell || py < rect.y - cell || py > rect.y + rect.h + cell) continue;
          const lit = r + g + b > 12;
          if (glow && lit) {
            const halo = ctx.createRadialGradient(px, py, radius * 0.2, px, py, radius * 2.4);
            halo.addColorStop(0, `rgba(${r | 0},${g | 0},${b | 0},0.56)`);
            halo.addColorStop(1, `rgba(${r | 0},${g | 0},${b | 0},0)`);
            ctx.fillStyle = halo;
            ctx.beginPath(); ctx.arc(px, py, radius * 2.4, 0, Math.PI * 2); ctx.fill();
          }
          ctx.fillStyle = lit ? `rgb(${r | 0},${g | 0},${b | 0})` : "#090909";
          ctx.beginPath(); ctx.arc(px, py, radius, 0, Math.PI * 2); ctx.fill();
          if (lit && radius >= 3) {
            ctx.fillStyle = "rgba(255,255,255,0.52)";
            ctx.beginPath();
            ctx.arc(px - radius * 0.24, py - radius * 0.27, radius * 0.22, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      if (wiring && showZLinks !== false && (portChain ?? "z") === "z" && map.zLinks.length) {
        ctx.setLineDash([5, 3]);
        ctx.lineWidth = Math.max(1.5, cell * 0.11);
        ctx.strokeStyle = "#fbbf24";
        for (const link of map.zLinks) {
          const ax = ox + (link.from.x + 0.5) * cell;
          const ay = oy + (link.from.y + 0.5) * cell;
          const bx = ox + (link.to.x + 0.5) * cell;
          const by = oy + (link.to.y + 0.5) * cell;
          ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = "#fbbf24";
          ctx.font = "bold 9px ui-monospace, monospace";
          ctx.textAlign = "center"; ctx.textBaseline = "bottom";
          if (cell >= 14) ctx.fillText(`Z P${link.fromPort}→P${link.toPort}`, (ax + bx) / 2, (ay + by) / 2 - 4);
          else ctx.fillText("Z", (ax + bx) / 2, (ay + by) / 2 - 4);
          ctx.setLineDash([5, 3]);
        }
        ctx.setLineDash([]);
      }

      if (wiring && showIndices && cell > 15 && (!dense || view.zoom > 1.5)) {
        ctx.font = `${Math.min(9, cell * 0.32)}px ui-monospace, monospace`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        for (const pixel of map.pixels) {
          ctx.fillStyle = "rgba(255,255,255,0.55)";
          ctx.fillText(String(pixel.index), ox + (pixel.x + 0.5) * cell, oy + (pixel.y + 0.5) * cell - cell * 0.34);
        }
      }

      if (wiring && cell >= 8) {
        const seen = new Set<number>();
        for (const pixel of map.pixels) {
          if (seen.has(pixel.port)) continue;
          seen.add(pixel.port);
          ctx.fillStyle = PORT_COLORS[(pixel.port - 1) % 8];
          ctx.font = "bold 9px ui-monospace, monospace";
          ctx.textAlign = "left"; ctx.textBaseline = "top";
          // Stagger labels vertically so adjacent ports don't collide at the top.
          const stagger = (pixel.port - 1) * 11;
          ctx.fillText(`P${pixel.port}`, ox + pixel.x * cell + 2, oy + pixel.y * cell + 2 + stagger);
        }
      }

      if (split) {
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(rect.x + 8, rect.y + 8, wiring ? 74 : 62, 18);
        ctx.fillStyle = wiring ? "#5eead4" : "#a1a1aa";
        ctx.font = "bold 9px ui-monospace, monospace";
        ctx.textAlign = "left"; ctx.textBaseline = "middle";
        ctx.fillText(wiring ? "WIRING MAP" : "RENDER", rect.x + 14, rect.y + 17);
      }
    };

    let panes: Pane[] = [];
    const tick = (now: number) => {
      const { project, map, playing, loop, loopStart, loopEnd, onTime, onEnd, split, paused } = propsRef.current;
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      if (paused) { raf = requestAnimationFrame(tick); return; }
      if (playing) {
        playRef.current += dt;
        if (playRef.current < loopStart) playRef.current = loopStart;
        if (playRef.current >= loopEnd) {
          if (loop) playRef.current = loopStart;
          else { playRef.current = loopEnd; onEnd(); }
        }
      }
      if (now - lastUi > 90) { onTime(playRef.current); lastUi = now; }

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = sizeRef.current.w || canvas.clientWidth, h = sizeRef.current.h || canvas.clientHeight;
      if (!w || !h) { raf = requestAnimationFrame(tick); return; }
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const frame = renderFrame(project, playRef.current, map);
      panes = [paneRect(0, 0, w, h)];
      if (previewModeRef.current === "simulator") {
        const { cols, rows, showWiring } = project.hardware;
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
        drawSimulatorFrame(ctx, frame, { cols, rows, map, ox, oy, cell, wiring: showWiring });
        ctx.restore();
      } else if (split) {
        panes = [paneRect(0, 0, w / 2, h), paneRect(w / 2, 0, w / 2, h)];
        drawPane(panes[0], frame, false);
        drawPane(panes[1], frame, true);
        ctx.strokeStyle = "#3f3f46"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.stroke();
      } else {
        drawPane(panes[0], frame, project.hardware.showWiring);
      }
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
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const view = viewRef.current;
      view.zoom = Math.max(0.25, Math.min(6, view.zoom * (e.deltaY > 0 ? 0.9 : 1.1)));
      setZoomLabel(Math.round(view.zoom * 100));
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    p.onDeselect();
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    (e.target as HTMLCanvasElement).dataset.dragX = String(e.clientX);
    (e.target as HTMLCanvasElement).dataset.dragY = String(e.clientY);
    (e.target as HTMLCanvasElement).dataset.panX = String(viewRef.current.panX);
    (e.target as HTMLCanvasElement).dataset.panY = String(viewRef.current.panY);
    (e.target as HTMLCanvasElement).dataset.dragging = "1";
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const target = e.target as HTMLCanvasElement;
    if (target.dataset.dragging === "1") {
      viewRef.current.panX = +target.dataset.panX! + (e.clientX - +target.dataset.dragX!);
      viewRef.current.panY = +target.dataset.panY! + (e.clientY - +target.dataset.dragY!);
    }
    const rect = target.getBoundingClientRect();
    const { ox, oy, cell } = geomRef.current;
    const { cols, rows } = p.project.hardware;
    const gx = Math.floor((e.clientX - rect.left - ox) / cell);
    const gy = Math.floor((e.clientY - rect.top - oy) / cell);
    if (gx >= 0 && gx < cols && gy >= 0 && gy < rows) {
      const w = p.map.pixels[gy * cols + gx];
      setHover(`(${gx},${gy})  #${String(w.index).padStart(4, "0")}  P${w.port} · local ${w.localIndex}`);
    } else setHover("—");
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    (e.target as HTMLCanvasElement).dataset.dragging = "0";
  };

  const zoom = (factor: number) => {
    viewRef.current.zoom = Math.max(0.25, Math.min(6, viewRef.current.zoom * factor));
    setZoomLabel(Math.round(viewRef.current.zoom * 100));
    try { localStorage.setItem("pixleled_zoom_v1", String(viewRef.current.zoom)); } catch {}
  };

  return (
    <div className="relative min-h-0 flex-1 bg-zinc-950">
      <canvas ref={canvasRef} className="h-full w-full cursor-crosshair touch-none"
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
        onDoubleClick={() => { viewRef.current = { zoom: 1, panX: 0, panY: 0 }; setZoomLabel(100); }} />

      <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5">
        <span className="rounded bg-black/60 px-2 py-1 font-mono text-[10px] text-zinc-400 backdrop-blur">{p.project.hardware.cols} × {p.project.hardware.rows} · {p.map.totalPixels} px</span>
        <span className="rounded bg-black/60 px-2 py-1 font-mono text-[10px] text-teal-300 backdrop-blur">{hover}</span>
      </div>

      <div className="absolute right-3 top-3 flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900/85 p-1 backdrop-blur">
        <button className={`btn px-2 text-[10px] ${previewMode === "current" ? "chip-active" : ""}`}
          aria-pressed={previewMode === "current"} title="D1 — Current Studio preview"
          onClick={() => setPreviewMode("current")}>D1</button>
        <button className={`btn px-2 text-[10px] ${previewMode === "simulator" ? "chip-active" : ""}`}
          aria-pressed={previewMode === "simulator"} title="D2 — ledSimulator preview"
          onClick={() => setPreviewMode("simulator")}>D2</button>
        <span className="mx-0.5 h-4 w-px bg-zinc-700" />
        <button className="btn btn-icon" title="Zoom out" onClick={() => zoom(0.85)}><Icon name="zoomOut" /></button>
        <span className="w-9 text-center font-mono text-[10px] text-zinc-400">{zoomLabel}%</span>
        <button className="btn btn-icon" title="Zoom in" onClick={() => zoom(1.15)}><Icon name="zoomIn" /></button>
        <button className="btn btn-icon" title="Fit / reset view" onClick={() => { viewRef.current = { zoom: 1, panX: 0, panY: 0 }; setZoomLabel(100); }}><Icon name="fit" /></button>
        <span className="mx-0.5 h-4 w-px bg-zinc-700" />
        <button className={`btn btn-icon ${p.project.hardware.showWiring ? "text-teal-300" : ""}`} title="Wiring overlay" onClick={p.onToggleWiring}><Icon name="cpu" /></button>
        <button className={`btn btn-icon ${p.project.hardware.showIndices ? "text-teal-300" : ""}`} title="Pixel index labels" onClick={p.onToggleIndices}><span className="font-mono text-[9px]">#</span></button>
        <button className={`btn btn-icon ${p.project.hardware.showPitch ? "text-teal-300" : ""}`} title="Pitch grid" onClick={p.onTogglePitch}><Icon name="grid" /></button>
        <button className={`btn btn-icon ${p.split ? "text-teal-300" : ""}`} title="Split / compare preview" onClick={p.onSplit}><Icon name="split" /></button>
      </div>

      <div className="pointer-events-none absolute bottom-2 right-3 text-[9px] text-zinc-700">drag to pan · wheel to zoom · double-click to fit</div>
    </div>
  );
}
