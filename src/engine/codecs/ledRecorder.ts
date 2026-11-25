/**
 * Offline ".led recorder": renders frames as fast as the CPU allows and writes
 * a normal LEDEdit 2014 program file. Either a probed per-LED byte map or a
 * legacy linear solid-colour calibration supplies the frame bytes.
 */
import { HEADER_SIZE, FRAME_SIZE, TRAILER_SIZE } from "./ledEdit2014Codec";
import { LED_BYTE_MAP, LED_MASK, LED_TEMPLATE_HEADER, RECOVERED_LED_COUNT } from "./ledByteMap";

export const LED_MODEL_STORAGE_KEY = "tohran.ledRecorderModel.v2";

export const CALIBRATION_COLORS: { name: string; rgb: [number, number, number] }[] = [
  { name: "Black", rgb: [0, 0, 0] },
  { name: "Red", rgb: [255, 0, 0] },
  { name: "Green", rgb: [0, 255, 0] },
  { name: "Blue", rgb: [0, 0, 255] },
  { name: "White", rgb: [255, 255, 255] },
  { name: "Yellow", rgb: [255, 255, 0] },
  { name: "Cyan", rgb: [0, 255, 255] },
  { name: "Magenta", rgb: [255, 0, 255] },
];

export interface LedRecordModel {
  /** LED byte with the source pixel black, in decoded (unmasked) space. */
  base: Uint8Array;
  /** Signed decoded-byte change when the source R/G/B channel is 255. */
  dr: Int16Array;
  dg: Int16Array;
  db: Int16Array;
  /** Per-file mask of the template export; applied when writing frames. */
  mask: number;
  header: Uint8Array;
  trailer: Uint8Array;
  colors: [number, number, number][];
  /** Explicit [R,G,B] byte offsets per LED, when a byte map is available. */
  positions?: ReadonlyArray<readonly [number, number, number]>;
}

export interface LedCalibrationEntry {
  rgb: [number, number, number];
  led: Uint8Array;
}

const sameRgb = (a: [number, number, number], b: [number, number, number]) =>
  a[0] === b[0] && a[1] === b[1] && a[2] === b[2];

/** A frame's mask is the constant byte in its trailing inactive sector. */
function detectMask(frame: Uint8Array): number {
  const votes = new Uint32Array(256);
  for (let i = FRAME_SIZE - 1024; i < FRAME_SIZE; i++) votes[frame[i] ?? 0]++;
  let best = 0;
  for (let i = 1; i < 256; i++) if (votes[i] > votes[best]) best = i;
  return best;
}

/** Build the linear byte model from solid-colour LedEdit exports. */
export function buildLedRecordModel(entries: LedCalibrationEntry[]): LedRecordModel {
  if (!entries.length) throw new Error("No LED calibrations supplied");
  for (const e of entries) {
    if (e.led.length < HEADER_SIZE + FRAME_SIZE + TRAILER_SIZE) {
      throw new Error(`${e.rgb.join(",")}: not a complete .led file`);
    }
  }
  const black = entries.find((e) => sameRgb(e.rgb, [0, 0, 0])) ?? entries[0];
  // Every LedEdit export carries its own mask, so compare in decoded space.
  const maskOf = (e: LedCalibrationEntry): number => {
    const f = e.led.subarray(HEADER_SIZE, HEADER_SIZE + FRAME_SIZE);
    return detectMask(f);
  };
  const decodedFrame = (e: LedCalibrationEntry): Uint8Array => {
    const f = e.led.subarray(HEADER_SIZE, HEADER_SIZE + FRAME_SIZE);
    const mask = maskOf(e);
    const out = new Uint8Array(FRAME_SIZE);
    for (let i = 0; i < FRAME_SIZE; i++) out[i] = (f[i] - mask) & 0xff;
    return out;
  };
  const base = decodedFrame(black);
  const dr = new Int16Array(FRAME_SIZE);
  const dg = new Int16Array(FRAME_SIZE);
  const db = new Int16Array(FRAME_SIZE);
  const delta = (rgb: [number, number, number], out: Int16Array) => {
    const entry = entries.find((e) => sameRgb(e.rgb, rgb));
    if (!entry) return;
    const f = decodedFrame(entry);
    for (let i = 0; i < FRAME_SIZE; i++) out[i] = f[i] - base[i];
  };
  delta([255, 0, 0], dr);
  delta([0, 255, 0], dg);
  delta([0, 0, 255], db);

  return {
    base,
    dr,
    dg,
    db,
    mask: maskOf(black),
    header: Uint8Array.from(black.led.subarray(0, HEADER_SIZE)),
    trailer: Uint8Array.from(black.led.subarray(black.led.length - TRAILER_SIZE)),
    colors: entries.map((e) => e.rgb),
  };
}

/**
 * Model built from the recovered single-LED byte map. It writes straight to the
 * probed byte offsets; colour transfer is identity (0..255) and is approximate
 * until a mixed-colour sweep pins the transfer curve.
 */
export function createRecoveredByteMapModel(): LedRecordModel {
  const binary = atob(LED_TEMPLATE_HEADER);
  const header = new Uint8Array(HEADER_SIZE);
  for (let i = 0; i < HEADER_SIZE; i++) header[i] = binary.charCodeAt(i) & 0xff;
  return {
    base: new Uint8Array(FRAME_SIZE),
    dr: new Int16Array(FRAME_SIZE),
    dg: new Int16Array(FRAME_SIZE),
    db: new Int16Array(FRAME_SIZE),
    mask: LED_MASK,
    header,
    trailer: new Uint8Array(TRAILER_SIZE),
    colors: [],
    positions: LED_BYTE_MAP,
  };
}

export { RECOVERED_LED_COUNT };

/** Turn one rendered RGB frame into the stored bytes of one LED frame. */
export function ledFrameFromRgb(rgb: Uint8ClampedArray, model: LedRecordModel, pixelCount: number): Uint8Array {
  const frame = Uint8Array.from(model.base);
  const pixels = Math.min(pixelCount, Math.floor(FRAME_SIZE / 3));
  if (model.positions) {
    // Direct byte-map path: every LED writes its three channel bytes in place.
    // frame.fill(mask) already sets every byte to "off", so skip all-zero LEDs.
    // Otherwise duplicate LEDs (74 of 600 reuse earlier positions) would write
    // mask back over a previously written position.
    frame.fill(model.mask);
    for (let p = 0; p < pixels; p++) {
      const pos = model.positions[p];
      if (!pos) continue;
      const r = rgb[p * 3] ?? 0;
      const g = rgb[p * 3 + 1] ?? 0;
      const b = rgb[p * 3 + 2] ?? 0;
      if (r === 0 && g === 0 && b === 0) continue;
      frame[pos[0]] = (r + model.mask) & 0xff;
      frame[pos[1]] = (g + model.mask) & 0xff;
      frame[pos[2]] = (b + model.mask) & 0xff;
    }
    return frame;
  }
  for (let p = 0; p < pixels; p++) {
    const r = rgb[p * 3] ?? 0;
    const g = rgb[p * 3 + 1] ?? 0;
    const b = rgb[p * 3 + 2] ?? 0;
    for (let c = 0; c < 3; c++) {
      const i = p * 3 + c;
      const value = model.base[i] + (model.dr[i] * r + model.dg[i] * g + model.db[i] * b) / 255;
      const clamped = value < 0 ? 0 : value > 255 ? 255 : Math.round(value);
      frame[i] = (clamped + model.mask) & 0xff;
    }
  }
  return frame;
}

/** Wrap LED frames in the container, using the calibration file's header/trailer. */
export function buildLedProgram(frames: Uint8Array[], model: LedRecordModel): Uint8Array {
  const total = Math.min(0xffff, frames.length);
  const out = new Uint8Array(HEADER_SIZE + total * FRAME_SIZE + TRAILER_SIZE);
  out.set(model.header, 0);
  out.set(model.trailer, out.length - TRAILER_SIZE);
  out[0x0c] = (total >> 8) & 0xff;
  out[0x0d] = total & 0xff;
  for (let f = 0; f < total; f++) out.set(frames[f], HEADER_SIZE + f * FRAME_SIZE);
  return out;
}

/** Compact binary model persisted in localStorage (about 56 KB base64). */
export function serializeLedRecordModel(model: LedRecordModel): string {
  const colorsBytes = model.colors.length * 3;
  const total = 3 + colorsBytes + FRAME_SIZE * 2 + FRAME_SIZE * 2 * 3 + HEADER_SIZE + TRAILER_SIZE;
  const bytes = new Uint8Array(total);
  let off = 0;
  bytes[off++] = model.colors.length >> 8;
  bytes[off++] = model.colors.length & 0xff;
  for (const c of model.colors) { bytes[off++] = c[0]; bytes[off++] = c[1]; bytes[off++] = c[2]; }
  bytes[off++] = model.mask;
  bytes.set(model.base, off); off += FRAME_SIZE;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (const arr of [model.dr, model.dg, model.db]) {
    for (let i = 0; i < FRAME_SIZE; i++, off += 2) view.setInt16(off, arr[i], true);
  }
  bytes.set(model.header, off); off += HEADER_SIZE;
  bytes.set(model.trailer, off);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

export function deserializeLedRecordModel(text: string): LedRecordModel {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  let off = 0;
  const count = (bytes[off++] << 8) | bytes[off++];
  const colors: [number, number, number][] = [];
  for (let i = 0; i < count; i++) colors.push([bytes[off++], bytes[off++], bytes[off++]]);
  const mask = bytes[off++];
  const base = Uint8Array.from(bytes.subarray(off, off + FRAME_SIZE)); off += FRAME_SIZE;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const readInt16 = () => { const v = view.getInt16(off, true); off += 2; return v; };
  const dr = new Int16Array(FRAME_SIZE), dg = new Int16Array(FRAME_SIZE), db = new Int16Array(FRAME_SIZE);
  for (let i = 0; i < FRAME_SIZE; i++) dr[i] = readInt16();
  for (let i = 0; i < FRAME_SIZE; i++) dg[i] = readInt16();
  for (let i = 0; i < FRAME_SIZE; i++) db[i] = readInt16();
  const header = Uint8Array.from(bytes.subarray(off, off + HEADER_SIZE)); off += HEADER_SIZE;
  const trailer = Uint8Array.from(bytes.subarray(off, off + TRAILER_SIZE));
  return { base, dr, dg, db, mask, header, trailer, colors };
}

export function loadLedRecordModel(): LedRecordModel | null {
  if (typeof window === "undefined") return null;
  const text = window.localStorage.getItem(LED_MODEL_STORAGE_KEY);
  if (!text) return null;
  try { return deserializeLedRecordModel(text); } catch { return null; }
}

export function saveLedRecordModel(model: LedRecordModel): void {
  window.localStorage.setItem(LED_MODEL_STORAGE_KEY, serializeLedRecordModel(model));
}

export function clearLedRecordModel(): void {
  if (typeof window !== "undefined") window.localStorage.removeItem(LED_MODEL_STORAGE_KEY);
}
