// Diagnostic: write several possible LED byte layouts as separate SD-card programs.
// Each program shows solid red 5 s -> blue 5 s -> green 5 s. Test each program
// with the controller and report which one shows solid, correct colours.
// Usage: node --experimental-strip-types scripts/generate-layout-probe.mts
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { decodeLedEdit2014, encodeLedEdit2014, FRAME_SIZE, DATA_BYTES } from "../src/engine/codecs/ledEdit2014Codec.ts";

const base = "D:\\ashish\\Program_1\\PROBE";
const header = new Uint8Array(readFileSync("D:\\ashish\\Program_1\\00.led")).slice(0, 512);
const { mask } = decodeLedEdit2014(new Uint8Array(readFileSync("D:\\ashish\\Program_1\\_T_1000_AC\\00_1.led")));

const RED = [255, 0, 0];
const BLUE = [0, 0, 255];
const GREEN = [0, 255, 0];
const COLORS = [RED, BLUE, GREEN];
const FPS = 20;
const FRAMES_PER_COLOR = 5 * FPS;

type FrameBuilder = (c: number[]) => Uint8Array;
const fill = (f: Uint8Array, from: number, to: number, value: number) => f.fill(value, from, to);

function interleaved(order: number[], pixels: number): FrameBuilder {
  return (c) => {
    const f = new Uint8Array(FRAME_SIZE);
    for (let i = 0; i < pixels; i++) for (let k = 0; k < 3; k++) f[i * 3 + k] = c[order[k]];
    return f;
  };
}
function planes(size: number, order: number[]): FrameBuilder {
  return (c) => {
    const f = new Uint8Array(FRAME_SIZE);
    for (let k = 0; k < 3; k++) fill(f, k * size, (k + 1) * size, c[order[k]]);
    return f;
  };
}

const probes: Record<string, { label: string; build: FrameBuilder }> = {
  "00": { label: "interleaved RGB, 600 px (current)", build: interleaved([0, 1, 2], 600) },
  "01": { label: "planar 600 x R,G,B", build: planes(600, [0, 1, 2]) },
  "02": { label: "planar 1024 x R,G,B", build: planes(1024, [0, 1, 2]) },
  "03": { label: "planar 600 x G,R,B (WS2811 order)", build: planes(600, [1, 0, 2]) },
  "04": { label: "planar 1024 x G,R,B (WS2811 order)", build: planes(1024, [1, 0, 2]) },
  "05": { label: "interleaved GRB, 600 px", build: interleaved([1, 0, 2], 600) },
  "06": { label: "planar 682 x R,G,B", build: planes(682, [0, 1, 2]) },
  "07": { label: "planar 1024 x B,G,R", build: planes(1024, [2, 1, 0]) },
};

const dir = `${base}\\_T_1000_AC`;
mkdirSync(dir, { recursive: true });
for (const [program, { label, build }] of Object.entries(probes)) {
  const frames = COLORS.flatMap((c) => Array.from({ length: FRAMES_PER_COLOR }, () => build(c)));
  const bytes = encodeLedEdit2014({ header, frames, mask });
  const target = `${dir}\\${program}_1.led`;
  writeFileSync(target, bytes);
  // Verify first frame of each colour section decodes to the requested byte pattern.
  const check = decodeLedEdit2014(bytes, { strict: false });
  let ok = check.frames.length === frames.length;
  for (let i = 0; i < COLORS.length && ok; i++) {
    const expected = build(COLORS[i]);
    for (let j = 0; j < FRAME_SIZE; j++) if (check.frames[i * FRAMES_PER_COLOR][j] !== expected[j]) { ok = false; break; }
  }
  console.log(`program ${program}: ${label} -> ${target} (${bytes.length} B, ${frames.length} frames, ${ok ? "ok" : "FAILED"})`);
}
console.log(`\nCard folder: ${dir}`);
console.log("Copy the whole PROBE folder to the SD card, select each program in turn, and report which one shows solid red/blue/green.");
console.log(`Data bytes per frame: ${DATA_BYTES}; frame size: ${FRAME_SIZE}; mask: 0x${mask.toString(16)}`);
