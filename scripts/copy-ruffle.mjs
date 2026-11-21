// Copies the self-hosted Ruffle player into public/ruffle for static export.
import { copyFileSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

const from = join("node_modules", "@ruffle-rs", "ruffle");
const to = join("public", "ruffle");
mkdirSync(to, { recursive: true });

let copied = 0;
for (const name of readdirSync(from)) {
  if (/^(ruffle\.js|core\.ruffle\..*\.js|.*\.wasm)$/.test(name)) {
    copyFileSync(join(from, name), join(to, name));
    copied++;
  }
}
console.log(`ruffle: ${copied} files copied to public/ruffle`);
