// Web Worker for non-blocking, lossless exports. Byte assembly happens here;
// frame rendering stays on the main thread because it needs a canvas.
import { buildFseqBytes } from "../engine/codecs/fseq";
import { buildAviUncompressedBytes } from "../engine/aviEncoder";

export type ExportWorkerRequest =
  | { type: "led"; project: unknown; map: unknown }
  | { type: "avi-raw"; frames: Uint8Array[]; width: number; height: number; fps: number; name?: string }
  | { type: "fseq"; frames: Uint8Array[]; channels: number; fps: number; name?: string };

export type ExportWorkerResponse =
  | { type: "progress"; done: number; total: number; phase: string }
  | { type: "done"; bytes: Uint8Array; name: string }
  | { type: "error"; message: string };

const post = (message: ExportWorkerResponse) => (self as unknown as Worker).postMessage(message);

self.onmessage = async (e: MessageEvent<ExportWorkerRequest>) => {
  const request = e.data;
  try {
    if (request.type === "led") {
      post({ type: "error", message: "Unverified .led profiles are not exported from the worker; use the main export pipeline." });
      return;
    }
    post({ type: "progress", done: 0, total: 1, phase: "pack" });
    let bytes: Uint8Array;
    let name: string;
    if (request.type === "avi-raw") {
      bytes = buildAviUncompressedBytes(request.frames, request.width, request.height, request.fps);
      name = request.name ?? "export_uncompressed.avi";
    } else {
      bytes = buildFseqBytes(request.frames, request.channels, request.fps);
      name = request.name ?? "export.fseq";
    }
    post({ type: "progress", done: 1, total: 1, phase: "done" });
    post({ type: "done", bytes, name });
  } catch (err) {
    post({ type: "error", message: err instanceof Error ? err.message : "Export failed" });
  }
};
