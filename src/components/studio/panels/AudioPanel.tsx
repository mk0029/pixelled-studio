"use client";

import { useEffect, useRef, useState } from "react";
import { startAudio, stopAudio, audioStore } from "@/engine/audio";
import { saveMediaBlob } from "@/lib/db";

interface Props {
  project: { id: string; fps: number; duration: number };
}

export default function AudioPanel({ project }: Props) {
  const [micOn, setMicOn] = useState(false);
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [bass, setBass] = useState(0);
  const [mid, setMid] = useState(0);
  const [treble, setTreble] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      setBass((v) => v * 0.8 + audioStore.level * 0.2);
      setMid((v) => v * 0.8 + audioStore.level * 0.15);
      setTreble((v) => v * 0.8 + audioStore.level * 0.1);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const toggleMic = async () => {
    if (micOn) {
      stopAudio();
      setMicOn(false);
    } else {
      await startAudio();
      setMicOn(audioStore.enabled);
      if (!audioStore.enabled) setStatus(audioStore.error);
    }
  };

  const bake = async (file: File) => {
    setStatus("Decoding audio...");
    setProgress(0);
    const arrayBuffer = await file.arrayBuffer();
    const ctx = new AudioContext();
    const buffer = await ctx.decodeAudioData(arrayBuffer);
    const sampleRate = buffer.sampleRate;
    const channel = buffer.getChannelData(0);
    const fps = project.fps || 30;
    const duration = Math.min(project.duration, buffer.duration);
    const frames = Math.ceil(duration * fps);
    const levels: number[] = [];
    for (let i = 0; i < frames; i++) {
      const t = i / fps;
      const start = Math.floor(t * sampleRate);
      const end = Math.min(channel.length, start + Math.floor(sampleRate / fps));
      let sum = 0;
      for (let j = start; j < end; j++) sum += channel[j] * channel[j];
      levels.push(Math.sqrt(sum / Math.max(1, end - start)));
      setProgress(Math.round((i / frames) * 100));
    }
    const blob = new Blob([JSON.stringify({ fps, duration, levels })], { type: "application/json" });
    await saveMediaBlob(`audio:${project.id}`, blob);
    setStatus(`Baked ${frames} frames to IndexedDB`);
    setProgress(100);
    ctx.close().catch(() => {});
  };

  return (
    <div className="space-y-3 p-3 text-[11px] text-zinc-200">
      <div className="label mb-2">Audio Beat-Sync</div>
      <div className="flex gap-2">
        <button className={`btn flex-1 ${micOn ? "chip-active" : ""}`} onClick={toggleMic}>
          {micOn ? "Stop Mic" : "Use Microphone"}
        </button>
        <button className="btn flex-1" onClick={() => fileRef.current?.click()}>
          Upload Audio
        </button>
      </div>
      <input ref={fileRef} type="file" accept="audio/*" hidden onChange={(e) => {
        const f = e.target.files?.[0];
        e.target.value = "";
        if (f) bake(f);
      }} />
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-12">Bass</span>
          <div className="h-2 flex-1 rounded bg-zinc-800"><div className="h-2 rounded bg-blue-500" style={{ width: `${Math.min(100, bass * 100)}%` }} /></div>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-12">Mid</span>
          <div className="h-2 flex-1 rounded bg-zinc-800"><div className="h-2 rounded bg-amber-500" style={{ width: `${Math.min(100, mid * 100)}%` }} /></div>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-12">Treble</span>
          <div className="h-2 flex-1 rounded bg-zinc-800"><div className="h-2 rounded bg-teal-500" style={{ width: `${Math.min(100, treble * 100)}%` }} /></div>
        </div>
      </div>
      {progress > 0 && progress < 100 && (
        <div className="h-2 rounded bg-zinc-800"><div className="h-2 rounded bg-blue-500" style={{ width: `${progress}%` }} /></div>
      )}
      {status && <div className="text-zinc-400">{status}</div>}
    </div>
  );
}
