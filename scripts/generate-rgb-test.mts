// Generate a 5 s red -> 5 s blue -> 5 s green .led using the verified codec.
// Usage: node --experimental-strip-types scripts/generate-rgb-test.mts
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import {
  decodeLedEdit2014,
  decodeFrameRgb,
  encodeLedEdit2014FromPixels,
  MAX_RGB_PIXELS,
} from "../src/engine/codecs/ledEdit2014Codec.ts";

const dir = "D:\\ashish\\Program_1";
// Blank export: header + trailer, identical header to the known-good rainbow export.
const template = new Uint8Array(readFileSync(`${dir}\\00.led`)).slice(0, 512);
// Mask comes from a real export made with the same controller configuration.
const reference = new Uint8Array(readFileSync(`${dir}\\_T_1000_AC\\00_1.led`));
const { mask } = decodeLedEdit2014(reference);

// 0x6000 = 1024 LEDs/port, which LedEdit's SD contract plays at 20 fps.
// 100 frames = 5 seconds of 100 % brightness per colour.
const COLORS: Record<string, number[]> = { red: [255, 0, 0], blue: [0, 0, 255], green: [0, 255, 0] };
const FRAMES_PER_COLOR = 100;
const sequence: number[][] = [];
for (const color of [COLORS.red, COLORS.blue, COLORS.green]) {
  for (let i = 0; i < FRAMES_PER_COLOR; i++) sequence.push(color);
}

const frames = sequence.map((color) => {
  const pixels = new Uint8Array(MAX_RGB_PIXELS * 3);
  for (let i = 0; i < MAX_RGB_PIXELS; i++) pixels.set(color, i * 3);
  return pixels;
});

const file = encodeLedEdit2014FromPixels({ header: template, frames, mask });
const outDir = `${dir}\\RGB_TEST`;
mkdirSync(outDir, { recursive: true });
const outPath = `${outDir}\\00_1.led`;
writeFileSync(outPath, file);
const cardDir = `${outDir}\\_T_1000_AC`;
mkdirSync(cardDir, { recursive: true });
writeFileSync(`${cardDir}\\00_1.led`, file);

// Verify with our own decoder: every pixel of every on-frame must be the requested colour.
const round = decodeLedEdit2014(file);
let ok = round.header.frameCount === frames.length && round.mask === mask;
for (let f = 0; f < frames.length && ok; f++) {
  const rgb = decodeFrameRgb(round.frames[f]);
  for (let i = 0; i < rgb.length; i += 3) {
    if (rgb[i] !== sequence[f][0] || rgb[i + 1] !== sequence[f][1] || rgb[i + 2] !== sequence[f][2]) {
      ok = false;
      break;
    }
  }
}
console.log(`wrote ${outPath}: ${file.length} bytes, ${frames.length} frames, mask 0x${mask.toString(16)}, ${MAX_RGB_PIXELS} pixels, pixel check ${ok ? "ok" : "FAILED"}`);
process.exit(ok ? 0 : 1);
