"use client";

import { useEffect, useRef, useState } from "react";
import { decodeLedBuffer, type LedDecodeResult } from "@/engine/codecs/ledDecoder";
import { decodeLedBuffer as decodeWithProfile, type ControllerBinaryProfile } from "@/engine/codecs/ledCodec";
import LedProbeDiff from "./LedProbeDiff";
import type { WiringMap } from "@/engine/wiringMapper";

interface Props {
  open: boolean;
  file: File | null;
  map: WiringMap;
  cols: number;
  rows: number;
  fps: number;
  onClose: () => void;
  onImport: (file: File, options: Record<string, unknown>) => Promise<void>;
}

export default function LedImportModal({ open, file, map, cols, rows, fps, onClose, onImport }: Props) {
  const [headerMode, setHeaderMode] = useState<"auto" | "512" | "1024" | "0" | "custom">("auto");
  const [customHeader, setCustomHeader] = useState(512);
  const [useWiring, setUseWiring] = useState(true);
  const [colorOrder, setColorOrder] = useState("RGB");
  const [targetFps, setTargetFps] = useState(fps || 25);
  const [frameIndex, setFrameIndex] = useState(0);
  const [decoded, setDecoded] = useState<LedDecodeResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ControllerBinaryProfile | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const headerValue: number | "auto" =
    headerMode === "auto" ? "auto" :
    headerMode === "custom" ? customHeader :
    Number(headerMode);

  useEffect(() => {
    if (!open || !file) return;
    let cancelled = false;
    setError(null);
    setBusy(true);
    (async () => {
      try {
        const buf = await file.arrayBuffer();
        const res = profile
          ? decodeWithProfile(buf, { profile, width: cols, height: rows, fps: targetFps })
          : decodeLedBuffer(buf, {
              wiringMap: useWiring ? map : null,
              pixelCount: map.totalPixels,
              cols,
              rows,
              channels: 3,
              colorOrder,
              headerOffset: headerValue,
              wiringMode: useWiring ? "active" : "raster",
              fps: targetFps,
              targetFps,
            });
        if (cancelled) return;
        setDecoded(res);
        setFrameIndex(0);
        if (!res.ok) setError(res.error || "Decode failed");
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Decode failed");
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, file, map, cols, rows, useWiring, colorOrder, headerValue, targetFps, profile]);

  useEffect(() => {
    if (!decoded?.ok || !decoded.frames?.length || !canvasRef.current) return;
    const idx = Math.min(frameIndex, decoded.frames.length - 1);
    const frame = decoded.frames[idx];
    const canvas = canvasRef.current;
    canvas.width = cols;
    canvas.height = rows;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = new ImageData(new Uint8ClampedArray(frame), cols, rows);
    ctx.putImageData(img, 0, 0);
  }, [decoded, frameIndex, cols, rows]);

  if (!open) return null;

  const frames = decoded?.ok ? (decoded.frameCount ?? 0) : 0;
  const duration = decoded?.ok ? (decoded.duration ?? 0) : 0;
  const pixels = decoded?.ok ? (decoded.pixelsPerFrame ?? map.totalPixels) : map.totalPixels;
  const size = file?.size ?? 0;

  const handleImport = async () => {
    if (!file) return;
    setBusy(true);
    try {
      await onImport(file, {
        headerOffset: headerValue,
        colorOrder: profile?.channelOrder ?? colorOrder,
        useWiring,
        wiringMode: useWiring ? "active" : "raster",
        fps: targetFps,
        targetFps,
        pixelCount: map.totalPixels,
        cols,
        rows,
        width: cols,
        height: rows,
        channels: 3,
        wiringMap: useWiring ? map : null,
        profile,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-lg border border-zinc-700 bg-zinc-900 p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-100">Import .led Preview</h2>
          <button className="btn" onClick={onClose}>×</button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <div className="aspect-video w-full overflow-hidden rounded border border-zinc-700 bg-black">
              <canvas ref={canvasRef} className="h-full w-full" style={{ imageRendering: "pixelated" }} />
            </div>
            <div className="text-xs text-zinc-400">
              <div>File Size: {size} B</div>
              <div>Detected Frames: {frames}</div>
              <div>Estimated Duration: {duration.toFixed(2)} s</div>
              <div>Pixels/Frame: {pixels}</div>
            </div>
            {error && <div className="text-xs text-red-400">{error}</div>}
            {busy && <div className="text-xs text-teal-400">Processing…</div>}
          </div>
          <div className="flex flex-col gap-3">
            <label className="text-xs text-zinc-300">Header Offset
              <select className="field mt-1 w-full" value={headerMode} onChange={(e) => setHeaderMode(e.target.value as any)}>
                <option value="auto">Auto</option>
                <option value="512">512 B (LEDEdit 2014)</option>
                <option value="1024">1024 B</option>
                <option value="0">0 B (Raw)</option>
                <option value="custom">Custom</option>
              </select>
            </label>
            {headerMode === "custom" && (
              <input className="field" type="number" value={customHeader} onChange={(e) => setCustomHeader(Number(e.target.value))} />
            )}
            <label className="text-xs text-zinc-300">Wiring Un-Map
              <select className="field mt-1 w-full" value={useWiring ? "active" : "raster"} onChange={(e) => setUseWiring(e.target.value === "active")}>
                <option value="active">Use Active Layout Wiring</option>
                <option value="raster">Raw Raster (Left-to-Right)</option>
              </select>
            </label>
            <label className="text-xs text-zinc-300">Color Order
              <select className="field mt-1 w-full" value={colorOrder} onChange={(e) => setColorOrder(e.target.value)}>
                <option value="RGB">RGB</option>
                <option value="GRB">GRB</option>
                <option value="BRG">BRG</option>
                <option value="BGR">BGR</option>
              </select>
            </label>
            <label className="text-xs text-zinc-300">Target FPS
              <select className="field mt-1 w-full" value={targetFps} onChange={(e) => setTargetFps(Number(e.target.value))}>
                <option value={25}>25</option>
                <option value={30}>30</option>
              </select>
            </label>
            <label className="text-xs text-zinc-300">Frame Scrubber
              <input className="mt-1 w-full" type="range" min={0} max={Math.max(0, frames - 1)} value={frameIndex} onChange={(e) => setFrameIndex(Number(e.target.value))} />
              <div className="text-[10px] text-zinc-500">{frameIndex + 1} / {frames || 1}</div>
            </label>
          </div>
        </div>
        {profile && (
          <div className="mt-3 flex items-center gap-2 rounded border border-teal-500/25 bg-teal-500/[.06] px-2 py-1 text-[10px] text-teal-300">
            <span>Active binary profile: {profile.id}</span>
            <button className="ml-auto underline" onClick={() => setProfile(null)}>Use legacy decoder</button>
          </div>
        )}
        <LedProbeDiff onUseProfile={(p) => setProfile(p)} />
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleImport} disabled={busy || !decoded?.ok}>Import to Timeline</button>
        </div>
      </div>
    </div>
  );
}