// Byte-level round-trip check for a LEDEdit 2014 .led file.
// Usage: node --experimental-strip-types scripts/verify-lededit2014.mts <file.led>
import { readFileSync } from "node:fs";
import {
  decodeLedEdit2014,
  decodeFrameRgb,
  encodeLedEdit2014FromPixels,
  verifyLedEdit2014RoundTrip,
} from "../src/engine/codecs/ledEdit2014Codec.ts";

const file = process.argv[2] ?? "D:\\ashish\\Led\\Controller-1\\00_program1.led";
const bytes = new Uint8Array(readFileSync(file));
const result = verifyLedEdit2014RoundTrip(bytes);
const xor = verifyLedEdit2014RoundTrip(bytes, "xor");
if (result.error) {
  console.log(`not a supported LEDEdit 2014 file: ${result.error}`);
  process.exit(1);
}

console.log(`magic ok, header 512 B, frames ${result.declaredFrames}/${result.physicalFrames}, ` +
  `mask 0x${result.mask.toString(16).padStart(2, "0")} (${result.maskMath}), size ${result.fileSize}`);
console.log(`all frames decode to 3072 B; trailing 1024 B all zero: ${result.tailsAllZero ? "yes" : "no"}`);
console.log(`re-encoded bytes identical: ${result.reencodedIdentical ? "yes" : "no"} ` +
  `(${result.reencodedSize}/${result.fileSize}); xor model: ${xor.ok ? "yes" : "no"}`);

const decoded = decodeLedEdit2014(bytes, { maskMath: result.maskMath });
const pixels = decoded.frames.map((frame) => decodeFrameRgb(frame));
const fromPixels = encodeLedEdit2014FromPixels({
  header: decoded.header,
  frames: pixels,
  mask: decoded.mask,
  maskMath: decoded.maskMath,
});
const pixelRoundTrip = fromPixels.length === bytes.length && fromPixels.every((b, i) => b === bytes[i]);
console.log(`RGB pixel round-trip identical: ${pixelRoundTrip ? "yes" : "no"} ` +
  `(${fromPixels.length}/${bytes.length}, ${pixels[0]?.length ?? 0} RGB bytes/frame)`);
process.exit(result.ok && xor.ok && pixelRoundTrip ? 0 : 1);
