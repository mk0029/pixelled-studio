"use client";

import { useState } from "react";
import { getController, getChipset } from "@/types/hardware";
import type { Project } from "@/types/project";
import { Icon } from "./icons";

interface Props {
  project: Project;
  onProjects: () => void;
  onHome?: () => void;
  onHardware: () => void;
  onRename: () => void;
  onDeleteProject: () => void;
  onSaveJson: () => void;
  onLoadJson: () => void;
  onExportLed: () => void;
  onExportAvi: () => void;
  onFps: (fps: number) => void;
  onBrightness: (v: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onOpenSettings: () => void;
}

export default function TopBar(p: Props) {
  const [menu, setMenu] = useState(false);
  const ctl = getController(p.project.hardware.controllerId);
  const chip = getChipset(p.project.hardware.chipsetId);
  const pixels = p.project.hardware.cols * p.project.hardware.rows;
  const amps = (pixels * 0.06 * p.project.masterBrightness) / 100;
  const powerRisk = amps > 40;

  const item = (
    label: string,
    icon: string,
    action: () => void,
    disabled = false,
  ) => (
    <button
      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[11px] text-zinc-300 hover:bg-zinc-700/60 disabled:opacity-40"
      disabled={disabled}
      onClick={() => {
        setMenu(false);
        action();
      }}>
      <Icon name={icon} size={13} />
      <span>{label}</span>
    </button>
  );

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-zinc-800 bg-zinc-950 px-3">
      <div className="flex items-center gap-2">
        <div className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-teal-400 to-violet-500 text-[13px] font-black text-zinc-950">
          T
        </div>
        <div className="hidden leading-tight xl:block">
          <div className="text-[11px] font-bold tracking-tight text-zinc-100">
            PixleLED <span className="text-zinc-500">Studio</span>
          </div>
          <div className="text-[8px] uppercase tracking-[.16em] text-zinc-600">
            by Jambh Electricals
          </div>
        </div>
        <button
          className="btn btn-icon"
          onClick={p.onHome}
          title="Home / Guide">
          <Icon name="grid" size={13} />
        </button>
      </div>

      <div className="relative ml-2">
        <button className="btn" onClick={() => setMenu((v) => !v)}>
          File <Icon name="chevron" size={11} />
        </button>
        {menu && (
          <>
            <div
              className="fixed inset-0 z-30"
              onClick={() => setMenu(false)}
            />
            <div className="absolute left-0 top-9 z-40 w-56 rounded-lg border border-zinc-700 bg-zinc-900 p-1 shadow-2xl">
              {item("Projects / New...", "folder", p.onProjects)}
              <div className="my-1 border-t border-zinc-800" />
              {item("Rename Project...", "sliders", p.onRename)}
              {item("Reconfigure Project...", "cpu", p.onHardware)}
              {item("Delete Current Project", "trash", p.onDeleteProject)}
              <div className="my-1 border-t border-zinc-800" />
              {item("Save .json", "save", p.onSaveJson)}
              {item("Load .json", "folder", p.onLoadJson)}
              <div className="my-1 border-t border-zinc-800" />
              {item("Export SD Card .led...", "download", p.onExportLed)}
              {item("Export video / frame ZIP...", "download", p.onExportAvi)}
            </div>
          </>
        )}
      </div>

      <button
        onClick={p.onProjects}
        title="Open Project Launcher / New Project"
        className="flex min-w-0 items-center gap-2 rounded-md border border-zinc-800 px-2 py-1 hover:border-teal-400/50 hover:bg-zinc-900">
        <Icon name="folder" size={13} />
        <span className="max-w-[180px] truncate text-[11px] font-semibold text-zinc-100 lg:max-w-[280px]">
          {p.project.name}
        </span>
        <span className="hidden text-[9px] text-zinc-500 xl:inline">
          Projects / New
        </span>
      </button>

      <button
        onClick={p.onHardware}
        title="Open hardware & wiring configurator"
        className="flex items-center gap-2 rounded-md border border-teal-500/30 bg-teal-500/[.07] px-2 py-1 hover:border-teal-400/60">
        <Icon name="cpu" size={14} />
        <span className="text-[11px] font-semibold text-teal-300">
          {ctl.id}
        </span>
        <span className="hidden text-[10px] text-zinc-500 lg:inline">
          {ctl.ports}P · {chip.name} ·{" "}
          {chip.id === "SK6812" ? "GRBW" : p.project.hardware.colorOrder}
        </span>
      </button>

      <div className="mx-1 h-5 w-px bg-zinc-800" />

      <div className="flex items-center gap-0.5">
        <button
          className="btn btn-icon"
          onClick={p.onUndo}
          disabled={!p.canUndo}
          title="Undo (Ctrl+Z)">
          <Icon name="undo" />
        </button>
        <button
          className="btn btn-icon"
          onClick={p.onRedo}
          disabled={!p.canRedo}
          title="Redo (Ctrl+Y)">
          <Icon name="redo" />
        </button>
      </div>

      <div className="mx-1 h-5 w-px bg-zinc-800" />

      <div className="hidden items-center gap-1 lg:flex">
        <span className="label mr-1">FPS</span>
        {[15, 24, 30, 60].map((f) => (
          <button
            key={f}
            onClick={() => p.onFps(f)}
            className={`rounded px-2 py-1 text-[10px] font-semibold ${p.project.fps === f ? "bg-teal-500/15 text-teal-300" : "text-zinc-500 hover:text-zinc-200"}`}>
            {f}
          </button>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-3">
        <div className="hidden text-right leading-tight md:block">
          <div className="label">Sequence</div>
          <div className="font-mono text-[11px] tabular-nums text-zinc-200">
            {String(Math.floor(p.project.duration / 60)).padStart(2, "0")}:
            {(p.project.duration % 60).toFixed(1).padStart(4, "0")}
          </div>
        </div>
        <div className="hidden text-right leading-tight xl:block">
          <div className="label">Est. load</div>
          <div
            className={`font-mono text-[11px] tabular-nums ${powerRisk ? "text-amber-400" : "text-zinc-300"}`}>
            ≈ {amps.toFixed(1)} A
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn btn-icon"
            onClick={p.onOpenSettings}
            title="Studio settings">
            <Icon name="sliders" />
          </button>
          <span className="label hidden sm:inline">Master</span>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            className="w-20 sm:w-28"
            value={p.project.masterBrightness}
            onChange={(e) => p.onBrightness(+e.target.value)}
            title="Master brightness / power safety cap"
          />
          <span className="w-8 font-mono text-[10px] text-zinc-400">
            {p.project.masterBrightness}%
          </span>
        </div>
      </div>
      {powerRisk && <Icon name="warning" size={14} />}
    </header>
  );
}
