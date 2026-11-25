// Bulk-import dl.surf animation packs into Sanity. No extra npm dependency needed.
// Usage: npm run import:animations -- --dir="C:\path\to\packs"
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "3mq2fyfh";
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const token = process.env.SANITY_WRITE_TOKEN;
const API_VERSION = "2026-01-01";

if (!projectId || !token) {
  console.error("Missing NEXT_PUBLIC_SANITY_PROJECT_ID or SANITY_WRITE_TOKEN in .env.local");
  process.exit(1);
}

const dirArg = process.argv.find((a) => a.startsWith("--dir="));
const ROOT_FOLDER = dirArg
  ? dirArg.slice(6).replace(/^["']|["']$/g, "")
  : "C:\\Users\\mkhic\\Downloads\\pixel-packs";
const SUPPORTED = new Set([".swf", ".avi", ".tol"]);
const ARCHIVES = new Set([".zip", ".rar", ".7z"]);
const SEVEN_ZIP = "C:\\Program Files\\7-Zip\\7z.exe";
const CONCURRENCY = 5;
const HASHES_QUERY = `*[_type == "animationAsset"]{ "hash": coalesce(fileHash, md5) }[defined(hash)].hash`;

const apiUrl = (p) => `https://${projectId}.api.sanity.io/v${API_VERSION}/${p}/${dataset}`;
const headers = { Authorization: `Bearer ${token}` };

async function sanityQuery(query) {
  const res = await fetch(apiUrl("data/query"), {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`Sanity query failed: ${res.status} ${await res.text()}`);
  return (await res.json()).result;
}

async function sanityMutate(doc) {
  const res = await fetch(apiUrl("data/mutate"), {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ mutations: [{ create: doc }] }),
  });
  if (!res.ok) throw new Error(`Sanity mutate failed: ${res.status} ${await res.text()}`);
}

async function sanityUpload(buffer, fileName) {
  const form = new FormData();
  form.append("file", new Blob([buffer]), fileName);
  const res = await fetch(`${apiUrl("assets/files")}?filename=${encodeURIComponent(fileName)}`, {
    method: "POST",
    headers,
    body: form,
  });
  if (!res.ok) throw new Error(`Sanity upload failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  const id = json.document?._id ?? json.doc?._id;
  if (!id) throw new Error("Sanity upload returned no asset id");
  return id;
}

function extractArchivesIfAny(dir, warn = true) {
  if (!fs.existsSync(SEVEN_ZIP)) {
    if (warn) console.warn("7-Zip not found; skipping archive extraction.");
    return;
  }
  const entries = fs.readdirSync(dir, { recursive: true });
  for (const rel of entries) {
    const full = path.join(dir, rel);
    if (!fs.existsSync(full) || fs.statSync(full).isDirectory()) continue;
    const ext = path.extname(rel).toLowerCase();
    if (!ARCHIVES.has(ext)) continue;

    const outDir = path.join(path.dirname(full), path.basename(full, ext));
    if (fs.existsSync(outDir)) continue;
    console.log(`Extracting archive: ${path.basename(full)}...`);
    try {
      execFileSync(SEVEN_ZIP, ["x", full, `-o${outDir}`, "-y"], { stdio: "ignore" });
    } catch (err) {
      console.warn(`Could not extract ${full}: ${err.message}`);
    }
  }
}

function detectResolution(text, buf, fileName) {
  if (path.extname(fileName).toLowerCase() === ".avi" && buf.length > 32) {
    const strf = buf.indexOf(Buffer.from("strf"));
    if (buf.toString("ascii", 0, 4) === "RIFF" && strf > 0 && strf + 28 < buf.length) {
      const w = buf.readUInt32LE(strf + 12);
      const h = buf.readUInt32LE(strf + 16);
      if (w > 0 && h > 0 && w < 4096 && h < 4096) return `${w}x${h}`;
    }
  }
  return text.match(/(\d{1,3})\s*[xX×*]\s*(\d{1,3})/)?.slice(1).join("x") ?? "Universal";
}

function detectCategory(relPath) {
  const lower = relPath.toLowerCase();
  if (lower.includes("building") || lower.includes("bldg")) return "Building Effect";
  if (lower.includes("toran") || lower.includes("jhalar")) return "Toran";
  if (lower.includes("wedding") || lower.includes("vivah") || lower.includes("kalash")) return "Wedding & Kalash";
  if (lower.includes("gate") || lower.includes("pillar")) return "Gate & Pillar";
  if (lower.includes("firework") || lower.includes("chakra") || lower.includes("fire")) return "Fireworks & Chakra";
  const topFolder = relPath.split(path.sep)[0];
  return topFolder && topFolder !== "." ? topFolder.replace(/[-_]+/g, " ") : "General";
}

async function run() {
  if (!fs.existsSync(ROOT_FOLDER)) {
    fs.mkdirSync(ROOT_FOLDER, { recursive: true });
    console.log(`Created folder: ${ROOT_FOLDER}`);
    console.log("Drop your dl.surf packs here and run again.");
    return;
  }

  // Twice, so a zip inside a zip is also expanded.
  extractArchivesIfAny(ROOT_FOLDER);
  extractArchivesIfAny(ROOT_FOLDER, false);

  console.log("Fetching existing Sanity hashes to prevent duplicates...");
  const existingHashes = new Set(await sanityQuery(HASHES_QUERY));

  const queue = [];
  for (const relPath of fs.readdirSync(ROOT_FOLDER, { recursive: true })) {
    const fullPath = path.join(ROOT_FOLDER, relPath);
    if (!fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) continue;
    const ext = path.extname(relPath).toLowerCase();
    if (!SUPPORTED.has(ext)) continue;

    const buf = fs.readFileSync(fullPath);
    const hash = createHash("md5").update(buf).digest("hex");
    if (existingHashes.has(hash)) continue;
    existingHashes.add(hash);

    const fileName = path.basename(relPath);
    const parentDir = path.dirname(relPath);
    queue.push({
      fullPath,
      fileName,
      buf,
      hash,
      ext,
      title: path.basename(fileName, ext).replace(/[-_]+/g, " ").trim(),
      category: detectCategory(relPath),
      resolution: detectResolution(`${parentDir} ${fileName}`, buf, fileName),
      sourcePack: parentDir === "." ? "dl.surf" : parentDir.split(path.sep)[0],
    });
  }

  console.log(`Found ${queue.length} new unique animations to upload.`);
  let uploaded = 0;

  async function worker() {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;
      try {
        const assetId = await sanityUpload(item.buf, item.fileName);
        await sanityMutate({
          _type: "animationAsset",
          title: item.title,
          format: item.ext.slice(1),
          category: item.category,
          resolution: item.resolution,
          sourcePack: item.sourcePack,
          fileHash: item.hash,
          file: { _type: "file", asset: { _type: "reference", _ref: assetId } },
        });
        uploaded++;
        console.log(`[${uploaded}] ${item.ext.slice(1).toUpperCase()} | ${item.category} | ${item.resolution}: ${item.fileName}`);
      } catch (err) {
        console.error(`Failed ${item.fileName}: ${err.message}`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  console.log(`Finished! Added ${uploaded} animations to Sanity.`);
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
