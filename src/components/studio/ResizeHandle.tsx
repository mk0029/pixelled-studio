"use client";

import type { PointerEvent } from "react";

interface Props {
  axis: "x" | "y";
  label: string;
  onDrag: (delta: number) => void;
}

export default function ResizeHandle({ axis, label, onDrag }: Props) {
  const down = (e: PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const start = axis === "x" ? e.clientX : e.clientY;
    const move = (ev: globalThis.PointerEvent) =>
      onDrag((axis === "x" ? ev.clientX : ev.clientY) - start);
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    document.body.style.cursor = axis === "x" ? "col-resize" : "row-resize";
    document.body.style.userSelect = "none";
  };

  return (
    <div role="separator" aria-label={label} aria-orientation={axis === "x" ? "vertical" : "horizontal"}
      onPointerDown={down} title={`Drag to resize ${label}`}
      className={`group relative z-10 shrink-0 bg-zinc-800 transition-colors hover:bg-teal-500/70 active:bg-teal-400 ${
        axis === "x" ? "w-1 cursor-col-resize" : "h-1 cursor-row-resize"
      }`}>
      <span className={`absolute rounded-full bg-zinc-600 group-hover:bg-teal-200 ${
        axis === "x" ? "left-0 top-1/2 h-8 w-px -translate-y-1/2" : "left-1/2 top-0 h-px w-10 -translate-x-1/2"
      }`} />
    </div>
  );
}
