"use client";

import type { Text3DConfig, Text3DMotion, Text3DStyle } from "@/types/layers";

interface Props {
  config: Text3DConfig;
  onChange: (patch: Partial<Text3DConfig>) => void;
}

const STYLES: { value: Text3DStyle; label: string }[] = [
  { value: "block-extrude", label: "Block Extrude" },
  { value: "shaded-bevel", label: "Shaded Bevel" },
  { value: "neon-shadow", label: "Neon Shadow" },
  { value: "rainbow-depth", label: "Rainbow Depth" },
];

const MOTIONS: { value: Text3DMotion; label: string }[] = [
  { value: "none", label: "None (Static Depth)" },
  { value: "3d-spin-x", label: "3D Spin Flip" },
  { value: "3d-tilt-swing", label: "3D Tilt Swing" },
  { value: "3d-depth-pulse", label: "3D Depth Pulse" },
  { value: "3d-wave", label: "3D Character Wave" },
];

const ANGLES = [
  { value: 135, label: "Bottom-Right 135°" },
  { value: 225, label: "Bottom-Left 225°" },
  { value: 45, label: "Top-Right 45°" },
  { value: 90, label: "Down 90°" },
];

export default function Text3DControls({ config, onChange }: Props) {
  const set = <K extends keyof Text3DConfig>(key: K, value: Text3DConfig[K]) => onChange({ [key]: value } as Partial<Text3DConfig>);

  return (
    <section className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
      <div className="flex items-center justify-between gap-2">
        <div className="label">3D Text &amp; Depth</div>
        <button
          type="button"
          className={`chip min-h-[36px] ${config.enabled ? "chip-active" : ""}`}
          aria-pressed={config.enabled}
          onClick={() => set("enabled", !config.enabled)}
        >
          Enable 3D Text · {config.enabled ? "ON" : "OFF"}
        </button>
      </div>

      <label className="block space-y-1">
        <span className="label">3D Style</span>
        <select className="field min-h-[44px] md:min-h-0" value={config.style} onChange={(e) => set("style", e.target.value as Text3DStyle)}>
          {STYLES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </label>

      <label className="block space-y-1">
        <span className="label">3D Depth · {config.depth}px</span>
        <input type="range" min={1} max={14} step={1} className="w-full" value={config.depth} onChange={(e) => set("depth", +e.target.value)} />
      </label>

      <div className="space-y-1.5">
        <div className="label">3D Angle · {config.angleDeg}°</div>
        <div className="flex flex-wrap gap-1">
          {ANGLES.map((a) => (
            <button
              key={a.value}
              type="button"
              className={`chip min-h-[36px] ${config.angleDeg === a.value ? "chip-active" : ""}`}
              onClick={() => set("angleDeg", a.value)}
            >
              {a.label}
            </button>
          ))}
        </div>
        <input
          type="number" min={0} max={360} className="field min-h-[44px] md:min-h-0 tabular-nums"
          value={config.angleDeg}
          onChange={(e) => set("angleDeg", Math.max(0, Math.min(360, +e.target.value || 0)))}
          aria-label="Custom 3D angle"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="flex min-h-[44px] items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-2">
          <input type="checkbox" checked={config.autoDarken} onChange={(e) => set("autoDarken", e.target.checked)} />
          <span className="text-[11px] text-slate-300">Auto-Darken</span>
        </label>
        <label className="flex min-h-[44px] items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-2">
          <input type="checkbox" checked={config.separatorStroke} onChange={(e) => set("separatorStroke", e.target.checked)} />
          <span className="text-[11px] text-slate-300">Crisp Separator</span>
        </label>
      </div>

      <label className="flex min-h-[44px] items-center gap-2">
        <input type="color" className="h-9 w-10" value={config.extrudeColor} onChange={(e) => set("extrudeColor", e.target.value)} />
        <span className="label">3D Shadow Colour</span>
        <span className="ml-auto font-mono text-[10px] tabular-nums text-slate-400">{config.extrudeColor}</span>
      </label>

      <label className="block space-y-1">
        <span className="label">3D Animation</span>
        <select className="field min-h-[44px] md:min-h-0" value={config.motion} onChange={(e) => set("motion", e.target.value as Text3DMotion)}>
          {MOTIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </label>

      <label className="block space-y-1">
        <span className="label">3D Motion Speed · {config.motionSpeed}</span>
        <input type="range" min={0} max={100} step={1} className="w-full" value={config.motionSpeed} onChange={(e) => set("motionSpeed", +e.target.value)} />
      </label>
    </section>
  );
}
