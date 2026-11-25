// Render worker scaffold: offscreen canvas painting to keep UI 60fps.
// Full frame rendering stays on the main thread because compositor depends on
// DOM media decoding; this worker is a hook for future off-main-thread sampling.
export type RenderWorkerRequest = { type: "ping" };
export type RenderWorkerResponse = { type: "pong" };

self.onmessage = (e: MessageEvent<RenderWorkerRequest>) => {
  if (e.data?.type === "ping") (self as any).postMessage({ type: "pong" } satisfies RenderWorkerResponse);
};