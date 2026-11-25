import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

// shortcut: shell-only precache; runtime cache-first stores chunks after the first controlled load
const assets = Array.from(new Set(["/", "/manifest.webmanifest"]));
const list = assets.map((a) => JSON.stringify(a)).join(",\n  ");

const swPath = join(root, "public", "sw.js");
let sw = readFileSync(swPath, "utf8");
sw = sw.replace(/const PRECACHE_ASSETS = \[[\s\S]*?\];/, `const PRECACHE_ASSETS = [\n  ${list}\n];`);
writeFileSync(swPath, sw);
try { writeFileSync(join(root, "out", "sw.js"), sw); } catch {}
console.log(`Precached ${assets.length} shell assets into sw.js`);
