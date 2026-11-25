/**
 * LEDEdit 2014 `rzbv001` SD-card program codec.
 *
 * Clean-room implementation derived from byte-level analysis of real exports;
 * see docs/LEDEDIT_2014_FORMAT.md. Dependency-free so it can also be run by
 * Node's native TypeScript stripper for verification.
 *
 * The container (header / frame count / frame size / trailer) is byte-exact.
 * The per-file mask arithmetic and the interleaved 8-bit RGB pixel layout were
 * confirmed against a known-content rainbow export (114 frames, mask 0xB5).
 * The physical port/LED wiring order is still unconfirmed.
 */

export const LED_MAGIC = [0x72, 0x7a, 0x62, 0x76, 0x30, 0x30, 0x31, 0x01] as const;
export const HEADER_SIZE = 512;
export const FRAME_SIZE = 3072;
/** Sectors 4-5 of every frame are constant = the per-file mask byte. */
export const PAD_BYTES = 1024;
/** Sectors 0-3 of every frame carry the show data. */
export const DATA_BYTES = FRAME_SIZE - PAD_BYTES; // 2048
export const TRAILER_SIZE = 20480; // 40 x 512-byte sectors
/** Frame data is interleaved 8-bit RGB: three consecutive bytes per pixel. */
export const RGB_BYTES_PER_PIXEL = 3;
export const MAX_RGB_PIXELS = Math.floor(DATA_BYTES / RGB_BYTES_PER_PIXEL); // 682

/**
 * How the per-file mask byte is applied.
 * "sub": decoded = raw - mask (mod 256); "xor": decoded = raw ^ mask.
 * See docs/LEDEDIT_2014_FORMAT.md §3 for the evidence; "sub" is the default.
 */
export type MaskMath = "sub" | "xor";
export type BitOrder = "lsb" | "msb";

export interface LedEdit2014Header {
  /** Verbatim 512-byte header, preserved for byte-exact re-encoding. */
  raw: Uint8Array;
  magic: string;
  /** Big-endian u16 at 0x08: 0x6000 observed for 8-port exports; meaning unresolved. */
  capacityCode: number;
  /** Big-endian u16 at 0x0C. */
  frameCount: number;
  physicalFrameCount: number;
}

export interface LedEdit2014DecodeOptions {
  /** Override the per-export mask instead of detecting it. */
  mask?: number;
  /** Mask arithmetic. Default "sub". */
  maskMath?: MaskMath;
  /** Reject inconsistent counts / non-zero frame tails. Default true. */
  strict?: boolean;
  /** Also unpack each frame's 2,048 data bytes into 16,384 bits. */
  unpackBits?: boolean;
  /** Bit position of the first bit inside a data byte. Default "lsb". */
  bitOrder?: BitOrder;
}

export interface LedEdit2014DecodeResult {
  fileSize: number;
  header: LedEdit2014Header;
  mask: number;
  maskMath: MaskMath;
  /** As stored in the file (still masked). */
  rawFrames: Uint8Array[];
  /** Decoded 3,072-byte frames (last 1,024 bytes are always zero). */
  frames: Uint8Array[];
  /** Per frame: DATA_BYTES * 8 bits, index = dataByte * 8 + bit. */
  bits?: Uint8Array[];
}

export interface LedEdit2014EncodeInput {
  header: Uint8Array | LedEdit2014Header;
  /** Decoded frames of exactly 3,072 bytes. */
  frames: Uint8Array[];
  mask: number;
  /** Mask arithmetic. Default "sub". */
  maskMath?: MaskMath;
  /** Overrides the count written at 0x0C; defaults to frames.length. */
  frameCount?: number;
}

export interface LedEdit2014RgbEncodeInput {
  header: Uint8Array | LedEdit2014Header;
  /** Interleaved RGB frames: exactly pixelCount * 3 bytes each. */
  frames: Uint8Array[];
  mask: number;
  /** Number of pixels per frame. Default MAX_RGB_PIXELS (682). */
  pixelCount?: number;
  /** Mask arithmetic. Default "sub". */
  maskMath?: MaskMath;
  /** Overrides the count written at 0x0C; defaults to frames.length. */
  frameCount?: number;
}

export interface LedEdit2014Verification {
  ok: boolean;
  fileSize: number;
  headerBytes: number;
  declaredFrames: number;
  physicalFrames: number;
  mask: number;
  maskMath: MaskMath;
  maskConsistent: boolean;
  tailsAllZero: boolean;
  reencodedSize: number;
  reencodedIdentical: boolean;
  error?: string;
}

function asBytes(input: Uint8Array | ArrayBuffer): Uint8Array {
  if (input instanceof Uint8Array) return input;
  return new Uint8Array(input);
}

function hasMagic(b: Uint8Array): boolean {
  return LED_MAGIC.every((v, i) => b[i] === v);
}

function applyMask(raw: number, mask: number, math: MaskMath): number {
  return math === "xor" ? raw ^ mask : (raw - mask) & 0xff;
}

function applyInverse(decoded: number, mask: number, math: MaskMath): number {
  return math === "xor" ? decoded ^ mask : (decoded + mask) & 0xff;
}

function detectMask(rawFrames: Uint8Array[], override?: number): number {
  if (override !== undefined) return override & 0xff;
  const votes = new Uint32Array(256);
  for (const frame of rawFrames) {
    for (let i = DATA_BYTES; i < FRAME_SIZE; i++) votes[frame[i] ?? 0]++;
  }
  let best = 0;
  for (let i = 1; i < 256; i++) if (votes[i] > votes[best]) best = i;
  return best;
}

/** Parse a 512-byte LEDEdit header. Does not validate magic. */
export function parseLedEdit2014Header(input: Uint8Array | ArrayBuffer): LedEdit2014Header {
  const bytes = asBytes(input);
  if (bytes.length < HEADER_SIZE) {
    throw new Error("Not a LEDEdit 2014 file: header is shorter than 512 bytes");
  }
  const declared = (bytes[0x0c] << 8) | bytes[0x0d];
  return {
    raw: bytes.slice(0, HEADER_SIZE),
    magic: String.fromCharCode(...bytes.subarray(0, 7)),
    capacityCode: (bytes[0x08] << 8) | bytes[0x09],
    frameCount: declared,
    physicalFrameCount: (bytes.length - HEADER_SIZE - TRAILER_SIZE) / FRAME_SIZE,
  };
}

/**
 * Decode an `rzbv001` file. Frames are byte-exact through the mask; the optional
 * bit view is a raw 16,384-bit unpack with no port/channel interpretation.
 */
export function decodeLedEdit2014(
  input: Uint8Array | ArrayBuffer,
  options: LedEdit2014DecodeOptions = {},
): LedEdit2014DecodeResult {
  const bytes = asBytes(input);
  if (!hasMagic(bytes)) throw new Error("Not an rzbv001 LEDEdit file");
  const header = parseLedEdit2014Header(bytes);
  const strict = options.strict !== false;
  const math = options.maskMath ?? "sub";
  const n = header.physicalFrameCount;

  if (!Number.isInteger(n) || n < 0) throw new Error("File size is not a whole number of frames");
  if (strict && n !== header.frameCount) {
    if (header.frameCount * 2 === n) {
      throw new Error("Double-width (0xC000) frame layout is not supported by this codec");
    }
    throw new Error(`Frame count mismatch: header ${header.frameCount}, physical ${n}`);
  }

  const rawFrames: Uint8Array[] = [];
  for (let i = 0; i < n; i++) {
    rawFrames.push(bytes.slice(HEADER_SIZE + i * FRAME_SIZE, HEADER_SIZE + (i + 1) * FRAME_SIZE));
  }
  const mask = detectMask(rawFrames, options.mask);
  const frames = rawFrames.map((f) => {
    const out = new Uint8Array(FRAME_SIZE);
    for (let i = 0; i < FRAME_SIZE; i++) out[i] = applyMask(f[i], mask, math);
    return out;
  });

  if (strict) {
    for (const f of frames) {
      for (let i = DATA_BYTES; i < FRAME_SIZE; i++) {
        if (f[i] !== 0) throw new Error("Inconsistent mask: frame tail is not zero");
      }
    }
  }

  const result: LedEdit2014DecodeResult = {
    fileSize: bytes.length,
    header,
    mask,
    maskMath: math,
    rawFrames,
    frames,
  };
  if (options.unpackBits) {
    result.bits = frames.map((f) => unpackFrameBits(f, options.bitOrder ?? "lsb"));
  }
  return result;
}

/** Re-encode decoded frames into a byte-identical `rzbv001` file. */
export function encodeLedEdit2014(input: LedEdit2014EncodeInput): Uint8Array {
  const headerRaw = input.header instanceof Uint8Array ? input.header.slice(0, HEADER_SIZE) : input.header.raw.slice();
  if (headerRaw.length !== HEADER_SIZE) throw new Error("Header must be 512 bytes");
  const math = input.maskMath ?? "sub";

  const frames = input.frames;
  const out = new Uint8Array(HEADER_SIZE + frames.length * FRAME_SIZE + TRAILER_SIZE);
  out.set(headerRaw, 0);
  const count = input.frameCount ?? frames.length;
  out[0x0c] = (count >> 8) & 0xff;
  out[0x0d] = count & 0xff;

  frames.forEach((frame, f) => {
    if (frame.length !== FRAME_SIZE) throw new Error(`Frame ${f} must be ${FRAME_SIZE} bytes`);
    const base = HEADER_SIZE + f * FRAME_SIZE;
    for (let i = 0; i < FRAME_SIZE; i++) out[base + i] = applyInverse(frame[i], input.mask, math);
  });
  return out;
}

/** Interleaved RGB view of a decoded frame (three consecutive bytes per pixel). */
export function decodeFrameRgb(frame: Uint8Array, pixelCount = MAX_RGB_PIXELS): Uint8Array {
  const out = new Uint8Array(pixelCount * RGB_BYTES_PER_PIXEL);
  for (let i = 0; i < out.length; i++) out[i] = frame[i] ?? 0;
  return out;
}

/** Build a decoded frame from interleaved RGB pixels; unused bytes stay zero. */
export function encodeFrameRgb(pixels: Uint8Array): Uint8Array {
  if (pixels.length > DATA_BYTES) {
    throw new Error(`RGB pixels exceed ${DATA_BYTES} data bytes`);
  }
  const frame = new Uint8Array(FRAME_SIZE);
  frame.set(pixels, 0);
  return frame;
}

/**
 * Encode interleaved RGB frames into a complete `rzbv001` file.
 * Clone `header` and `mask` from an empty export made with the same controller;
 * those values cannot yet be derived from scratch.
 */
export function encodeLedEdit2014FromPixels(input: LedEdit2014RgbEncodeInput): Uint8Array {
  const expected = (input.pixelCount ?? MAX_RGB_PIXELS) * RGB_BYTES_PER_PIXEL;
  const frames = input.frames.map((pixels, i) => {
    if (pixels.length !== expected) {
      throw new Error(`Frame ${i} must be ${expected} RGB bytes`);
    }
    return encodeFrameRgb(pixels);
  });
  return encodeLedEdit2014({
    header: input.header,
    frames,
    mask: input.mask,
    maskMath: input.maskMath,
    frameCount: input.frameCount,
  });
}

/** Raw bit view of the 2,048 data bytes: index = dataByte * 8 + bit. */
export function unpackFrameBits(frame: Uint8Array, bitOrder: BitOrder = "lsb"): Uint8Array {
  const out = new Uint8Array(DATA_BYTES * 8);
  for (let b = 0; b < DATA_BYTES; b++) {
    const value = frame[b] ?? 0;
    for (let j = 0; j < 8; j++) {
      const shift = bitOrder === "lsb" ? j : 7 - j;
      out[b * 8 + j] = (value >> shift) & 1;
    }
  }
  return out;
}

/** Inverse of unpackFrameBits. */
export function packFrameBits(bits: Uint8Array, bitOrder: BitOrder = "lsb"): Uint8Array {
  const out = new Uint8Array(DATA_BYTES);
  for (let b = 0; b < DATA_BYTES; b++) {
    let value = 0;
    for (let j = 0; j < 8; j++) {
      const bit = bits[b * 8 + j] ?? 0;
      value |= (bit & 1) << (bitOrder === "lsb" ? j : 7 - j);
    }
    out[b] = value;
  }
  return out;
}

/** Full file check: decode, validate, re-encode and compare byte for byte. */
export function verifyLedEdit2014RoundTrip(
  input: Uint8Array | ArrayBuffer,
  maskMath: MaskMath = "sub",
): LedEdit2014Verification {
  try {
    const bytes = asBytes(input);
    const decoded = decodeLedEdit2014(bytes, { maskMath });
    const reencoded = encodeLedEdit2014(decoded);
    let identical = reencoded.length === bytes.length;
    if (identical) {
      for (let i = 0; i < bytes.length; i++) {
        if (bytes[i] !== reencoded[i]) {
          identical = false;
          break;
        }
      }
    }
    return {
      ok: identical,
      fileSize: bytes.length,
      headerBytes: HEADER_SIZE,
      declaredFrames: decoded.header.frameCount,
      physicalFrames: decoded.header.physicalFrameCount,
      mask: decoded.mask,
      maskMath: decoded.maskMath,
      maskConsistent: true,
      tailsAllZero: true,
      reencodedSize: reencoded.length,
      reencodedIdentical: identical,
    };
  } catch (err) {
    return {
      ok: false,
      fileSize: 0,
      headerBytes: HEADER_SIZE,
      declaredFrames: 0,
      physicalFrames: 0,
      mask: 0,
      maskMath,
      maskConsistent: false,
      tailsAllZero: false,
      reencodedSize: 0,
      reencodedIdentical: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export default {
  decodeLedEdit2014,
  encodeLedEdit2014,
  encodeLedEdit2014FromPixels,
  decodeFrameRgb,
  encodeFrameRgb,
  parseLedEdit2014Header,
  unpackFrameBits,
  packFrameBits,
  verifyLedEdit2014RoundTrip,
};
