import { packFrames, type ImportedMedia } from "@/engine/mediaImport";

const MAX_FRAMES = 360;
const tag = (view: DataView, at: number) =>
  String.fromCharCode(view.getUint8(at), view.getUint8(at + 1), view.getUint8(at + 2), view.getUint8(at + 3));

/**
 * Reads the uncompressed BI_RGB AVIs this studio exports and repacks them into
 * a sprite-sheet data URL so the existing matrix renderer can play them.
 */
export async function importAviUrl(
  url: string,
  cols: number,
  rows: number,
  onStatus?: (message: string) => void,
): Promise<ImportedMedia> {
  onStatus?.("Downloading AVI…");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`AVI download failed: ${res.status}`);
  const view = new DataView(await res.arrayBuffer());
  if (tag(view, 0) !== "RIFF" || tag(view, 8) !== "AVI ") throw new Error("Not an AVI file");

  let fps = 20;
  let width = cols;
  let height = rows;
  let compression = 0;
  let bpp = 24;
  const chunks: { at: number; size: number }[] = [];

  const parseHdrl = (start: number, end: number) => {
    let p = start;
    while (p + 8 <= end) {
      const id = tag(view, p);
      const size = view.getUint32(p + 4, true);
      const body = p + 8;
      if (id === "avih" && size >= 4) fps = Math.max(1, Math.round(1e6 / view.getUint32(body, true)));
      if (id === "LIST" && tag(view, body) === "strl") {
        let q = body + 4;
        const listEnd = body + size;
        while (q + 8 <= listEnd) {
          const sub = tag(view, q);
          const subSize = view.getUint32(q + 4, true);
          const data = q + 8;
          if (sub === "strf" && subSize >= 20) {
            width = view.getUint32(data + 4, true);
            height = view.getUint32(data + 8, true);
            bpp = view.getUint16(data + 14, true);
            compression = view.getUint32(data + 16, true);
          }
          q = data + subSize + (subSize & 1);
        }
      }
      p = body + size + (size & 1);
    }
  };

  const parseMovi = (start: number, end: number) => {
    let p = start;
    while (p + 8 <= end && chunks.length < MAX_FRAMES) {
      const id = tag(view, p);
      const size = view.getUint32(p + 4, true);
      if (id === "00db" || id === "00dc") chunks.push({ at: p + 8, size });
      p += 8 + size + (size & 1);
    }
  };

  let p = 12;
  while (p + 8 <= view.byteLength) {
    const id = tag(view, p);
    const size = view.getUint32(p + 4, true);
    const body = p + 8;
    if (id === "LIST") {
      const type = tag(view, body);
      if (type === "hdrl") parseHdrl(body + 4, body + size);
      else if (type === "movi") parseMovi(body + 4, body + size);
    }
    p = body + size + (size & 1);
  }

  if (compression !== 0 || bpp !== 24 || !chunks.length) {
    throw new Error("Only uncompressed 24-bit LEDEdit AVIs can be loaded into the studio");
  }
  const stride = (width * 3 + 3) & ~3;
  const expected = stride * height;
  const frames: ImageData[] = [];
  for (const chunk of chunks) {
    if (chunk.size < expected) continue;
    const rgba = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      const src = chunk.at + (height - 1 - y) * stride;
      const dst = y * width * 4;
      for (let x = 0; x < width; x++) {
        rgba[dst + x * 4] = view.getUint8(src + x * 3 + 2);     // R
        rgba[dst + x * 4 + 1] = view.getUint8(src + x * 3 + 1); // G
        rgba[dst + x * 4 + 2] = view.getUint8(src + x * 3);     // B
        rgba[dst + x * 4 + 3] = 255;
      }
    }
    frames.push(new ImageData(rgba, width, height));
    if (frames.length % 40 === 0) onStatus?.(`Decoding AVI ${frames.length}/${chunks.length}…`);
  }
  if (!frames.length) throw new Error("No readable frames in this AVI");
  return {
    src: packFrames(frames, width, height),
    frames: frames.length,
    fps,
    type: "avi",
    srcW: width,
    srcH: height,
  };
}
