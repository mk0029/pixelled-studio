"use client";

import { useEffect, useRef, useState } from "react";
import { runExport, type ExportFormat } from "@/engine/exporters";
import { renderFrame } from "@/engine/compositor";
import type { Project } from "@/types/project";

interface Props {
  open: boolean;
  project: Project;
  initialFormat: ExportFormat;
  fontsReady?: boolean;
  onClose: () => void;
}

const FORMATS: { id: ExportFormat; label: string; detail: string; warn?: string }[] = [
  { id: "zip", label: "Frame ZIP · PNG sequence", detail: "Every frame as PNG, plus project.json and manifest.json." },
  { id: "avi", label: "Video · AVI (MJPEG)", detail: "Motion-JPEG preview for VLC and Windows Media Player." },
  { id: "avi-raw", label: "LEDEdit Import · AVI (uncompressed 24-bit)", detail: "Uncompressed BI_RGB BGR24 at matrix size — opens in every LEDEdit via File → Open (.avi).", warn: "Large files (W×H×3 bytes per frame). Use for LEDEdit interchange, not SD cards." },
  { id: "fseq", label: "Falcon · FSEQ v2 (uncompressed)", detail: "One channel byte per LED channel in matrix raster order, for Falcon-style players." },
  { id: "gif", label: "Video · animated GIF", detail: "Looping GIF at the chosen pixel size; plays anywhere a GIF does." },
  {
    id: "swf",
    label: "Flash · .swf (bitmap timeline)",
    detail: "One bitmap per animation frame; re-imports into this studio.",
    warn: "A browser needs a Flash emulator such as Ruffle to play a downloaded SWF.",
  },
  { id: "bin", label: "Raw frames · .bin", detail: "RGB frames in matrix raster order and colour order, for custom drivers." },
];

const SCALES = [1, 2, 4, 8, 12, 16];

const hexToRgb = (hex: string): [number, number, number] => {
  const v = hex.replace("#", "");
  return [parseInt(v.slice(0, 2), 16) || 0, parseInt(v.slice(2, 4), 16) || 0, parseInt(v.slice(4, 6), 16) || 0];
};

export default function ExportModal(p: Props) {
  const [format, setFormat] = useState<ExportFormat>(p.initialFormat);
  const [scale, setScale] = useState(8);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [phase, setPhase] = useState("");
  const [progress, setProgress] = useState(0);
  const [previewHex, setPreviewHex] = useState("");
  const [error, setError] = useState("");
  const previewRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!p.open) return;
    setFormat(p.initialFormat);
    setDone(false);
    setError("");
    setProgress(0);
    setPhase("");
  }, [p.open, p.initialFormat]);

  useEffect(() => {
    if (!p.open || p.fontsReady === false) return;
    const { cols, rows } = p.project.hardware;
    const frame = renderFrame(p.project, 0, 0.5);
    const canvas = previewRef.current;
    if (!canvas) return;
    canvas.width = cols;
    canvas.height = rows;
    const ctx = canvas.getContext("2d")!;
    const img = ctx.createImageData(cols, rows);
    for (let i = 0; i < cols * rows; i++) {
      img.data[i * 4] = frame[i * 3];
      img.data[i * 4 + 1] = frame[i * 3 + 1];
      img.data[i * 4 + 2] = frame[i * 3 + 2];
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    const hex = Array.from(frame.slice(0, 48)).map((b) => b.toString(16).padStart(2, "0")).join(" ");
    setPreviewHex(hex);
  }, [p.open, p.project, format, p.fontsReady]);

  if (!p.open) return null;

  const frames = Math.max(1, Math.round(p.project.duration * p.project.fps));
  const active = FORMATS.find((f) => f.id === format)!;
  const raster = format === "zip" || format === "avi" || format === "avi-raw" || format === "gif" || format === "swf";
  const scalable = raster && format !== "avi-raw";

  const run = async () => {
    setBusy(true);
    setDone(false);
    setError("");
    setProgress(0);
    try {
      await runExport(p.project, format, {
        scale,
        onProgress: (d, t, ph) => {
          setProgress(t ? d / t : 0);
          setPhase(ph);
        },
      });
      setDone(true);
      setPhase("saved");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
      <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-lg flex-col rounded-xl border border-zinc-700 bg-zinc-950 shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-4 py-3">
          <div>
            <div className="text-[12px] font-semibold text-zinc-100">Export AVI</div>
            <div className="text-[10px] text-zinc-500">
              {p.project.hardware.cols} × {p.project.hardware.rows} · {frames} frames · {p.project.fps} fps
            </div>
          </div>
          <button className="btn btn-icon" onClick={p.onClose} disabled={busy}>✕</button>
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
          {FORMATS.map((f) => (
            <button key={f.id} onClick={() => setFormat(f.id)} disabled={busy}
              className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                format === f.id ? "border-teal-400/70 bg-teal-500/[.07]" : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
              }`}>
              <div className="flex items-center gap-2 text-[11px] font-semibold text-zinc-100">
                <span className={`h-2.5 w-2.5 rounded-full ${format === f.id ? "bg-teal-400" : "bg-zinc-700"}`} />
                {f.label}
              </div>
              <div className="mt-0.5 pl-4 text-[10px] leading-snug text-zinc-500">{f.detail}</div>
            </button>
          ))}

          {scalable && (
            <div className="flex items-center gap-2 pt-1">
              <span className="label">LED size</span>
              {SCALES.map((s) => (
                <button key={s} disabled={busy} onClick={() => setScale(s)}
                  className={`chip ${scale === s ? "chip-active" : ""}`}>{s}×</button>
              ))}
              <span className="ml-auto font-mono text-[10px] text-zinc-500">
                {p.project.hardware.cols * scale} × {p.project.hardware.rows * scale} px
              </span>
            </div>
          )}

          {active.warn && (
            <div className="rounded border border-amber-500/25 bg-amber-500/[.06] px-2.5 py-2 text-[10px] leading-snug text-amber-300/80">
              {active.warn}
            </div>
          )}

          {format === "avi-raw" && (
            <div className="rounded border border-teal-500/25 bg-teal-500/[.06] px-2.5 py-2 text-[10px] leading-snug text-teal-200/80">
              <div className="mb-1 font-semibold">LEDEdit import</div>
              <p>Exported at exactly {p.project.hardware.cols} × {p.project.hardware.rows} px — one BGR24 pixel per LED. Open the AVI in LEDEdit with File → Open; no scaling or interpolation is applied.</p>
            </div>
          )}

          <div className="rounded border border-zinc-800 bg-zinc-900/40 p-2.5">
            <div className="label mb-1.5">Frame inspector · frame 0 of {frames}</div>
            <div className="flex items-start gap-3">
              <canvas ref={previewRef} className="h-16 w-auto rounded border border-zinc-700" style={{ imageRendering: "pixelated" }} />
              <div className="min-w-0 flex-1">
                <div className="font-mono text-[9px] leading-relaxed text-zinc-500 break-all">{previewHex}</div>
                <div className="mt-1 text-[9px] text-zinc-600">{p.project.hardware.cols} × {p.project.hardware.rows} px · {frames} frames · {p.project.fps} fps</div>
              </div>
            </div>
          </div>

          {busy && (
            <div>
              <div className="mb-1 flex justify-between text-[10px] text-zinc-400">
                <span>{phase || "working"}</span>
                <span className="font-mono">{Math.round(progress * 100)}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                <div className="h-full bg-teal-400 transition-[width]" style={{ width: `${progress * 100}%` }} />
              </div>
            </div>
          )}

          {error && <div className="rounded border border-red-500/30 bg-red-500/[.08] px-2.5 py-2 text-[10px] text-red-300">{error}</div>}
          {done && <div className="rounded border border-teal-500/30 bg-teal-500/[.08] px-2.5 py-2 text-[10px] text-teal-300">Export complete — check your downloads.</div>}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-zinc-800 px-4 py-3">
          <button className="btn" onClick={p.onClose} disabled={busy}>Close</button>
          <button className="btn btn-primary" onClick={run} disabled={busy}>
            {busy ? "Exporting…" : "Export"}
          </button>
        </div>
      </div>
    </div>
  );
}
