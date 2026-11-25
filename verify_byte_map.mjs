import { createRecoveredByteMapModel, ledFrameFromRgb, buildLedProgram, RECOVERED_LED_COUNT } from "./src/engine/codecs/ledRecorder.ts";
import { FRAME_SIZE, HEADER_SIZE, TRAILER_SIZE } from "./src/engine/codecs/ledEdit2014Codec.ts";

const model = createRecoveredByteMapModel();
console.log("recovered", RECOVERED_LED_COUNT, "positions", model.positions.length, "mask", model.mask.toString(16));

const rgb = new Uint8ClampedArray(600 * 3);
for (let p = 0; p < 600; p++) { rgb[p * 3] = 255; rgb[p * 3 + 1] = 191; rgb[p * 3 + 2] = 128; }
const frame = ledFrameFromRgb(rgb, model, 600);
console.log("frame length", frame.length, "FRAME_SIZE", FRAME_SIZE);
let redOK = 0, greenOK = 0, blueOK = 0, off = 0;
for (const [r, g, b] of model.positions) {
  if (((frame[r] - model.mask) & 255) === 255) redOK++;
  if (((frame[g] - model.mask) & 255) === 191) greenOK++;
  if (((frame[b] - model.mask) & 255) === 128) blueOK++;
}
for (let i = FRAME_SIZE - 1024; i < FRAME_SIZE; i++) if (frame[i] === model.mask) off++;
console.log("redOK", redOK, "greenOK", greenOK, "blueOK", blueOK, "tail-mask", off);

const bytes = buildLedProgram([frame], model);
console.log("program", bytes.length, "expected", HEADER_SIZE + FRAME_SIZE + TRAILER_SIZE,
  "count", (bytes[0x0c] << 8) | bytes[0x0d]);
const same = bytes.subarray(HEADER_SIZE, HEADER_SIZE + FRAME_SIZE).every((v, i) => v === frame[i]);
console.log("frame copied", same);
