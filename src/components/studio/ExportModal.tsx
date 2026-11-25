"use client";

import { useEffect, useRef, useState } from "react";
import { runExport, testFrame, type ExportFormat, type LedTestPattern } from "@/engine/exporters";
import { renderFrame } from "@/engine/compositor";
import { loadLedRecordModel, RECOVERED_LED_COUNT } from "@/engine/codecs/ledRecorder";
import { decodeTol, type TolProgram } from "@/engine/codecs/tolDecoder";
import type { WiringMap } from "@/engine/wiringMapper";
import type { Project } from "@/types/project";

interface Props {
  open: boolean;
  project: Project;
  map: WiringMap;
  initialFormat: ExportFormat;
  onClose: () => void;
}

const FORMATS: { id: ExportFormat; label: string; detail: string; warn?: string }[] = [
  { id: "zip", label: "Frame ZIP · PNG sequence", detail: "Every frame as PNG, plus project.json, manifest.json and wiring.csv." },
  { id: "avi", label: "Video · AVI (MJPEG)", detail: "Motion-JPEG preview for VLC and Windows Media Player." },
  { id: "avi-raw", label: "LEDEdit Import · AVI (uncompressed 24-bit)", detail: "Uncompressed BI_RGB BGR24 at matrix size — opens in every LEDEdit via File → Open (.avi).", warn: "Large files (W×H×3 bytes per frame). Use for LEDEdit interchange, not SD cards." },
  { id: "fseq", label: "Falcon · FSEQ v2 (uncompressed)", detail: "PSEQ v2 sequence with one channel byte per LED channel in physical wiring order. Reliable fallback when a .led profile is not probed yet." },
  { id: "gif", label: "Video · animated GIF", detail: "Looping GIF at the chosen pixel size; plays anywhere a GIF does." },
  {
    id: "swf",
    label: "Flash · .swf (bitmap timeline)",
    detail: "One bitmap per animation frame; re-imports into this studio.",
    warn: "A browser needs a Flash emulator such as Ruffle to play a downloaded SWF.",
  },
  { id: "bin", label: "Raw frames · .bin", detail: "RGB frames in physical wiring order and colour order, for custom drivers." },
  {
    id: "led",
    label: "SD Card · .led (experimental)",
    detail: "One 00_<port>.led per output, zipped, matching the PP_C.led convention.",
    warn: "Pixel packing is unverified against a ground-truth export. Test on a spare SD card before a live show.",
  },
  {
    id: "led-rec",
    label: "Record show · .led (offline)",
    detail: `Fast-forwards the whole timeline into one .led file. Uses the recovered ${RECOVERED_LED_COUNT}/600-LED byte map unless a calibration model is uploaded.`,
    warn: "Colour transfer is identity and approximate. Test with the .led colour tester before a live show.",
  },
  {
    id: "led-test",
    label: "Colour Tester · .led (1 frame)",
    detail: "Writes a solid colour or mixed pattern straight to the probed LED byte positions — no LedEdit needed.",
    warn: `Byte map covers ${RECOVERED_LED_COUNT}/600 LEDs directly; the rest repeat the first recovered LEDs until re-probed.`,
  },
  {
    id: "tol-to-led",
    label: "TOL → SD Card · .led",
    detail: "Reads raw RGB frames from a LedEdit .tol and writes them through the recovered byte map — no LedEdit recording needed.",
    warn: `Assumes .tol rows match the project and ${RECOVERED_LED_COUNT}/600 LEDs are mapped. Prove wiring/colour with one matching .tol + .led pair.`,
  },
];

const SCALES = [1, 2, 4, 8, 12, 16];

const hexToRgb = (hex: string): [number, number, number] => {
  const v = hex.replace("#", "");
  return [parseInt(v.slice(0, 2), 16) || 0, parseInt(v.slice(2, 4), 16) || 0, parseInt(v.slice(4, 6), 16) || 0];
};

const TEST_PATTERNS: { id: LedTestPattern; label: string }[] = [
  { id: "solid", label: "Solid" },
  { id: "horizontal", label: "X gradient" },
  { id: "vertical", label: "Y gradient" },
  { id: "checker", label: "Checker" },
  { id: "walk", label: "Single LED" },
];

export default function ExportModal(p: Props) {
  const [format, setFormat] = useState<ExportFormat>(p.initialFormat);
  const [scale, setScale] = useState(8);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [phase, setPhase] = useState("");
  const [progress, setProgress] = useState(0);
  const [previewHex, setPreviewHex] = useState("");
  const [ledModelReady, setLedModelReady] = useState(false);
  const [testPattern, setTestPattern] = useState<LedTestPattern>("solid");
  const [testColor, setTestColor] = useState("#ff0000");
  const [tolProgram, setTolProgram] = useState<TolProgram | null>(null);
  const [tolName, setTolName] = useState("");
  const [tolError, setTolError] = useState("");
  const [error, setError] = useState("");
  const previewRef = useRef<HTMLCanvasElement>(null);
  const tolInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!p.open) return;
    setFormat(p.initialFormat);
    setDone(false);
    setError("");
    setProgress(0);
    setPhase("");
  }, [p.open, p.initialFormat]);

  useEffect(() => {
    if (p.open) setLedModelReady(!!loadLedRecordModel());
  }, [p.open]);

  useEffect(() => {
    if (!p.open) return;
    const { cols, rows } = p.project.hardware;
    const frame = format === "tol-to-led" && tolProgram?.frames[0]
      ? tolProgram.frames[0]
      : format === "led-test"
        ? testFrame(testPattern, hexToRgb(testColor), cols, rows)
        : renderFrame(p.project, 0, p.map, 0.5);
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
  }, [p.open, p.project, p.map, format, testPattern, testColor, tolProgram]);

  if (!p.open) return null;

  const frames = Math.max(1, Math.round(p.project.duration * p.project.fps));
  const active = FORMATS.find((f) => f.id === format)!;
  const raster = format === "zip" || format === "avi" || format === "avi-raw" || format === "gif" || format === "swf";

  const run = async () => {
    setBusy(true);
    setDone(false);
    setError("");
    setProgress(0);
    try {
      await runExport(p.project, p.map, format, {
        scale,
        ledModel: format === "led-test" ? undefined : loadLedRecordModel() ?? undefined,
        testPattern,
        testColor: hexToRgb(testColor),
        tolProgram: format === "tol-to-led" ? tolProgram ?? undefined : undefined,
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
            <div className="text-[12px] font-semibold text-zinc-100">Export show</div>
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

          {raster && (
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

          {format === "led-rec" && !ledModelReady && (
            <div className="rounded border border-teal-500/30 bg-teal-500/[.08] px-2.5 py-2 text-[10px] text-teal-300">
              Using the built-in recovered byte map ({RECOVERED_LED_COUNT}/600 LEDs). Upload a calibration model under Technician Tools to override it.
            </div>
          )}

          {format === "led-test" && (
            <div className="space-y-2 rounded border border-zinc-800 bg-zinc-900/40 p-2.5">
              <div className="label">Test pattern</div>
              <div className="flex flex-wrap gap-1">
                {TEST_PATTERNS.map((p) => (
                  <button key={p.id} disabled={busy} onClick={() => setTestPattern(p.id)}
                    className={`chip ${testPattern === p.id ? "chip-active" : ""}`}>{p.label}</button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="label">Colour</span>
                <input className="h-7 w-10 cursor-pointer rounded border border-zinc-700 bg-transparent" type="color"
                  value={testColor} onChange={(e) => setTestColor(e.target.value)} disabled={busy} />
                <code className="font-mono text-[10px] text-zinc-400">{testColor.toUpperCase()}</code>
              </div>
              <div className="text-[10px] leading-snug text-zinc-500">
                Writes one frame to the probed byte positions. Flash to the SD card and compare against this preview.
              </div>
            </div>
          )}

          {format === "tol-to-led" && (
            <div className="space-y-2 rounded border border-zinc-800 bg-zinc-900/40 p-2.5">
              <input ref={tolInputRef} type="file" accept=".tol" hidden
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  setTolError("");
                  try {
                    const program = decodeTol(new Uint8Array(await file.arrayBuffer()));
                    if (program.dimA !== p.project.hardware.rows || program.dimB !== p.project.hardware.cols) {
                      throw new Error(`TOL is ${program.dimB}×${program.dimA}; expected ${p.project.hardware.cols}×${p.project.hardware.rows}`);
                    }
                    setTolProgram(program);
                    setTolName(file.name);
                  } catch (err) {
                    setTolProgram(null);
                    setTolName("");
                    setTolError(err instanceof Error ? err.message : "Invalid .tol file");
                  }
                }} />
              <button className="btn" onClick={() => tolInputRef.current?.click()} disabled={busy}>Choose .tol</button>
              <div className="font-mono text-[10px] text-zinc-400">
                {tolProgram ? `${tolName} · ${tolProgram.frames.length} frames · ${tolProgram.dimB}×${tolProgram.dimA}` : "No .tol loaded"}
              </div>
              {tolError && <div className="text-[10px] text-red-300">{tolError}</div>}
              <div className="text-[10px] leading-snug text-zinc-500">
                Raw RGB frames are written through the recovered byte map. Prove wiring and colour with one matching export first.
              </div>
            </div>
          )}

          {format === "avi-raw" && (
            <div className="rounded border border-teal-500/25 bg-teal-500/[.06] px-2.5 py-2 text-[10px] leading-snug text-teal-200/80">
              <div className="mb-1 font-semibold">LedEdit recording workflow</div>
              <ol className="list-decimal space-y-0.5 pl-4">
                <li>Export this AVI at the exact matrix size ({p.project.hardware.cols} × {p.project.hardware.rows}).</li>
                <li>In LedEdit 2014: File → Open, select the AVI, and set the same matrix size / frame rate.</li>
                <li>Press Record to capture the animation, then export to the SD card as .led.</li>
                <li>Upload the resulting <code>_rec.bin</code> plus that .led under Technician Tools to reuse the mapping.</li>
              </ol>
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
          <button className="btn btn-primary" onClick={run} disabled={busy || (format === "tol-to-led" && !tolProgram)}>
            {busy ? "Exporting…" : "Export"}
          </button>
        </div>
      </div>
    </div>
  );
}
