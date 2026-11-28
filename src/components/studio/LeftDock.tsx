"use client";

import { useRef, useState, useMemo } from "react";
import { EFFECTS, type EffectId } from "@/types/project";
import { SANITY_EFFECTS } from "@/lib/sanityEffects";
import { MATH_EFFECTS } from "@/engine/mathCatalog";
import { PRESETS, type Preset } from "@/engine/presetLibrary";
import { Icon } from "./icons";
import MiniPresetCanvas from "./MiniPresetCanvas";

type Tab = "math" | "presets" | "effects" | "media";

interface Props {
  onAdd: (effect: EffectId, name?: string) => void;
  onAddPreset: (preset: Preset) => void;
  onImportMedia: (file: File, onStatus: (message: string) => void) => Promise<void>;
  width: number | string;
  /** Render inside a parent scroll container: no own scrollbar. */
  embedded?: boolean;
}

export default function LeftDock({ onAdd, onAddPreset, onImportMedia, width, embedded }: Props) {
  const [tab, setTab] = useState<Tab>("presets");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [files, setFiles] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const q = query.toLowerCase();

  const mathItems = useMemo(() => MATH_EFFECTS.filter((e) =>
    (category === "All" || e.category === category) &&
    (e.name.toLowerCase().includes(q) || e.description.toLowerCase().includes(q))), [category, q]);

  const presetItems = useMemo(() => PRESETS.filter((p) =>
    (category === "All" || p.category === category) &&
    (p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q))), [category, q]);

  const effectItems = useMemo(() => EFFECTS.filter((e) =>
    e.name.toLowerCase().includes(q) || e.detail.toLowerCase().includes(q)), [q]);

  const sanityItems = useMemo(() => SANITY_EFFECTS.filter((e) =>
    e.name.toLowerCase().includes(q) || e.file.toLowerCase().includes(q)), [q]);

  const addSanityEffect = async (e: (typeof SANITY_EFFECTS)[number]) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      setStatus(`Loading ${e.name}…`);
      const res = await fetch(e.url);
      if (!res.ok) throw new Error(`download failed (${res.status})`);
      const file = new File([await res.blob()], e.file, {
        type: res.headers.get("content-type") || "",
      });
      await onImportMedia(file, setStatus);
    } catch (err) {
      setError(`${e.name}: ${err instanceof Error ? err.message : "import failed"}`);
    } finally {
      setStatus("");
      setBusy(false);
    }
  };

  const categories = tab === "math"
    ? ["All", ...Array.from(new Set(MATH_EFFECTS.map((e) => e.category)))]
    : tab === "presets"
    ? ["All", ...Array.from(new Set(PRESETS.map((p) => p.category)))]
    : [];

  const tabButton = (id: Tab, icon: string, label: string) => (
    <button key={id} onClick={() => { setTab(id); setCategory("All"); }} className={`tab-btn flex-1 ${tab === id ? "tab-btn-active" : ""}`}>
      <span className="flex items-center justify-center gap-1"><Icon name={icon} size={12} />{label}</span>
    </button>
  );

  return (
    <aside style={{ width }} className={embedded ? "flex w-full min-w-0 flex-col" : "flex shrink-0 flex-col border-r border-zinc-800 bg-zinc-950"}>
      <div className="flex h-9 shrink-0 border-b border-zinc-800">
        {tabButton("presets", "sparkles", "Presets")}
        {tabButton("math", "sigma", "Math")}
        {tabButton("effects", "layers", "Effects")}
        {tabButton("media", "image", "Media")}
      </div>

      {tab !== "media" && (
        <div className="shrink-0 space-y-1.5 border-b border-zinc-800 p-2">
          <input className="field" placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)} />
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {categories.map((c) => (
                <button key={c} onClick={() => setCategory(c)}
                  className={`chip text-[9px] ${category === c ? "chip-active" : ""}`}>{c}</button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className={embedded ? "p-2" : "min-h-0 flex-1 overflow-y-auto overflow-x-auto p-2"}>
        {tab === "media" ? (
          <>
            <div onClick={() => !busy && fileRef.current?.click()}
              className={`cursor-pointer rounded-lg border border-dashed border-zinc-700 p-5 text-center hover:border-teal-500/60 ${busy ? "opacity-60" : ""}`}>
              <Icon name="image" size={22} />
              <div className="mt-2 text-[11px] font-semibold text-zinc-300">{busy ? "Importing…" : "Click to import media"}</div>
              <div className="mt-1 text-[10px] leading-snug text-zinc-600">PNG / JPG · animated GIF · MP4 / WebM still</div>
              <div className="mt-1 text-[10px] leading-snug text-zinc-600">Flash .swf · LEDEdit .sfx · .avi / .zip</div>
            </div>
            <input ref={fileRef} type="file" accept="image/*,video/*,.gif,.swf,.sfx,.avi,.zip" multiple hidden
              onChange={async (e) => {
                const picked = Array.from(e.target.files ?? []);
                e.target.value = "";
                if (!picked.length) return;
                setBusy(true);
                setError("");
                for (const file of picked) {
                  try {
                    setStatus(`Importing ${file.name}…`);
                    await onImportMedia(file, setStatus);
                    setFiles((f) => [...f, file.name]);
                  } catch (err) {
                    setError(`${file.name}: ${err instanceof Error ? err.message : "import failed"}`);
                  }
                }
                setStatus("");
                setBusy(false);
              }} />
            {status && <div className="mt-2 truncate text-[10px] text-teal-300/80">{status}</div>}
            {error && <div className="mt-2 rounded border border-red-500/30 bg-red-500/[.08] px-2 py-1.5 text-[10px] leading-snug text-red-300">{error}</div>}
            <div className="mt-3 space-y-1">
              {files.map((f, i) => (
                <div key={`${f}-${i}`} className="flex items-center gap-2 rounded border border-zinc-800 bg-zinc-900/60 px-2 py-1.5 text-[10px] text-zinc-400">
                  <Icon name="image" size={12} /><span className="truncate">{f}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 text-[9px] leading-relaxed text-zinc-600">
              Animations are baked to a sprite sheet at the current project grid. SWF plays once in the browser while it is captured; LED frames are baked in matrix order at that grid size.
            </div>
          </>
        ) : tab === "presets" ? (
          <div className="grid grid-cols-2 gap-1.5">
            {presetItems.map((pr) => (
              <button key={pr.id} onClick={() => onAddPreset(pr)} title={pr.description}
                className="flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900/60 px-1.5 py-1 text-left hover:border-teal-500/60">
                <MiniPresetCanvas preset={pr} size={24} />
                <span className="min-w-0 flex-1 truncate text-[9px] text-zinc-300">{pr.name}</span>
              </button>
            ))}
          </div>
        ) : tab === "math" ? (
          <div className="space-y-1">
            {mathItems.map((e) => (
              <button key={e.id} onClick={() => onAdd(e.id, e.name)} title={e.description}
                className="group flex w-full items-center gap-2 rounded-md border border-transparent px-2 py-1.5 text-left hover:border-zinc-700 hover:bg-zinc-900">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded bg-zinc-900 font-mono text-[10px] text-teal-400 group-hover:bg-teal-500/10">fx</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11px] font-medium text-zinc-200">{e.name}</span>
                  <span className="block truncate text-[9px] text-zinc-600">{e.category}</span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {status && <div className="truncate text-[10px] text-teal-300/80">{status}</div>}
            {error && <div className="rounded border border-red-500/30 bg-red-500/[.08] px-2 py-1.5 text-[10px] leading-snug text-red-300">{error}</div>}
            {["Motion", "Patterns", "Math & Logic", "Text & Media"].map((group) => {
              const items = effectItems.filter((e) => e.group === group);
              if (!items.length) return null;
              return (
                <div key={group} className="mb-3">
                  <div className="label mb-1.5 px-1">{group}</div>
                  <div className="space-y-1">
                    {items.map((e) => (
                      <button key={e.id} onClick={() => onAdd(e.id as EffectId, e.name)} title={e.detail}
                        className="group flex w-full items-center gap-2.5 rounded-md border border-transparent px-2 py-1.5 text-left hover:border-zinc-700 hover:bg-zinc-900">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded bg-zinc-900 font-mono text-[13px] text-teal-400 group-hover:bg-teal-500/10">{e.glyph}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[11px] font-medium text-zinc-200">{e.name}</span>
                          <span className="block truncate text-[9px] text-zinc-600">{e.detail}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            {sanityItems.length > 0 && (
              <div className="mb-3">
                <div className="label mb-1.5 px-1">Online FX</div>
                <div className="space-y-1">
                  {sanityItems.map((e) => (
                    <button key={e.id} onClick={() => void addSanityEffect(e)} title={e.url}
                      className="group flex w-full items-center gap-2.5 rounded-md border border-transparent px-2 py-1.5 text-left hover:border-teal-500/60 hover:bg-zinc-900">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded bg-zinc-900 font-mono text-[13px] text-teal-400 group-hover:bg-teal-500/10">☁</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[11px] font-medium text-zinc-200">{e.name}</span>
                        <span className="block truncate text-[9px] text-zinc-600">{e.file}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-zinc-800 p-2">
        <button onClick={() => onAdd("text", "Text Layer")} className="btn w-full">
          <Icon name="plus" size={12} />Add Text Layer
        </button>
        <div className="mt-1 text-[9px] leading-relaxed text-zinc-600">
          Click any generator or preset to add it as a layer. Media files create media layers.
        </div>
      </div>
    </aside>
  );
}
