/**
 * Zero-dependency uncompressed AVI (BI_RGB / DIB ) writer for LEDEdit.
 * Frames are stored bottom-up in BGR24 with DWORD-aligned rows and an idx1 index.
 */

const writeFourcc = (bytes: Uint8Array, pos: number, text: string) => {
  for (let i = 0; i < 4; i++) bytes[pos + i] = text.charCodeAt(i);
  return pos + 4;
};

/** Shared muxer for callers that already have bottom-up BGR24 frames. */
export function buildAviFromBgrFrames(
  frames: Uint8Array[],
  width: number,
  height: number,
  fps: number,
): Blob {
  if (!frames.length) throw new Error("No frames to write");
  const W = Math.max(1, Math.round(width));
  const H = Math.max(1, Math.round(height));
  const rate = Math.max(1, Math.round(fps));
  const stride = (W * 3 + 3) & ~3;
  const frameSize = stride * H;
  if (frames.some((f) => f.length !== frameSize)) {
    throw new Error(`All AVI frames must be ${frameSize} bytes`);
  }

  const total = frames.length;
  const moviData = 4 + total * (8 + frameSize + (frameSize & 1));
  const strlSize = 4 + (8 + 56) + (8 + 40);
  const hdrlSize = 4 + (8 + 56) + (8 + strlSize);
  const idxSize = total * 16;
  const riffSize = 4 + (8 + hdrlSize) + (8 + moviData) + (8 + idxSize);
  const bytes = new Uint8Array(new ArrayBuffer(8 + riffSize));
  const view = new DataView(bytes.buffer);
  let pos = 0;

  const fourcc = (s: string) => { pos = writeFourcc(bytes, pos, s); };
  const u32 = (v: number) => { view.setUint32(pos, v >>> 0, true); pos += 4; };
  const u16 = (v: number) => { view.setUint16(pos, v & 0xffff, true); pos += 2; };

  fourcc("RIFF"); u32(riffSize); fourcc("AVI ");

  fourcc("LIST"); u32(hdrlSize); fourcc("hdrl");
  fourcc("avih"); u32(56);
  u32(Math.round(1e6 / rate));   // microseconds per frame
  u32(W * H * 3 * rate);         // max bytes per second
  u32(0);                        // padding
  u32(0x10);                     // AVIF_HASINDEX
  u32(total);                    // total frames
  u32(0);                        // initial frames
  u32(1);                        // streams
  u32(frameSize);                // suggested buffer size
  u32(W); u32(H);
  u32(0); u32(0); u32(0); u32(0); // reserved

  fourcc("LIST"); u32(strlSize); fourcc("strl");
  fourcc("strh"); u32(56);
  fourcc("vids"); fourcc("DIB ");
  u32(0); u16(0); u16(0);        // flags, priority, language
  u32(0);                        // initial frames
  u32(1); u32(rate);             // scale / rate = fps
  u32(0); u32(total);
  u32(frameSize);
  u32(0xffffffff);               // quality
  u32(0);                        // sample size
  u16(0); u16(0); u16(W); u16(H);

  fourcc("strf"); u32(40);
  u32(40); u32(W); u32(H);
  u16(1); u16(24);               // BI_RGB, 24-bit
  u32(0);                        // BI_RGB
  u32(frameSize);
  u32(0); u32(0);                // pixels per metre
  u32(0); u32(0);                // colours used / important

  fourcc("LIST"); u32(moviData); fourcc("movi");
  const moviBase = pos - 4;
  const offsets: number[] = [];
  for (const frame of frames) {
    offsets.push(pos - moviBase);
    fourcc("00db"); u32(frame.length);
    bytes.set(frame, pos);
    pos += frame.length;
    if (frame.length & 1) bytes[pos++] = 0;
  }

  fourcc("idx1"); u32(idxSize);
  for (let i = 0; i < total; i++) {
    fourcc("00db"); u32(0x10); u32(offsets[i]); u32(frames[i].length);
  }

  return new Blob([bytes], { type: "video/x-msvideo" });
}

/** Convert at-matrix RGBA canvas frames into a LEDEdit-ready AVI Blob. */
export function exportFramesToAvi(
  frames: ImageData[],
  width: number,
  height: number,
  fps: number = 20,
): Blob {
  if (!frames.length) throw new Error("No frames to write");
  const W = Math.max(1, Math.round(width));
  const H = Math.max(1, Math.round(height));
  const stride = (W * 3 + 3) & ~3;
  const bgrFrames = frames.map((frame) => {
    if (frame.width !== W || frame.height !== H) {
      throw new Error(`Every frame must be ${W}×${H}`);
    }
    const out = new Uint8Array(new ArrayBuffer(stride * H));
    for (let y = 0; y < H; y++) {
      const src = (H - 1 - y) * W * 4;
      const dst = y * stride;
      for (let x = 0; x < W; x++) {
        const q = src + x * 4;
        out[dst + x * 3] = frame.data[q + 2];     // B
        out[dst + x * 3 + 1] = frame.data[q + 1]; // G
        out[dst + x * 3 + 2] = frame.data[q];     // R
      }
    }
    return out;
  });
  return buildAviFromBgrFrames(bgrFrames, W, H, fps);
}
