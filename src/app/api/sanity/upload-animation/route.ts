import { createHash } from "node:crypto";
import path from "node:path";
import { NextResponse } from "next/server";
import { sanityAdminQuery, sanityCreateDocument, sanityUploadFile, sanityWriteEnabled } from "@/lib/sanityAdmin";

export const runtime = "nodejs";

const SUPPORTED = new Set([".swf", ".avi", ".tol"]);
const HASHES_QUERY = `*[_type == "animationAsset"]{ "hash": coalesce(fileHash, md5) }[defined(hash)].hash`;

const text = (value: FormDataEntryValue | null, fallback = "") =>
  typeof value === "string" ? value.slice(0, 160).trim() || fallback : fallback;

export async function POST(req: Request) {
  if (!sanityWriteEnabled()) {
    return NextResponse.json({ error: "SANITY_WRITE_TOKEN is not configured" }, { status: 503 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing animation file" }, { status: 400 });
  }
  const ext = path.extname(file.name).toLowerCase();
  if (!SUPPORTED.has(ext)) {
    return NextResponse.json({ error: "Only .swf, .avi and .tol files are supported" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const hash = createHash("md5").update(buffer).digest("hex");
  const existing = await sanityAdminQuery<string[]>(HASHES_QUERY);
  if (existing.includes(hash)) {
    return NextResponse.json({ status: "duplicate", title: file.name });
  }

  const assetId = await sanityUploadFile(new Blob([buffer]), file.name);
  await sanityCreateDocument({
    _type: "animationAsset",
    title: text(form.get("title"), path.basename(file.name, ext)),
    format: ext.slice(1),
    category: text(form.get("category"), "Building & Gate"),
    resolution: text(form.get("resolution"), "Universal"),
    sourcePack: text(form.get("sourcePack"), "browser-upload"),
    fileHash: hash,
    file: { _type: "file", asset: { _type: "reference", _ref: assetId } },
  });

  return NextResponse.json({ status: "uploaded", title: file.name });
}
