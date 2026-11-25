import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { pathToFileURL } from "node:url";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cal-"));
for (const name of ["ledRecorder", "ledEdit2014Codec"]) {
  let src = fs.readFileSync(`src/engine/codecs/${name}.ts`, "utf8");
  src = src.replace(/"\.\/ledEdit2014Codec"/g, '"./ledEdit2014Codec.ts"');
  fs.writeFileSync(path.join(dir, `${name}.ts`), src);
}
const m = await import(pathToFileURL(path.join(dir, "ledRecorder.ts")).href);

const base = "D:/ashish/celibration/Led/Controller-1";
const entries = [
  { rgb: [0, 0, 0], led: new Uint8Array(fs.readFileSync(`${base}/black.led`)) },
  { rgb: [255, 0, 0], led: new Uint8Array(fs.readFileSync(`${base}/red.led`)) },
  { rgb: [0, 255, 0], led: new Uint8Array(fs.readFileSync(`${base}/green.led`)) },
  { rgb: [0, 0, 255], led: new Uint8Array(fs.readFileSync(`${base}/blue.led`)) },
];
const model = m.buildLedRecordModel(entries);
console.log("model", { colors: model.colors, mask: model.mask, baseUnique: [...new Set(model.base)].slice(0, 5) });

// Self-check: pure colours must reproduce each calibration frame exactly.
const H = 512, F = 3072;
for (const e of entries) {
  const rgb = new Uint8ClampedArray(1024 * 3);
  for (let p = 0; p < 1024; p++) { rgb[p*3] = e.rgb[0]; rgb[p*3+1] = e.rgb[1]; rgb[p*3+2] = e.rgb[2]; }
  const got = m.ledFrameFromRgb(rgb, model, 1024);
  const want = e.led.subarray(H, H + F);
  const wantMask = [...Array(1024).keys()].reduce((best, i) => {
    const v = want[F - 1024 + i]; const c = new Uint32Array(256);
    for (let k = 0; k < 1024; k++) c[want[F - 1024 + k]]++;
    return c[v] > c[best] ? v : best;
  }, 0);
  let diff = 0;
  for (let i = 0; i < F; i++) if (((got[i] - model.mask) & 0xff) !== ((want[i] - wantMask) & 0xff)) diff++;
  console.log("pure", e.rgb.join(","), "differing bytes vs calibration:", diff);
}

const text = m.serializeLedRecordModel(model);
const round = m.deserializeLedRecordModel(text);
console.log("serialized chars", text.length, "round-trip ok", round.mask === model.mask &&
  round.base.every((v, i) => v === model.base[i]) && round.dr.every((v, i) => v === model.dr[i]));
fs.writeFileSync("calibration-model.txt", text);
fs.rmSync(dir, { recursive: true, force: true });
