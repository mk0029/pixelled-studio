export interface SfxParseResult {
  srcWidth: number;
  srcHeight: number;
  frameCount: number;
  headerOffset: number;
  frames: Uint8ClampedArray;
  cropX: number;
  cropY: number;
  cropW: number;
  cropH: number;
}

const COMMON_DIMS: [number, number][] = [
  [16, 16], [20, 20], [24, 24], [30, 16], [30, 20], [30, 8],
  [32, 32], [40, 20], [50, 30], [24, 16], [16, 8],
  [64, 32], [64, 64], [100, 50], [100, 100],
];

function u16(b: Uint8Array, o: number): number {
  return b[o] | (b[o + 1] << 8);
}
function u32(b: Uint8Array, o: number): number {
  return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;
}

interface Candidate { w: number; h: number; headerOffset: number; frameCount: number; padded: boolean; score: number; }

function candidates(bytes: Uint8Array): Candidate[] {
  const out: Candidate[] = [];
  const headerOffsets = [0, 4, 6, 8, 12, 16, 20, 24, 32, 48, 64];
  for (const ho of headerOffsets) {
    if (ho >= bytes.length) continue;
    for (const [w, h] of COMMON_DIMS) {
      for (const padded of [false, true]) {
        const rowBytes = padded ? Math.ceil((w * 3) / 4) * 4 : w * 3;
        const frameSize = rowBytes * h;
        const remaining = bytes.length - ho;
        if (frameSize <= 0 || remaining <= 0) continue;
        if (remaining % frameSize !== 0) continue;
        const fc = remaining / frameSize;
        if (fc < 1 || fc > 100000) continue;
        // Prefer larger native dimensions (real format) and reasonable frame counts.
        const score = (w * h) - fc * 5 + (ho === 0 ? 0 : 0);
        out.push({ w, h, headerOffset: ho, frameCount: fc, padded, score });
      }
    }
  }
  const w0 = u16(bytes, 0), h0 = u16(bytes, 2);
  for (const c of out) {
    if (c.w === w0 && c.h === h0 && (c.headerOffset === 4 || c.headerOffset === 6 || c.headerOffset === 8)) {
      c.score += 1e9;
    }
  }
  return out;
}

export function parseSfx(buffer: ArrayBuffer): SfxParseResult {
  const bytes = new Uint8Array(buffer);
  const cands = candidates(bytes);
  if (!cands.length) throw new Error("Could not detect .sfx dimensions (file too short or unknown format)");
  cands.sort((a, b) => b.score - a.score);
  const c = cands[0];
  const { w, h, headerOffset, frameCount: fc, padded } = c;
  const rowBytes = padded ? Math.ceil((w * 3) / 4) * 4 : w * 3;
  const frameSize = rowBytes * h;

  const packed = new Uint8ClampedArray(w * fc * h * 4);

  for (let f = 0; f < fc; f++) {
    const base = headerOffset + f * frameSize;
    for (let y = 0; y < h; y++) {
      const srcRow = base + y * rowBytes;
      const dstRow = (y * (w * fc) + f * w) * 4;
      for (let x = 0; x < w; x++) {
        const s = srcRow + x * 3;
        const d = dstRow + x * 4;
        packed[d] = bytes[s];
        packed[d + 1] = bytes[s + 1];
        packed[d + 2] = bytes[s + 2];
        packed[d + 3] = 255;
      }
    }
  }

  // Detect permanent dead (near-black) border columns/rows across ALL frames.
  const THRESH = 12;
  const colDead = new Array(w).fill(true);
  const rowDead = new Array(h).fill(true);
  for (let f = 0; f < fc; f++) {
    const base = headerOffset + f * frameSize;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const s = base + y * rowBytes + x * 3;
        const isBlack = bytes[s] + bytes[s + 1] + bytes[s + 2] <= 15;
        if (!isBlack) { colDead[x] = false; rowDead[y] = false; }
      }
    }
  }
  let minX = 0, maxX = w - 1, minY = 0, maxY = h - 1;
  while (minX < w - 1 && colDead[minX]) minX++;
  while (maxX > minX && colDead[maxX]) maxX--;
  while (minY < h - 1 && rowDead[minY]) minY++;
  while (maxY > minY && rowDead[maxY]) maxY--;

  let cropX = 0, cropY = 0, cropW = w, cropH = h;
  if (maxX >= minX && maxY >= minY && (minX > 0 || maxX < w - 1 || minY > 0 || maxY < h - 1)) {
    cropX = minX; cropY = minY; cropW = maxX - minX + 1; cropH = maxY - minY + 1;
  }

  return {
    srcWidth: w,
    srcHeight: h,
    frameCount: fc,
    headerOffset,
    frames: packed,
    cropX, cropY, cropW, cropH,
  };
}
