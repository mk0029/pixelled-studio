import { readdirSync, statSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const root = process.cwd();
const assets = new Set();

function walk(dir, base) {
  let entries;
  try { entries = readdirSync(dir); } catch { return; }
  for (const name of entries) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, base);
    else {
      const rel = relative(base, full).split(sep).join("/");
      assets.add("/" + rel);
    }
  }
}

// Next.js static chunks
const nextStatic = join(root, ".next", "static");
let nextEntries;
try { nextEntries = readdirSync(nextStatic); } catch { nextEntries = []; }
function walkNext(dir) {
  let entries; try { entries = readdirSync(dir); } catch { return; }
  for (const name of entries) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walkNext(full);
    else {
      const rel = relative(nextStatic, full).split(sep).join("/");
      assets.add("/_next/static/" + rel);
    }
  }
}
walkNext(nextStatic);
// public assets
walk(join(root, "public"), join(root, "public"));

// Add root shell
assets.add("/");

const list = [...assets].map((a) => JSON.stringify(a)).join(",\n  ");
const swPath = join(root, "public", "sw.js");
let sw = readFileSync(swPath, "utf8");
sw = sw.replace(/const PRECACHE_ASSETS = \[[\s\S]*?\];/, `const PRECACHE_ASSETS = [\n  ${list}\n];`);
writeFileSync(swPath, sw);
console.log(`Precached ${assets.size} assets into sw.js`);
