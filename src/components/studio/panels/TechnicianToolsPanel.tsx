"use client";

import { useState } from "react";
import type { Project } from "@/types/project";
import type { WiringMap } from "@/engine/wiringMapper";
import { convertRecToLed, makeCalibrationPairs, type RecToLedResult } from "@/engine/codecs/recToLed";
import {
  CALIBRATION_COLORS, buildLedRecordModel, clearLedRecordModel, deserializeLedRecordModel,
  loadLedRecordModel, RECOVERED_LED_COUNT, saveLedRecordModel, type LedCalibrationEntry,
} from "@/engine/codecs/ledRecorder";

interface Props {
  project: Project;
  map: WiringMap;
}

export default function TechnicianToolsPanel({ project, map }: Props) {
  const pixels = project.hardware.cols * project.hardware.rows;
  const amps5 = pixels * 0.06;
  const amps12 = pixels * 0.02;
  const watts5 = amps5 * 5;
  const watts12 = amps12 * 12;
  const psu5 = Math.ceil((amps5 * 1.2) / 60) || 1;
  const psu12 = Math.ceil((amps12 * 1.2) / 30) || 1;

  const [busy, setBusy] = useState(false);
  const [recFile, setRecFile] = useState<File | null>(null);
  const [ledFile, setLedFile] = useState<File | null>(null);
  const [converted, setConverted] = useState<{ url: string; stats: RecToLedResult } | null>(null);
  const [recError, setRecError] = useState("");
  const [converting, setConverting] = useState(false);
  const [calColor, setCalColor] = useState(CALIBRATION_COLORS[1].name);
  const [calFiles, setCalFiles] = useState<Record<string, File>>({});
  const [calMessage, setCalMessage] = useState(() => {
    const m = typeof window === "undefined" ? null : loadLedRecordModel();
    return m ? `Calibration ready (${m.colors.length} colours)` : "";
  });

  const saveCalibrations = async () => {
    const entries: LedCalibrationEntry[] = [];
    for (const [name, file] of Object.entries(calFiles)) {
      const def = CALIBRATION_COLORS.find((c) => c.name === name);
      if (def) entries.push({ rgb: def.rgb, led: new Uint8Array(await file.arrayBuffer()) });
    }
    try {
      saveLedRecordModel(buildLedRecordModel(entries));
      setCalMessage(`Calibration ready (${entries.length} colours)`);
    } catch (e) {
      setCalMessage(e instanceof Error ? e.message : "Calibration failed");
    }
  };

  const convert = async () => {
    if (!recFile || !ledFile) return;
    setConverting(true);
    setRecError("");
    setConverted(null);
    try {
      const rec = new Uint8Array(await recFile.arrayBuffer());
      const led = new Uint8Array(await ledFile.arrayBuffer());
      const pairs = makeCalibrationPairs(rec, led);
      const result = convertRecToLed(rec, led, pairs);
      const bytes = result.led;
      const blob = new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer], { type: "application/octet-stream" });
      setConverted({ url: URL.createObjectURL(blob), stats: result });
    } catch (e) {
      setRecError(e instanceof Error ? e.message : "Conversion failed");
    } finally {
      setConverting(false);
    }
  };

  const bundle = async () => {
    setBusy(true);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      zip.file("project.json", JSON.stringify(project, null, 2));
      zip.file("wiring.csv", `index,port,localIndex,x,y\n${map.pixels.map((p) => `${p.index},${p.port},${p.localIndex},${p.x},${p.y}`).join("\n")}`);
      zip.file("BOM.txt", `Pixel count: ${pixels}\nController: ${project.hardware.controllerId}\nChipset: ${project.hardware.chipsetId}\nCols: ${project.hardware.cols}\nRows: ${project.hardware.rows}\n`);
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project.name.replace(/[^\w-]+/g, "_") || "show"}_bundle.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 p-3 text-[11px] text-zinc-200">
      <div className="label mb-2">Technician Tools & SMPS</div>

      <div className="rounded border border-zinc-800 bg-zinc-900/60 p-3 space-y-1">
        <div className="font-semibold">SMPS Power & Injection</div>
        <div>Pixels: {pixels}</div>
        <div>5V peak: {amps5.toFixed(2)} A / {watts5.toFixed(0)} W</div>
        <div>12V peak: {amps12.toFixed(2)} A / {watts12.toFixed(0)} W</div>
        <div>Recommended 5V PSU (60A, 20% headroom): {psu5}</div>
        <div>Recommended 12V PSU (30A, 20% headroom): {psu12}</div>
        <div className="text-zinc-500">Power injection: every ~100 LEDs (5V) or ~300 LEDs (12V).</div>
      </div>

      <div className="rounded border border-teal-500/25 bg-teal-500/[.05] p-3 space-y-1">
        <div className="font-semibold text-teal-200">Recovered LED byte map</div>
        <div className="text-[10px] leading-snug text-zinc-400">
          {RECOVERED_LED_COUNT}/600 LED byte positions were recovered from single-LED LedEdit exports.
          The SD Card recorder and colour tester work without extra calibration.
        </div>
        <div className="text-[10px] leading-snug text-zinc-500">
          Use Export → Colour Tester for a solid colour or gradient, or Export → Record show for the full timeline.
        </div>
      </div>

      <div className="rounded border border-zinc-800 bg-zinc-900/60 p-3 space-y-2">
        <div className="font-semibold">Offline .led recorder · calibration</div>
        <div className="text-[10px] leading-snug text-zinc-500">
          Optional override for the built-in byte map. Export each Static Animations preset through LedEdit, then attach its .led here.
        </div>
        <div className="flex gap-1">
          <select className="min-w-0 flex-1 rounded border border-zinc-700 bg-zinc-950 px-1 py-1 text-[10px]"
            value={calColor} onChange={(e) => setCalColor(e.target.value)}>
            {CALIBRATION_COLORS.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
          <input className="min-w-0 flex-1 text-[10px]" type="file" accept=".led"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setCalFiles((prev) => ({ ...prev, [calColor]: file }));
            }} />
        </div>
        <div className="text-[10px] text-zinc-400">Attached: {Object.keys(calFiles).join(", ") || "none"}</div>
        <div className="flex gap-1">
          <button className="btn flex-1" onClick={saveCalibrations} disabled={!Object.keys(calFiles).length}>Save calibration</button>
          <button className="btn" onClick={() => { clearLedRecordModel(); setCalMessage(""); setCalFiles({}); }}>Clear</button>
        </div>
        <div className="text-[10px] text-zinc-500">Or import a ready-made model file:</div>
        <input className="w-full text-[10px]" type="file" accept=".txt"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              const model = deserializeLedRecordModel((await file.text()).trim());
              saveLedRecordModel(model);
              setCalMessage(`Imported calibration (${model.colors.length} colours, mask ${model.mask})`);
            } catch (err) {
              setCalMessage(err instanceof Error ? err.message : "Model import failed");
            }
          }} />
        {calMessage && <div className="text-[10px] text-teal-300">{calMessage}</div>}
      </div>

      <div className="rounded border border-zinc-800 bg-zinc-900/60 p-3 space-y-2">
        <div className="font-semibold">REC → LED (LedEdit recording)</div>
        <div className="text-[10px] leading-snug text-zinc-500">
          Record in LedEdit, then upload the <code>_rec.bin</code> and the <code>.led</code> exported from that same
          recording. The pair teaches the colour map; more solid-colour pairs improve it.
        </div>
        <input className="w-full text-[10px]" type="file" accept=".bin"
          onChange={(e) => { setRecFile(e.target.files?.[0] ?? null); setConverted(null); }} />
        <input className="w-full text-[10px]" type="file" accept=".led"
          onChange={(e) => { setLedFile(e.target.files?.[0] ?? null); setConverted(null); }} />
        <button className="btn w-full" onClick={convert} disabled={converting || !recFile || !ledFile}>
          {converting ? "Converting…" : "Convert REC → LED"}
        </button>
        {recError && <div className="text-[10px] text-red-300">{recError}</div>}
        {converted && (
          <div className="space-y-1 text-[10px] text-teal-300">
            <div>{converted.stats.frames} frames · exact {converted.stats.exact} · interp {converted.stats.interpolated} · fallback {converted.stats.fallback}</div>
            <a className="btn w-full inline-block text-center" href={converted.url} download="recording.led">Download recording.led</a>
          </div>
        )}
      </div>

      <button className="btn w-full" onClick={bundle} disabled={busy}>
        {busy ? "Bundling..." : "One-Click Team Share Bundle (.zip)"}
      </button>
    </div>
  );
}
