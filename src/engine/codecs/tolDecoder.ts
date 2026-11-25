/**
 * LED Edit `.tol` reader. Evidence: 14-byte big-endian header followed by
 * `A × B × 3` raw RGB bytes per frame; channel bytes are 7-bit.
 *
 * `A` is rows and `B` is columns, so pixel `p` is `(y * B + x)`.
 * This order is assumed, not yet proven against a matching `.tol`/`.led` pair.
 */

export interface TolProgram {
  dimA: number;
  dimB: number;
  frames: Uint8ClampedArray[];
}

const HEADER_SIZE = 14;

/** Decode a `.tol` file into 8-bit RGB frames. */
export function decodeTol(data: Uint8Array): TolProgram {
  if (data.length < HEADER_SIZE) throw new Error("File is too short for .tol");
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const frameCount = view.getUint32(0, false);
  const dimA = view.getUint16(4, false);
  const dimB = view.getUint16(6, false);
  if (data[12] !== 3) throw new Error("Unsupported .tol bytes-per-pixel; expected 3");
  if (!dimA || !dimB) throw new Error("Invalid .tol dimensions");
  const frameSize = dimA * dimB * 3;
  if (data.length !== HEADER_SIZE + frameCount * frameSize) {
    throw new Error(`Bad .tol size: expected ${HEADER_SIZE + frameCount * frameSize} bytes, got ${data.length}`);
  }
  const frames: Uint8ClampedArray[] = [];
  for (let f = 0; f < frameCount; f++) {
    const start = HEADER_SIZE + f * frameSize;
    const rgb = new Uint8ClampedArray(frameSize);
    for (let i = 0; i < frameSize; i++) {
      const v = data[start + i];
      rgb[i] = (v << 1) | (v >> 6); // 7-bit → 8-bit, clamped by Uint8ClampedArray
    }
    frames.push(rgb);
  }
  return { dimA, dimB, frames };
}
