"use client";

import { useEffect, useState } from "react";
import { sanityEnabled, sanityFetch, sanityFileUrl, sanityImageUrl } from "@/lib/sanityClient";

interface Asset {
  _id: string;
  title: string;
  slug?: { current: string };
  category?: string;
  format?: string;
  resolution?: string;
  file?: { asset?: { _ref: string } };
  previewThumbnail?: { asset?: { _ref: string } };
  tags?: string[];
  sourceAttribution?: string;
}

export default function LibraryPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [category, setCategory] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sanityEnabled()) { setLoading(false); setError("Sanity not configured"); return; }
    const q = `*[_type == "animationAsset"]{_id,title,slug,category,format,resolution,file,previewThumbnail,tags,sourceAttribution}`;
    sanityFetch<Asset[]>(q).then(setAssets).catch((e) => setError(String(e))).finally(() => setLoading(false));
  }, []);

  const filtered = category === "all" ? assets : assets.filter((a) => a.category === category);

  return (
    <main className="min-h-screen bg-zinc-950 p-6 text-zinc-100">
      <h1 className="mb-4 text-2xl font-semibold">Animation Library</h1>
      <div className="mb-4 flex gap-2">
        {["all", "Toran", "Matrix", "Wedding", "Characters", "Abstract"].map((c) => (
          <button key={c} onClick={() => setCategory(c)} className={`rounded px-3 py-1 text-sm ${category === c ? "bg-teal-500 text-black" : "bg-zinc-800"}`}>{c}</button>
        ))}
      </div>
      {loading && <p>Loading…</p>}
      {error && <p className="text-red-400">{error}</p>}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {filtered.map((a) => (
          <div key={a._id} className="rounded border border-zinc-800 bg-zinc-900 p-3">
            {a.previewThumbnail?.asset?._ref && (
              <img src={sanityImageUrl(a.previewThumbnail.asset._ref)} alt={a.title} className="mb-2 h-32 w-full object-contain" />
            )}
            <div className="font-medium">{a.title}</div>
            <div className="text-xs text-zinc-500">{a.category} · {a.format} · {a.resolution}</div>
            {a.file?.asset?._ref && (
              <a href={sanityFileUrl(a.file.asset._ref)} download className="mt-2 inline-block rounded bg-teal-500 px-2 py-1 text-xs text-black">Download</a>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}