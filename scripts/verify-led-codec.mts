// Self-check for the profile codec, probe diff and FSEQ writer.
// Usage: node --experimental-strip-types scripts/verify-led-codec.mts
import assert from "node:assert/strict";
import {
  DEFAULT_LED_PROFILE,
  decodeLedBuffer,
  encodeLedBuffer,
} from "../src/engine/codecs/ledCodec.ts";
import { compareLedBuffers } from "../src/engine/codecs/ledProbeDiff.ts";
import { buildFseqBytes } from "../src/engine/codecs/fseq.ts";

const width = 30;
const height = 20;
const pixels = width * height;
const frames = Array.from({ length: 3 }, (_, f) => {
  const rgba = new Uint8Array(pixels * 4);
  for (let p = 0; p < pixels; p++) {
    rgba[p * 4] = (p * 7 + f) & 0xff;
    rgba[p * 4 + 1] = (p * 3 + f * 11) & 0xff;
    rgba[p * 4 + 2] = (p + f * 29) & 0xff;
    rgba[p * 4 + 3] = 255;
  }
  return rgba;
});

const profile = {
  ...DEFAULT_LED_PROFILE,
  channelOrder: "GRB" as const,
  xorMask: [0x78, 0x37],
  wiringPattern: 9,
  wiringOrientation: "horizontal" as const,
};
const bytes = encodeLedBuffer({ profile, width, height, frames });
assert.equal(bytes.length, 512 + frames.length * 2048);
assert.equal(String.fromCharCode(...bytes.slice(0, 7)), "rzbv001");

const decoded = decodeLedBuffer(bytes, { profile, width, height });
assert.equal(decoded.ok, true);
if (!decoded.ok) throw new Error(decoded.error);
assert.equal(decoded.frames.length, frames.length);
assert.equal(decoded.meta.frameBytes, 2048);
assert.equal(decoded.meta.declaredFrames, frames.length);
for (let f = 0; f < frames.length; f++) {
  assert.deepEqual(decoded.frames[f], frames[f], `frame ${f} round-trip`);
}

const truncated = decodeLedBuffer(bytes.slice(0, 512 + 100), { profile, width, height });
assert.equal(truncated.ok, false);
assert.match(!truncated.ok ? truncated.error : "", /Truncated/);
assert.equal(decodeLedBuffer(new Uint8Array(0), { profile, width, height }).ok, false);

const a = new Uint8Array(600).fill(0x37);
const b = a.slice();
b[10] = 0xff;
b[599] = 0x22;
const diff = compareLedBuffers(a, b, "A ↔ B", { headerSize: 512, maxDiffs: 10 });
assert.equal(diff.totalDiffs, 2);
assert.deepEqual(diff.differences.map((d) => d.offset), [10, 599]);
assert.equal(diff.idleFillA, 0x37);
assert.equal(diff.differences[1].section, "payload");

const fseq = buildFseqBytes([new Uint8Array([1, 2, 3]), new Uint8Array([4, 5, 6])], 3, 25);
const view = new DataView(fseq.buffer);
assert.equal(String.fromCharCode(...fseq.slice(0, 4)), "PSEQ");
assert.equal(view.getUint16(4, true), 32);
assert.equal(view.getUint8(7), 2);
assert.equal(view.getUint32(10, true), 3);
assert.equal(view.getUint32(14, true), 2);
assert.equal(view.getUint8(18), 40);
assert.equal(fseq.length, 32 + 6);

console.log("profile codec round-trip: ok (RGBA + GRB + XOR + sector padding)");
console.log("truncated / empty files return errors without throwing: ok");
console.log("probe diff offsets and idle byte: ok");
console.log("FSEQ v2 header: ok");
