import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { pathToFileURL } from "node:url";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ledrec-"));
for (const name of ["ledRecorder", "ledEdit2014Codec", "ledByteMap"]) {
  let src = fs.readFileSync(`src/engine/codecs/${name}.ts`, "utf8");
  src = src.replace(/"\.\/ledEdit2014Codec"/g, '"./ledEdit2014Codec.ts"');
  src = src.replace(/"\.\/ledByteMap"/g, '"./ledByteMap.ts"');
  fs.writeFileSync(path.join(dir, `${name}.ts`), src);
}
const m = await import(pathToFileURL(path.join(dir, "ledRecorder.ts")).href);

const H = 512, F = 3072, T = 20480;
function fakeLed(fn) {
  const b = new Uint8Array(H + F + T);
  for (let i = 0; i < F; i++) b[H + i] = fn(i);
  return b;
}
// known synthetic mapping: R byte +100, G +50, B +10, pad 61
const black = fakeLed(() => 61);
const red = fakeLed((i) => 61 + (i % 3 === 0 ? 100 : 0));
const green = fakeLed((i) => 61 + (i % 3 === 1 ? 50 : 0));
const blue = fakeLed((i) => 61 + (i % 3 === 2 ? 10 : 0));
const model = m.buildLedRecordModel([
  { rgb: [0, 0, 0], led: black }, { rgb: [255, 0, 0], led: red },
  { rgb: [0, 255, 0], led: green }, { rgb: [0, 0, 255], led: blue },
]);

const rgb = new Uint8ClampedArray(9);
rgb.set([255, 255, 255, 255, 0, 0, 0, 0, 255]);
const frame = m.ledFrameFromRgb(rgb, model, 3);
console.log("frame head", Array.from(frame.slice(0, 9)));
console.log("expected ", [161, 111, 71, 161, 61, 61, 61, 61, 71]);

const round = m.deserializeLedRecordModel(m.serializeLedRecordModel(model));
const frame2 = m.ledFrameFromRgb(rgb, round, 3);
console.log("serialize round-trip ok", frame.every((v, i) => v === frame2[i]));

const program = m.buildLedProgram([frame, frame], model);
console.log("program bytes", program.length, "expected", H + 2 * F + T,
  "count", (program[0x0c] << 8) | program[0x0d]);

const byteModel = m.createRecoveredByteMapModel();
const solid = new Uint8ClampedArray(600 * 3).fill(255);
const byteFrame = m.ledFrameFromRgb(solid, byteModel, 600);
const [pr, pg, pb] = byteModel.positions[0];
console.log("byte-map model", byteModel.positions.length, "LEDs, mask", byteModel.mask.toString(16),
  "LED0 decoded", [(byteFrame[pr] - byteModel.mask + 256) & 255,
                   (byteFrame[pg] - byteModel.mask + 256) & 255,
                   (byteFrame[pb] - byteModel.mask + 256) & 255]);
fs.rmSync(dir, { recursive: true, force: true });
