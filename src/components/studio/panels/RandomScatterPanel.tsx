"use client";

import { useEffect } from "react";
import type { Layer } from "@/types/project";
import {
  createDefaultScatterConfig, getRecommendedScatterCount,
  type RandomScatterConfig, type ScatterColorMode, type ScatterMovement,
} from "@/lib/randomScatterEngine";

interface Props {
  layer: Layer;
  onLayer: (patch: Partial<Layer>) => void;
  width: number;
  height: number;
}

const SWATCHES = ["#FFFFFF", "#FF0000", "#00FF00", "#FFD700", "#00FFFF"];
const MOVEMENTS: [ScatterMovement, string][] = [
  ["twinkle-static", "Twinkle in Place"], ["float-random", "Float & Bounce"],
  ["fall-down", "Fall Down"], ["rise-up", "Rise Up"],
  ["sweep-left", "Sweep Left"], ["sweep-right", "Sweep Right"],
];
const COLOR_MODES: [ScatterColorMode, string][] = [
  ["solid", "Solid Color"], ["palette", "Animation Palette (2–4 Colors)"],
  ["high-contrast", "High-Contrast"], ["rainbow", "Rainbow"],
];

/** One panel per animation/layer: its scatter never reads another layer's config. */
export default function RandomScatterPanel({ layer, onLayer, width, height }: Props) {
  const totalLeds = Math.max(1, Math.round(width) * Math.round(height));
  const min = Math.min(10, totalLeds);
  const recommended = getRecommendedScatterCount(width, height);
  const config = layer.scatter ?? createDefaultScatterConfig(width, height);
  const patch = (next: Partial<RandomScatterConfig>) => onLayer({ scatter: { ...config, ...next } });
  const count = Math.max(min, Math.min(totalLeds, config.autoCount ? recommended : config.count));
  const tailMax = Math.min(50, Math.max(2, Math.round(height)));
  const tailLength = Math.max(2, Math.min(tailMax, Math.round(config.tailLength ?? Math.max(2, Math.round(height * 0.15)))));

  useEffect(() => {
    if (config.enabled && config.autoCount && config.count !== recommended) patch({ count: recommended });
  }, [width, height, config.enabled, config.autoCount, config.count, recommended]); // eslint-disable-line react-hooks/exhaustive-deps

  const slider = (label: string, value: number, lo: number, hi: number, step: number,
    onChange: (v: number) => void, suffix = "") => (
    <label className="block">
      <div className="mb-1 flex items-center justify-between">
        <span className="label">{label}</span>
        <span className="font-mono text-[10px] text-zinc-400">{value}{suffix}</span>
      </div>
      <input type="range" min={lo} max={hi} step={step} value={value} className="w-full"
        onChange={(e) => onChange(+e.target.value)} />
    </label>
  );

  return (
    <section className="rounded-lg border border-amber-400/20 bg-amber-400/[.03] p-2.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="label">Random Scatter</span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-zinc-400">{count} / {totalLeds} LEDs</span>
          <input type="checkbox" aria-label="Random Scatter enabled" checked={config.enabled}
            onChange={(e) => patch({
              enabled: e.target.checked,
              autoCount: e.target.checked ? true : config.autoCount,
              count: e.target.checked ? recommended : config.count,
            })} />
        </div>
      </div>

      {!config.enabled ? null : (
        <div className="space-y-2">
          <label className="block">
            <div className="mb-1 flex items-center justify-between">
              <span className="label">Scatter dots</span>
              <div className="flex items-center gap-1">
                <button className={`chip ${config.autoCount ? "chip-active" : ""}`}
                  onClick={() => patch({ count: recommended, autoCount: true })}>Auto (~19%)</button>
                <input type="number" min={min} max={totalLeds} aria-label="Scatter dot count"
                  className="field w-16 font-mono" value={count}
                  onChange={(e) => patch({
                    count: Math.max(min, Math.min(totalLeds, Math.round(+e.target.value || min))),
                    autoCount: false,
                  })} />
              </div>
            </div>
            <input type="range" min={min} max={totalLeds} step={1} value={count} className="w-full"
              onChange={(e) => patch({ count: +e.target.value, autoCount: false })} />
          </label>

          <label className="block">
            <div className="mb-1 label">Color mode</div>
            <select className="field" value={config.colorMode}
              onChange={(e) => patch({ colorMode: e.target.value as ScatterColorMode })}>
              {COLOR_MODES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>

          {config.colorMode === "solid" && (
            <div className="flex flex-wrap items-center gap-1">
              {SWATCHES.map((color) => (
                <button key={color} aria-label={`Scatter ${color}`} title={color}
                  onClick={() => patch({ primaryColor: color, colorMode: "solid" })}
                  className={`h-6 w-6 rounded border ${config.primaryColor.toUpperCase() === color ? "border-zinc-100" : "border-zinc-700"}`}
                  style={{ background: color }} />
              ))}
              <input type="color" aria-label="Custom scatter color" className="h-6 w-7 cursor-pointer bg-transparent"
                value={config.primaryColor} onChange={(e) => patch({ primaryColor: e.target.value })} />
            </div>
          )}

          {config.colorMode === "palette" && (
            <div className="flex flex-wrap items-center gap-1">
              {config.paletteColors.map((color, i) => (
                <input key={i} type="color" aria-label={`Palette color ${i + 1}`} value={color}
                  onChange={(e) => {
                    const next = [...config.paletteColors];
                    next[i] = e.target.value;
                    patch({ paletteColors: next });
                  }} className="h-6 w-7 cursor-pointer bg-transparent" />
              ))}
              {config.paletteColors.length < 4 &&
                <button className="chip" onClick={() => patch({ paletteColors: [...config.paletteColors, "#FFFFFF"] })}>+ color</button>}
              {config.paletteColors.length > 2 &&
                <button className="chip" onClick={() => patch({ paletteColors: config.paletteColors.slice(0, -1) })}>− color</button>}
              <input type="color" aria-label="Primary scatter color" className="h-6 w-7 cursor-pointer bg-transparent"
                value={config.primaryColor} onChange={(e) => patch({ primaryColor: e.target.value })} />
            </div>
          )}

          <label className="flex items-center gap-2 text-[11px] text-zinc-400">
            <input type="checkbox" checked={config.pixelOverwrite}
              onChange={(e) => patch({ pixelOverwrite: e.target.checked })} />
            Pure Pixel Overwrite (off = Add Glow)
          </label>

          <label className="flex items-center gap-2 text-[11px] text-zinc-400">
            <input type="checkbox" checked={config.blankAreaOnly ?? false}
              onChange={(e) => patch({ blankAreaOnly: e.target.checked })} />
            Skip animation area (show scatter only in blank space)
          </label>

          {config.blankAreaOnly && slider("Padding", config.blankPadding ?? 2, 0, 8, 1,
            (v) => patch({ blankPadding: v }), " px")}

          {slider("Speed", config.speed, 0, 100, 1, (v) => patch({ speed: v }))}

          <label className="block">
            <div className="mb-1 label">Movement</div>
            <select className="field" value={config.movement}
              onChange={(e) => patch({ movement: e.target.value as ScatterMovement })}>
              {MOVEMENTS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>

          {config.movement !== "twinkle-static" && (
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[11px] text-zinc-400">
                <input type="checkbox" checked={config.showTail ?? false}
                  onChange={(e) => patch({ showTail: e.target.checked })} />
                Show Tail
              </label>
              {config.showTail && (
                <label className="block">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="label">Tail length</span>
                    <div className="flex items-center gap-1">
                      <input type="number" min={2} max={tailMax} aria-label="Tail length in pixels"
                        className="field w-16 font-mono" value={tailLength}
                        onChange={(e) => patch({
                          tailLength: Math.max(2, Math.min(tailMax, Math.round(+e.target.value || 2))),
                        })} />
                      <span className="font-mono text-[10px] text-zinc-500">px / max {tailMax}</span>
                    </div>
                  </div>
                  <input type="range" min={2} max={tailMax} step={1} value={tailLength} className="w-full"
                    onChange={(e) => patch({ tailLength: +e.target.value })} />
                </label>
              )}
            </div>
          )}

          <label className="block">
            <div className="mb-1 label">Blink style</div>
            <select className="field" value={config.blinkStyle}
              onChange={(e) => patch({ blinkStyle: e.target.value as RandomScatterConfig["blinkStyle"] })}>
              <option value="crisp-flash">Crisp Flash</option>
              <option value="smooth-pulse">Smooth Pulse</option>
              <option value="always-on">Always On</option>
            </select>
          </label>

          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[10px] text-zinc-500">Seed {config.seed}</span>
            <button className="btn" onClick={() => patch({ seed: Math.floor(Math.random() * 1_000_000) })}>New Seed</button>
          </div>
        </div>
      )}
    </section>
  );
}
