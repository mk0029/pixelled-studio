// Web Worker for non-blocking .led imports.
export type ImportWorkerRequest = {
  type: "led";
  buffer: ArrayBuffer;
  options?: Record<string, unknown>;
};

export type ImportWorkerResponse =
  | { type: "progress"; done: number; total: number; phase: string }
  | { type: "done"; frames: Uint8Array[]; stats: Record<string, unknown> }
  | { type: "error"; message: string };

self.onmessage = async (e: MessageEvent<ImportWorkerRequest>) => {
  const { type, buffer, options } = e.data;
  try {
    if (type !== "led") return;
    (self as any).postMessage({ type: "progress", done: 0, total: 1, phase: "decode" } satisfies ImportWorkerResponse);
    const { decodeLedBuffer } = await import("../engine/codecs/ledDecoder");
    const result = decodeLedBuffer(buffer, options as any);
    if (!result.ok) throw new Error(result.error || "Decode failed");
    (self as any).postMessage({ type: "progress", done: 1, total: 1, phase: "done" } satisfies ImportWorkerResponse);
    (self as any).postMessage({ type: "done", frames: result.frames ?? [], stats: (result.stats ?? {}) as Record<string, unknown> } satisfies ImportWorkerResponse);
  } catch (err) {
    (self as any).postMessage({ type: "error", message: err instanceof Error ? err.message : "Import failed" } satisfies ImportWorkerResponse);
  }
};