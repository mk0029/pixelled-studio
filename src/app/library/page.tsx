"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { sanityEnabled, sanityFetch } from "@/lib/sanityClient";

interface Asset {
  _id: string;
  title: string;
  format?: string;
  category?: string;
  resolution?: string;
  url?: string;
  fileName?: string;
}

const QUERY = `*[_type == "animationAsset"] | order(_createdAt desc) { _id, title, format, category, resolution, "url": file.asset->url, "fileName": file.asset->originalFilename }`;

function PillGroup({ label, values, value, onChange }: { label: string; values: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="mb-3">
      <div className="label mb-1">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {["all", ...values].map((v) => (
          <button key={v} onClick={() => onChange(v)}
            className={`rounded-full px-3 py-1 text-xs ${value === v ? "bg-teal-500 text-black" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"}`}>{v}</button>
        ))}
      </div>
    </div>
  );
}

export default function LibraryPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [search, setSearch] = useState("");
  const [format, setFormat] = useState("all");
  const [category, setCategory] = useState("all");
  const [resolution, setResolution] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sanityEnabled()) { setLoading(false); setError("Sanity not configured"); return; }
    sanityFetch<Asset[]>(QUERY).then(setAssets).catch((e) => setError(String(e))).finally(() => setLoading(false));
  }, []);

  const options = useMemo(() => {
    const unique = (key: "format" | "category" | "resolution") =>
      [...new Set(assets.map((a) => a[key]).filter((v): v is string => !!v))].sort();
    return { formats: unique("format"), categories: unique("category"), resolutions: unique("resolution") };
  }, [assets]);

  const filtered = assets.filter((a) => {
    const q = search.trim().toLowerCase();
    return (!q || `${a.title} ${a.category ?? ""} ${a.fileName ?? ""}`.toLowerCase().includes(q))
      && (format === "all" || a.format === format)
      && (category === "all" || a.category === category)
      && (resolution === "all" || a.resolution === resolution);
  });

  const loadIntoStudio = (a: Asset) => {
    if (!a.url) return;
    try {
      sessionStorage.setItem("pixleled_library_asset", JSON.stringify({ url: a.url, title: a.title, fileName: a.fileName }));
      localStorage.setItem("pixleled_entered_studio", "true");
    } catch { /* storage disabled: download instead */ }
    window.location.assign("/");
  };

  return (
    <main className="min-h-screen bg-zinc-950 p-6 text-zinc-100">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Animation Library</h1>
        <Link href="/" className="rounded bg-zinc-800 px-3 py-1.5 text-sm hover:bg-zinc-700">← Back to Studio</Link>
      </div>
      <input className="mb-4 w-full max-w-md rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
        placeholder="Search assets…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search assets" />
      <PillGroup label="Format" values={options.formats} value={format} onChange={setFormat} />
      <PillGroup label="Category" values={options.categories} value={category} onChange={setCategory} />
      <PillGroup label="Resolution" values={options.resolutions} value={resolution} onChange={setResolution} />

      {loading && <p className="text-zinc-400">Loading…</p>}
      {error && <p className="text-red-400">{error}</p>}
      {!loading && !error && filtered.length === 0 && <p className="text-zinc-500">No matching assets.</p>}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {filtered.map((a) => (
          <div key={a._id} className="rounded border border-zinc-800 bg-zinc-900 p-3">
            <div className="mb-2 grid h-20 place-items-center rounded bg-zinc-950 font-mono text-2xl text-teal-300">{a.format ?? "•"}</div>
            <div className="truncate font-medium" title={a.title}>{a.title}</div>
            <div className="text-xs text-zinc-500">{a.category} · {a.format} · {a.resolution}</div>
            {a.fileName && <div className="mt-1 truncate text-[10px] text-zinc-600" title={a.fileName}>{a.fileName}</div>}
            <div className="mt-2 flex flex-wrap gap-2">
              {a.url && (
                <a href={`${a.url}?dl=${encodeURIComponent(a.fileName ?? a.title)}`} download
                  className="rounded bg-teal-500 px-2 py-1 text-xs text-black">Download</a>
              )}
              {a.format === ".avi" && (
                <button onClick={() => loadIntoStudio(a)}
                  className="rounded bg-violet-500 px-2 py-1 text-xs text-black">Load into Studio</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
