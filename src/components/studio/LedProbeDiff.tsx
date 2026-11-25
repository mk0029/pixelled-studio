"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_LED_PROFILE,
  type ControllerBinaryProfile,
  type LedChannelOrder,
} from "@/engine/codecs/ledCodec";
import { compareProbeFiles, type ProbeCompareResult } from "@/engine/codecs/ledProbeDiff";
import { listLedProfiles, saveLedProfile } from "@/lib/db";

interface Props {
  onUseProfile: (profile: ControllerBinaryProfile) => void;
}

const ORDERS: LedChannelOrder[] = ["RGB", "GRB", "BRG", "RBG", "GBR", "BGR", "GRBW"];
const hexByte = (n: number) => (n & 0xff).toString(16).padStart(2, "0");
const parseMask = (text: string): number[] | null => {
  const pairs = text.trim().split(/[^0-9a-fA-F]+/).filter(Boolean);
  if (text.trim() && pairs.some((p) => p.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(p))) return null;
  return pairs.flatMap((p) => p.match(/.{2}/g)!.map((v) => parseInt(v, 16)));
};

export default function LedProbeDiff({ onUseProfile }: Props) {
  const [files, setFiles] = useState<(File | null)[]>([null, null, null]);
  const [results, setResults] = useState<ProbeCompareResult[]>([]);
  const [profile, setProfile] = useState<ControllerBinaryProfile>({ ...DEFAULT_LED_PROFILE, xorMask: [] });
  const [maskText, setMaskText] = useState("");
  const [saved, setSaved] = useState<ControllerBinaryProfile[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    listLedProfiles().then(setSaved).catch(() => setSaved([]));
  }, []);

  const compare = async () => {
    setMessage("");
    setResults([]);
    const loaded = files.filter((f): f is File => !!f);
    if (loaded.length < 2) { setMessage("Pick at least two reference .led files."); return; }
    setBusy(true);
    try {
      const probes = await Promise.all(loaded.map(async (f) => ({
        name: f.name,
        bytes: new Uint8Array(await f.arrayBuffer()),
      })));
      setResults(compareProbeFiles(probes, { headerSize: profile.headerSize, maxDiffs: 400 }));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not read the probe files");
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setMessage("");
    const mask = parseMask(maskText);
    if (!mask) { setMessage("XOR mask must be hex bytes, e.g. 78 37."); return; }
    const next = { ...profile, xorMask: mask };
    try {
      await saveLedProfile(next);
      setSaved(await listLedProfiles());
      setProfile(next);
      onUseProfile(next);
      setMessage(`Saved profile "${next.id}".`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not save the profile");
    }
  };

  const patch = (change: Partial<ControllerBinaryProfile>) => setProfile((p) => ({ ...p, ...change }));

  return (
    <details className="mt-3 rounded border border-zinc-800 bg-zinc-950/60 p-2">
      <summary className="cursor-pointer text-xs font-semibold text-zinc-200">
        LEDEdit Probe Diff Tool
      </summary>
      <div className="mt-2 space-y-2 text-[11px] text-zinc-300">
        <div className="text-[10px] leading-snug text-zinc-500">
          Export an all-black frame, a single red pixel and a 2-frame probe from LEDEdit. Compare them here, then save
          the observed header size, idle byte, XOR mask and colour order as a reusable controller profile.
        </div>
        <div className="grid grid-cols-3 gap-2">
          {files.map((file, i) => (
            <label key={i} className="block">
              <span className="text-[10px] text-zinc-500">{["Reference A", "Reference B", "Reference C (optional)"][i]}</span>
              <input
                className="field mt-1 w-full text-[10px]"
                type="file"
                accept=".led"
                onChange={(e) => setFiles((prev) => prev.map((f, j) => (j === i ? e.target.files?.[0] ?? null : f)))}
              />
            </label>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn" onClick={compare} disabled={busy}>{busy ? "Comparing…" : "Compare bytes"}</button>
          <button className="btn" onClick={() => results[0] && patch({ idleFillByte: results[0].idleFillA })} disabled={!results.length}>
            Use idle byte 0x{hexByte(results[0]?.idleFillA ?? 0)}
          </button>
        </div>

        {results.map((r) => (
          <div key={r.label} className="rounded border border-zinc-800">
            <div className="px-2 py-1 text-[10px] text-zinc-400">
              {r.label}: {r.totalDiffs} differing byte{r.totalDiffs === 1 ? "" : "s"} in {r.compared} B
              {r.truncated ? " (showing first 400)" : ""}
            </div>
            <div className="max-h-40 overflow-auto">
              <table className="w-full table-fixed font-mono text-[10px]">
                <thead className="sticky top-0 bg-zinc-900 text-zinc-500">
                  <tr><th className="w-20 text-left">offset</th><th className="text-left">A</th><th className="text-left">B</th><th className="w-12 text-left">sec</th></tr>
                </thead>
                <tbody>
                  {r.differences.map((d) => (
                    <tr key={d.offset} className="border-t border-zinc-900">
                      <td className="text-zinc-500">0x{d.offset.toString(16).padStart(6, "0")}</td>
                      <td>{d.hexA} <span className="text-zinc-500">{d.asciiA}</span></td>
                      <td>{d.hexB} <span className="text-zinc-500">{d.asciiB}</span></td>
                      <td className="text-zinc-600">{d.section === "header" ? "hdr" : "frm"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        <div className="grid grid-cols-2 gap-2 border-t border-zinc-800 pt-2">
          <label>Profile ID<input className="field mt-1 w-full" value={profile.id} onChange={(e) => patch({ id: e.target.value })} /></label>
          <label>Header size<input className="field mt-1 w-full" type="number" min={0} value={profile.headerSize} onChange={(e) => patch({ headerSize: Number(e.target.value) })} /></label>
          <label>Magic<input className="field mt-1 w-full" value={profile.magicHeader} onChange={(e) => patch({ magicHeader: e.target.value })} /></label>
          <label>Colour order
            <select className="field mt-1 w-full" value={profile.channelOrder} onChange={(e) => patch({ channelOrder: e.target.value as LedChannelOrder })}>
              {ORDERS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </label>
          <label>Idle fill (hex)<input className="field mt-1 w-full" value={hexByte(profile.idleFillByte)} onChange={(e) => patch({ idleFillByte: parseInt(e.target.value, 16) & 0xff || 0 })} /></label>
          <label>XOR mask (hex bytes)<input className="field mt-1 w-full" placeholder="none" value={maskText} onChange={(e) => setMaskText(e.target.value)} /></label>
          <label>Sector size<input className="field mt-1 w-full" type="number" min={1} value={profile.sectorAlignment} onChange={(e) => patch({ sectorAlignment: Number(e.target.value) })} /></label>
          <label>Frame count offset<input className="field mt-1 w-full" type="number" min={0} value={profile.frameCountOffset ?? 12} onChange={(e) => patch({ frameCountOffset: Number(e.target.value) })} /></label>
          <label>Ports<input className="field mt-1 w-full" type="number" min={1} value={profile.portCount} onChange={(e) => patch({ portCount: Number(e.target.value) })} /></label>
          <label>Pixels / port<input className="field mt-1 w-full" type="number" min={1} value={profile.maxPixelsPerPort} onChange={(e) => patch({ maxPixelsPerPort: Number(e.target.value) })} /></label>
          <label>Wiring pattern
            <select className="field mt-1 w-full" value={profile.wiringPattern ?? 3} onChange={(e) => patch({ wiringPattern: Number(e.target.value) })}>
              {[
                "1. On the left horizontal", "2. On the right horizontal",
                "3. On the left vertical", "4. On the right vertical",
                "5. Under the left horizontal", "6. Under the right horizontal",
                "7. Under the left vertical", "8. Under the right vertical",
              ].map((label, i) => <option key={i + 1} value={i + 1}>{label}</option>)}
              <option value={9}>9. Z shape connect</option>
            </select>
          </label>
          {profile.wiringPattern === 9 && (
            <label>Z direction
              <select className="field mt-1 w-full" value={profile.wiringOrientation ?? "horizontal"} onChange={(e) => patch({ wiringOrientation: e.target.value as "horizontal" | "vertical" })}>
                <option value="horizontal">Horizontal Z</option>
                <option value="vertical">Vertical Z</option>
              </select>
            </label>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button className="btn btn-primary" onClick={save}>Save profile</button>
          <select className="field max-w-[14rem]" value="" onChange={(e) => {
            const found = saved.find((p) => p.id === e.target.value);
            if (!found) return;
            setProfile(found);
            setMaskText((found.xorMask ?? []).map(hexByte).join(" "));
            onUseProfile(found);
          }}>
            <option value="">Load saved profile…</option>
            {saved.map((p) => <option key={p.id} value={p.id}>{p.id}</option>)}
          </select>
        </div>
        {message && <div className="text-[10px] text-teal-300">{message}</div>}
      </div>
    </details>
  );
}
