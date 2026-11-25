/**
 * LedEdit 2014 REC → LED conversion.
 *
 * The colour transform is not derived from the format; it is LEARNED from
 * calibration pairs (a REC recording and the .led LedEdit exported from it).
 * For each byte position we keep the observed REC→LED samples and interpolate
 * between them, so adding more solid-colour calibration exports improves the
 * result. With a single static pair the output is only exact for that frame.
 */
import { HEADER_SIZE, FRAME_SIZE, TRAILER_SIZE } from "./ledEdit2014Codec";

/** One LedEdit recording frame: 8 slices of 3,072 bytes. */
export const REC_FRAME_SIZE = FRAME_SIZE * 8;
export const REC_SLICE_COUNT = 8;

export interface RecCalibrationPair {
  /** 3,072 bytes from one REC slice. */
  rec: Uint8Array;
  /** 3,072 *stored* (still masked) bytes from the matching LED frame. */
  led: Uint8Array;
}

export interface RecToLedResult {
  led: Uint8Array;
  frames: number;
  exact: number;
  interpolated: number;
  fallback: number;
  recPad: number;
  ledPad: number;
}

function mode(values: Uint8Array): number {
  const counts = new Uint32Array(256);
  for (const v of values) counts[v]++;
  let best = 0;
  for (let i = 1; i < 256; i++) if (counts[i] > counts[best]) best = i;
  return best;
}

export function recFrameCount(bytes: Uint8Array): number {
  return Math.max(0, Math.floor(bytes.length / REC_FRAME_SIZE));
}

/** Pull one 3,072-byte slice from a REC frame. */
export function extractRecSlice(bytes: Uint8Array, frame: number, slice = 0): Uint8Array {
  const start = frame * REC_FRAME_SIZE + slice * FRAME_SIZE;
  if (start < 0 || start + FRAME_SIZE > bytes.length) throw new Error("REC slice out of range");
  return bytes.slice(start, start + FRAME_SIZE);
}

/** Pull one stored LED frame from a complete .led file. */
export function extractLedFrame(bytes: Uint8Array, frame: number): Uint8Array {
  const start = HEADER_SIZE + frame * FRAME_SIZE;
  if (start < 0 || start + FRAME_SIZE > bytes.length) throw new Error("LED frame out of range");
  return bytes.slice(start, start + FRAME_SIZE);
}

/** Build calibration pairs from matching REC and LED files (frame by frame). */
export function makeCalibrationPairs(
  rec: Uint8Array,
  led: Uint8Array,
  slice = 0,
): RecCalibrationPair[] {
  const n = Math.min(recFrameCount(rec), Math.floor((led.length - HEADER_SIZE - TRAILER_SIZE) / FRAME_SIZE));
  const pairs: RecCalibrationPair[] = [];
  for (let f = 0; f < n; f++) pairs.push({ rec: extractRecSlice(rec, f, slice), led: extractLedFrame(led, f) });
  return pairs;
}

/**
 * Convert REC frames to a complete .led file using the learned mapping.
 * `template` supplies the 512-byte header and 20,480-byte trailer verbatim.
 */
export function convertRecToLed(
  rec: Uint8Array,
  template: Uint8Array,
  calibration: RecCalibrationPair[],
  slice = 0,
): RecToLedResult {
  if (template.length < HEADER_SIZE + FRAME_SIZE + TRAILER_SIZE) {
    throw new Error("Template .led is too small (need header + one frame + trailer)");
  }
  if (!calibration.length) throw new Error("At least one REC/LED calibration pair is required");

  // samples[position] = sorted list of [recValue, ledValue].
  const samples: { input: number; output: number }[][] = Array.from({ length: FRAME_SIZE }, () => []);
  const recPads: number[] = [];
  const ledPads: number[] = [];
  for (const pair of calibration) {
    if (pair.rec.length < FRAME_SIZE || pair.led.length < FRAME_SIZE) {
      throw new Error("Calibration pair frames must be 3,072 bytes");
    }
    for (let i = 0; i < FRAME_SIZE; i++) samples[i].push({ input: pair.rec[i], output: pair.led[i] });
    recPads.push(mode(pair.rec));
    ledPads.push(mode(pair.led));
  }
  const recPad = mode(Uint8Array.from(recPads));
  const ledPad = mode(Uint8Array.from(ledPads));
  const fallbackDelta = (ledPad - recPad) & 0xff;

  const frames = recFrameCount(rec);
  if (!frames) throw new Error("No REC frames found");
  const out = new Uint8Array(HEADER_SIZE + frames * FRAME_SIZE + TRAILER_SIZE);
  out.set(template.subarray(0, HEADER_SIZE), 0);
  out.set(template.subarray(template.length - TRAILER_SIZE), out.length - TRAILER_SIZE);
  out[0x0c] = (frames >> 8) & 0xff;
  out[0x0d] = frames & 0xff;

  let exact = 0;
  let interpolated = 0;
  let fallbackCount = 0;
  for (let f = 0; f < frames; f++) {
    const src = extractRecSlice(rec, f, slice);
    const base = HEADER_SIZE + f * FRAME_SIZE;
    for (let i = 0; i < FRAME_SIZE; i++) {
      const value = src[i];
      const list = samples[i];
      let result: number;
      const hit = list.find((s) => s.input === value);
      if (hit) {
        result = hit.output;
        exact++;
      } else {
        const sorted = [...list].sort((a, b) => a.input - b.input);
        let lo: { input: number; output: number } | undefined;
        let hi: { input: number; output: number } | undefined;
        for (const s of sorted) {
          if (s.input < value) lo = s;
          else if (s.input > value) { hi = s; break; }
        }
        if (lo && hi) {
          const t = (value - lo.input) / (hi.input - lo.input);
          result = Math.round(lo.output + (hi.output - lo.output) * t) & 0xff;
          interpolated++;
        } else {
          result = (value + fallbackDelta) & 0xff;
          fallbackCount++;
        }
      }
      out[base + i] = result;
    }
  }

  return { led: out, frames, exact, interpolated, fallback: fallbackCount, recPad, ledPad };
}

export default {
  REC_FRAME_SIZE,
  recFrameCount,
  extractRecSlice,
  extractLedFrame,
  makeCalibrationPairs,
  convertRecToLed,
};
