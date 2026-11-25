"use client";

import { useEffect, useRef } from "react";
import { renderFrame } from "@/engine/compositor";
import { defaultProject, makeLayer } from "@/types/project";
import type { Preset } from "@/engine/presetLibrary";

export default function MiniPresetCanvas({ preset, size = 36 }: { preset: Preset; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let cancelled = false;
    const render = () => {
      if (cancelled) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const cols = 12;
      const rows = 12;
      const project = defaultProject();
      project.hardware.cols = cols;
      project.hardware.rows = rows;
      project.duration = 1;
      const layer = {
        ...makeLayer(preset.effectId, 1),
        ...(preset.params as object),
        name: preset.name,
        kind: "math" as const,
        effect: preset.effectId,
      };
      project.layers = [layer as typeof project.layers[number]];
      const frame = renderFrame(project, 0.4);
      ctx.fillStyle = "#09090b";
      ctx.fillRect(0, 0, size, size);
      const cell = size / Math.max(cols, rows);
      for (let i = 0; i < cols * rows; i++) {
        const x = i % cols;
        const y = Math.floor(i / cols);
        const q = i * 3;
        ctx.fillStyle = `rgb(${frame[q]},${frame[q + 1]},${frame[q + 2]})`;
        ctx.fillRect(x * cell, y * cell, Math.ceil(cell), Math.ceil(cell));
      }
    };
    if (typeof IntersectionObserver === "undefined") {
      render();
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          render();
          observer.disconnect();
        }
      }
    }, { rootMargin: "200px" });
    observer.observe(canvas);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [preset, size]);

  return <canvas ref={ref} width={size} height={size} className="rounded" />;
}
