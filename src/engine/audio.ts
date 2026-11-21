/**
 * Live microphone level for audio-reactive layers.
 * Preview only: exporters render with a fixed neutral level so a saved show is deterministic.
 */
export const audioStore = { level: 0.5, enabled: false, error: "" };

let ctx: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let stream: MediaStream | null = null;
let raf = 0;

export function stopAudio(): void {
  cancelAnimationFrame(raf);
  raf = 0;
  stream?.getTracks().forEach((t) => t.stop());
  ctx?.close().catch(() => {});
  ctx = null;
  analyser = null;
  stream = null;
  audioStore.enabled = false;
  audioStore.level = 0.5;
  audioStore.error = "";
}

export async function startAudio(): Promise<void> {
  if (audioStore.enabled) return;
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    audioStore.error = "Microphone is not available";
    return;
  }
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    ctx = new AudioContext();
    await ctx.resume().catch(() => {});
    analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const bins = new Uint8Array(analyser.frequencyBinCount);
    audioStore.enabled = true;
    audioStore.error = "";
    const tick = () => {
      if (!analyser) return;
      analyser.getByteFrequencyData(bins);
      let sum = 0;
      for (let i = 0; i < bins.length; i++) sum += bins[i];
      const raw = Math.min(1, (sum / bins.length / 255) * 3.2);
      audioStore.level = audioStore.level * 0.78 + raw * 0.22;
      raf = requestAnimationFrame(tick);
    };
    tick();
  } catch {
    stopAudio();
    audioStore.error = "Microphone permission denied";
  }
}
