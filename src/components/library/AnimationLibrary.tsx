"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { sanityEnabled, sanityFetch } from "@/lib/sanityClient";

export interface LibraryAsset {
  _id: string;
  title: string;
  format?: string;
  category?: string;
  resolution?: string;
  sourcePack?: string;
  url?: string;
  fileName?: string;
}

interface Props {
  compact?: boolean;
  onLoad?: (asset: LibraryAsset) => void;
}

const QUERY = `*[_type == "animationAsset"] | order(_createdAt desc) { _id, title, format, category, resolution, sourcePack, "url": file.asset->url, "fileName": file.asset->originalFilename }`;
const SUPPORTED = new Set([".swf", ".avi", ".tol", ".gif"]);
const FORMATS = ["all", "swf", "avi", "tol", "gif"];

const formatOf = (a: LibraryAsset) => (a.format ?? "").replace(/^\./, "").toLowerCase();

export default function AnimationLibrary({ compact = false, onLoad }: Props) {
  const [assets, setAssets] = useState<LibraryAsset[]>([]);
  const [search, setSearch] = useState("");
  const [format, setFormat] = useState("all");
  const [category, setCategory] = useState("all");
  const [resolution, setResolution] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(0);
  const [message, setMessage] = useState("");
  const [uploadCategory, setUploadCategory] = useState("Building & Gate");
  const [uploadResolution, setUploadResolution] = useState("Universal");
  const [uploadSource, setUploadSource] = useState("browser-upload");
  const fileRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!sanityEnabled()) { setLoading(false); setError("Sanity not configured"); return; }
    setLoading(true);
    try { setAssets(await sanityFetch<LibraryAsset[]>(QUERY)); setError(""); }
  catch (e) { setError(String(e)); }
  finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const options = useMemo(() => {
    const unique = (key: "category" | "resolution") =>
      [...new Set(assets.map((a) => a[key]).filter((v): v is string => !!v))].sort();
    return { categories: unique("category"), resolutions: unique("resolution") };
  }, [assets]);

  const filtered = assets.filter((a) => {
    const q = search.trim().toLowerCase();
    return (!q || `${a.title} ${a.category ?? ""} ${a.fileName ?? ""} ${a.sourcePack ?? ""}`.toLowerCase().includes(q))
      && (format === "all" || formatOf(a) === format)
      && (category === "all" || a.category === category)
      && (resolution === "all" || a.resolution === resolution);
  });

  const uploadFiles = async (files: File[]) => {
    const supported = files.filter((f) => SUPPORTED.has("." + f.name.split(".").pop()?.toLowerCase()));
    if (supported.length === 0) { setMessage("No .swf, .avi, .tol or .gif files selected."); return; }
    setBusy(true);
    setTotal(supported.length);
    setDone(0);
    setMessage("");
    let added = 0, duplicates = 0, failed = 0;

    for (let i = 0; i < supported.length; i++) {
      const file = supported[i];
      const form = new FormData();
      form.append("file", file);
      form.append("category", uploadCategory);
      form.append("resolution", uploadResolution);
      form.append("sourcePack", uploadSource);
      try {
        const res = await fetch("/api/sanity/upload-animation", { method: "POST", body: form });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) failed++;
        else if (data.status === "duplicate") duplicates++;
        else added++;
      } catch { failed++; }
      setDone(i + 1);
    }

    setBusy(false);
    setMessage(`Uploaded ${added}, skipped ${duplicates} duplicates, failed ${failed}.`);
    await load();
  };

  const openAsset = (a: LibraryAsset) => {
    if (!a.url) return;
    if (onLoad) { onLoad(a); return; }
    try {
      sessionStorage.setItem("pixleled_library_asset", JSON.stringify({ url: a.url, title: a.title }));
      localStorage.setItem("pixleled_entered_studio", "true");
    } catch { /* storage disabled: download remains available */ }
    window.location.assign("/");
  };

  return (
    <div className={compact ? "flex h-full flex-col text-[11px] text-zinc-100" : "mx-auto max-w-6xl text-zinc-100"}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">Cloud Animation Library</h2>
        <span className="rounded-full bg-teal-500/20 px-2 py-0.5 text-[10px] text-teal-300">{assets.length} assets</span>
        <button className="btn ml-auto" onClick={() => { setUploadOpen(true); setMessage(""); }}>Bulk Upload</button>
      </div>

      <input className="mb-3 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
        placeholder="Search title, category, file…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search assets" />

      <div className="mb-3 flex flex-wrap gap-1.5">
        {FORMATS.map((f) => (
          <button key={f} onClick={() => setFormat(f)}
            className={`rounded-full px-3 py-1 text-xs ${format === f ? "bg-teal-500 text-black" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"}`}>
            {f === "all" ? "All" : f.toUpperCase()}
          </button>
        ))}
        <select className="field ml-auto max-w-[150px]" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category filter">
          <option value="all">All categories</option>
          {options.categories.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
        <select className="field max-w-[150px]" value={resolution} onChange={(e) => setResolution(e.target.value)} aria-label="Resolution filter">
          <option value="all">All resolutions</option>
          {options.resolutions.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>

      {loading && <p className="text-zinc-400">Loading…</p>}
      {error && <p className="text-red-400">{error}</p>}
      {!loading && !error && filtered.length === 0 && <p className="text-zinc-500">No matching assets.</p>}

      <div className={compact ? "min-h-0 flex-1 space-y-2 overflow-y-auto pr-1" : "grid grid-cols-2 gap-4 md:grid-cols-4"}>
        {filtered.map((a) => {
          const fmt = formatOf(a);
          return (
            <div key={a._id} className="rounded border border-zinc-800 bg-zinc-900 p-3">
              {fmt === "gif" && a.url ? (
                <img src={a.url} alt={a.title} className="mb-2 h-20 w-full rounded bg-zinc-950 object-contain" loading="lazy" />
              ) : (
                <div className="mb-2 grid h-20 place-items-center rounded bg-zinc-950 font-mono text-2xl uppercase text-teal-300">{fmt || "•"}</div>
              )}
              <div className="truncate font-medium" title={a.title}>{a.title}</div>
              <div className="text-xs text-zinc-500">{a.category} · {fmt} · {a.resolution}</div>
              {a.sourcePack && <div className="truncate text-[10px] text-zinc-600">Pack: {a.sourcePack}</div>}
              {a.fileName && <div className="mt-1 truncate text-[10px] text-zinc-600" title={a.fileName}>{a.fileName}</div>}
              <div className="mt-2 flex flex-wrap gap-2">
                {a.url && onLoad && (
                  <button onClick={() => openAsset(a)}
                    className="rounded bg-teal-500 px-2 py-1 text-xs text-black">Import</button>
                )}
                {a.url && !onLoad && (
                  <a href={a.url} target="_blank" rel="noopener noreferrer"
                    className="rounded bg-zinc-700 px-2 py-1 text-xs text-zinc-100">Open</a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {uploadOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" role="dialog" aria-label="Bulk upload animations">
          <div className="w-full max-w-md space-y-3 rounded-lg border border-zinc-700 bg-zinc-950 p-4 text-zinc-100">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Bulk upload animations</h3>
              <button className="btn btn-icon" onClick={() => setUploadOpen(false)} aria-label="Close">✕</button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <input className="field" value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value)} aria-label="Category" placeholder="Category" />
              <input className="field" value={uploadResolution} onChange={(e) => setUploadResolution(e.target.value)} aria-label="Resolution" placeholder="Resolution" />
              <input className="field" value={uploadSource} onChange={(e) => setUploadSource(e.target.value)} aria-label="Source pack" placeholder="Source pack" />
            </div>
            <div className="grid h-28 cursor-pointer place-items-center rounded border border-dashed border-zinc-600 bg-zinc-900 text-center text-xs text-zinc-400"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); void uploadFiles(Array.from(e.dataTransfer.files)); }}>
              Drop .swf / .avi / .tol files here
              <div className="mt-2 flex gap-2">
                <button className="btn" onClick={() => fileRef.current?.click()}>Choose files</button>
                <button className="btn" onClick={() => folderRef.current?.click()}>Choose folder</button>
              </div>
            </div>
            <input ref={fileRef} type="file" accept=".swf,.avi,.tol" multiple hidden
              onChange={(e) => { void uploadFiles(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
            <input ref={folderRef} type="file" multiple hidden
              {...({ webkitdirectory: "" } as any)}
              onChange={(e) => { void uploadFiles(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
            {total > 0 && (
              <>
                <div className="h-2 overflow-hidden rounded bg-zinc-800">
                  <div className="h-full bg-teal-500 transition-all" style={{ width: `${(done / total) * 100}%` }} />
                </div>
                <div className="text-[10px] text-zinc-500">{done} / {total}</div>
              </>
            )}
            {message && <p className="text-xs text-zinc-300">{message}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
