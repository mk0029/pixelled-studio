/** Minimal FSEQ v2 uncompressed writer (PSEQ, little-endian, no compression). */

export function buildFseqBytes(frames: Uint8Array[], channels: number, fps: number): Uint8Array<ArrayBuffer> {
  if (!frames.length) throw new Error("No frames to write");
  if (!Number.isInteger(channels) || channels < 1) throw new Error("Invalid channel count");
  const stepMs = Math.max(1, Math.min(255, Math.round(1000 / Math.max(1, fps))));
  const expected = frames[0].length;
  if (frames.some((f) => f.length !== expected)) throw new Error("All FSEQ frames must have the same length");
  if (expected !== channels) throw new Error(`Expected ${channels} channels per frame, got ${expected}`);

  const out = new Uint8Array(32 + frames.length * channels);
  const view = new DataView(out.buffer);
  out.set([0x50, 0x53, 0x45, 0x51], 0); // PSEQ
  view.setUint16(4, 32, true); // channel data offset
  out[6] = 0; out[7] = 2; // v2.0
  view.setUint16(8, 32, true); // header size
  view.setUint32(10, channels, true);
  view.setUint32(14, frames.length, true);
  out[18] = stepMs;
  // 19-23: flags, compression and sparse ranges all zero.
  view.setBigUint64(24, BigInt(Date.now()) * 1000n, true);
  frames.forEach((frame, i) => out.set(frame, 32 + i * channels));
  return out;
}
