import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { pathToFileURL } from "node:url";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rec2led-"));
const src = fs.readFileSync("src/engine/codecs/recToLed.ts", "utf8").replace('"./ledEdit2014Codec"', `"./ledEdit2014Codec.ts"`);
fs.writeFileSync(path.join(dir, "recToLed.ts"), src);
fs.copyFileSync("src/engine/codecs/ledEdit2014Codec.ts", path.join(dir, "ledEdit2014Codec.ts"));
const { convertRecToLed, makeCalibrationPairs } = await import(pathToFileURL(path.join(dir, "recToLed.ts")).href);

const rec = new Uint8Array(fs.readFileSync("D:/ashish/Program_1/_rec.bin"));
const led = new Uint8Array(fs.readFileSync("D:/ashish/Program_1/_T_1000_AC/00_1.led"));
const pairs = makeCalibrationPairs(rec, led);
const r = convertRecToLed(rec, led, pairs);
let diff = 0;
for (let i = 0; i < led.length; i++) if (led[i] !== r.led[i]) diff++;
console.log({ pairs: pairs.length, frames: r.frames, exact: r.exact, interpolated: r.interpolated, fallback: r.fallback, recPad: r.recPad, ledPad: r.ledPad, outLen: r.led.length, ledLen: led.length, differingBytes: diff });
fs.rmSync(dir, { recursive: true, force: true });
