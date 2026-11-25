"use client";

import { useState } from "react";
import type { Project } from "@/types/project";
import type { HardwareConfig, StartCorner, RoutingPattern } from "@/types/hardware";
import { buildLayout } from "@/engine/layouts";

interface Props {
  project: Project;
  onApply: (hardware: HardwareConfig) => void;
}

export default function LayoutsPanel({ project, onApply }: Props) {
  const base = project.hardware;
  const [w, setW] = useState(base.cols);
  const [h, setH] = useState(base.rows);
  const [patternId, setPatternId] = useState<string>("3");
  const [zOrientation, setZOrientation] = useState<"horizontal" | "vertical">("horizontal");
  const [numControllers, setNumControllers] = useState(1);
  const [maxPorts, setMaxPorts] = useState(base.activePorts);
  const [maxPixelsPerPort, setMaxPixelsPerPort] = useState(1024);
  const [activePorts, setActivePorts] = useState(base.activePorts);

  const [spokes, setSpokes] = useState(8);
  const [lps, setLps] = useState(10);
  const [rfMode, setRfMode] = useState<"spokes" | "rings">("spokes");
  const [rings, setRings] = useState(4);
  const [lpr, setLpr] = useState(12);
  const [direction, setDirection] = useState<"center-out" | "outer-in">("center-out");

  const [stripCount, setStripCount] = useState(100);

  return (
    <div className="space-y-4 p-3 text-[11px] text-zinc-200">
      <div>
        <div className="label mb-2">Rectangular Grid / Toran / Jhalar</div>
        <div className="grid grid-cols-2 gap-2">
          <input className="field" type="number" value={w} onChange={(e) => setW(+e.target.value)} placeholder="Width" />
          <input className="field" type="number" value={h} onChange={(e) => setH(+e.target.value)} placeholder="Height" />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {[[30, 8], [30, 20], [50, 50], [100, 100]].map(([c, r]) => (
            <button key={`${c}x${r}`} className="btn" onClick={() => { setW(c); setH(r); }}>
              {c} × {r}
            </button>
          ))}
        </div>
        <div className="mt-2 space-y-2">
          <div>
            <div className="label mb-1">Connection Pattern</div>
            <select className="field" value={patternId} onChange={(e) => setPatternId(e.target.value)}>
              <option value="1">1. On the left horizontal</option>
              <option value="2">2. On the right horizontal</option>
              <option value="3">3. On the left vertical</option>
              <option value="4">4. On the right vertical</option>
              <option value="5">5. Under the left horizontal</option>
              <option value="6">6. Under the right horizontal</option>
              <option value="7">7. Under the left vertical</option>
              <option value="8">8. Under the right vertical</option>
              <option value="9">9. Z shape connect</option>
            </select>
          </div>
          {patternId === "9" && (
            <div className="flex gap-2">
              <button className={`btn flex-1 ${zOrientation === "horizontal" ? "chip-active" : ""}`} onClick={() => setZOrientation("horizontal")}>Horizontal Z</button>
              <button className={`btn flex-1 ${zOrientation === "vertical" ? "chip-active" : ""}`} onClick={() => setZOrientation("vertical")}>Vertical Z</button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="label mb-1">Num of Controllers</div>
              <input className="field" type="number" min="1" max="16" value={numControllers} onChange={(e) => setNumControllers(+e.target.value)} />
            </div>
            <div>
              <div className="label mb-1">Max Ports / Controller</div>
              <input className="field" type="number" value={maxPorts} onChange={(e) => setMaxPorts(+e.target.value)} />
            </div>
            <div className="col-span-2">
              <div className="label mb-1">Max Pixels / Port</div>
              <input className="field" type="number" value={maxPixelsPerPort} onChange={(e) => setMaxPixelsPerPort(+e.target.value)} />
            </div>
          </div>
          <button className="btn w-full" onClick={() => {
            const mapping: Record<string, { startCorner: StartCorner; routing: RoutingPattern }> = {
              "1": { startCorner: "top-left", routing: "horizontal-snake" },
              "2": { startCorner: "top-right", routing: "horizontal-snake" },
              "3": { startCorner: "top-left", routing: "vertical-snake" },
              "4": { startCorner: "top-right", routing: "vertical-snake" },
              "5": { startCorner: "bottom-left", routing: "horizontal-snake" },
              "6": { startCorner: "bottom-right", routing: "horizontal-snake" },
              "7": { startCorner: "bottom-left", routing: "vertical-snake" },
              "8": { startCorner: "bottom-right", routing: "vertical-snake" },
              "9": zOrientation === "horizontal"
                ? { startCorner: "top-left", routing: "horizontal-progressive" }
                : { startCorner: "top-left", routing: "vertical-progressive" },
            };
            const m = mapping[patternId];
            const totalPixels = w * h;
            const capacity = numControllers * maxPorts * maxPixelsPerPort;
            if (totalPixels > capacity) {
              alert(`Error Tip: Total pixels (${totalPixels}) exceed ${numControllers} controller(s) capacity (${capacity}). Increase controllers/ports/pixels or reduce grid size.`);
              return;
            }
            onApply({ ...base, layoutType: "matrix", cols: w, rows: h, routing: m.routing, startCorner: m.startCorner, activePorts: Math.min(base.activePorts, maxPorts) });
          }}>Apply Grid / Toran</button>

          <div className={`rounded border p-2 text-[10px] ${w * h <= numControllers * maxPorts * maxPixelsPerPort ? "border-green-500/30 bg-green-500/[.06] text-green-300" : "border-amber-500/30 bg-amber-500/[.06] text-amber-300"}`}>
            {w * h <= numControllers * maxPorts * maxPixelsPerPort
              ? `Connection OK — ${w * h} pixels across ${Math.ceil((w * h) / maxPixelsPerPort)} port(s)`
              : `Error Tip: Total pixels (${w * h}) exceed ${numControllers}× controller capacity (${numControllers * maxPorts * maxPixelsPerPort}).`}
          </div>
        </div>
      </div>

      <div>
        <div className="label mb-2">Round Frame (Chakri / Umbrella — Physical Round Frame)</div>
        <div className="flex gap-2 mb-2">
          <button className={`btn flex-1 ${rfMode === "spokes" ? "chip-active" : ""}`} onClick={() => setRfMode("spokes")}>Radial Spokes</button>
          <button className={`btn flex-1 ${rfMode === "rings" ? "chip-active" : ""}`} onClick={() => setRfMode("rings")}>Concentric Rings</button>
        </div>
        {rfMode === "spokes" ? (
          <div className="grid grid-cols-2 gap-2">
            <input className="field" type="number" value={spokes} onChange={(e) => setSpokes(+e.target.value)} placeholder="Spokes" />
            <input className="field" type="number" value={lps} onChange={(e) => setLps(+e.target.value)} placeholder="LEDs per spoke" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <input className="field" type="number" value={rings} onChange={(e) => setRings(+e.target.value)} placeholder="Rings" />
            <input className="field" type="number" value={lpr} onChange={(e) => setLpr(+e.target.value)} placeholder="LEDs per ring" />
          </div>
        )}
        <div className="mt-2">
          <div className="label mb-1">Direction</div>
          <div className="flex gap-2">
            <button className={`btn flex-1 ${direction === "center-out" ? "chip-active" : ""}`} onClick={() => setDirection("center-out")}>Center-Out</button>
            <button className={`btn flex-1 ${direction === "outer-in" ? "chip-active" : ""}`} onClick={() => setDirection("outer-in")}>Outer-In</button>
          </div>
        </div>
        <button className="btn mt-2 w-full" onClick={() => {
          const params = rfMode === "spokes"
            ? { mode: "spokes" as const, spokes, ledsPerSpoke: lps, direction }
            : { mode: "rings" as const, rings, ledsPerRing: lpr, direction };
          const layout = buildLayout({ layoutType: "roundFrame", layoutParams: params as unknown as Record<string, number | string>, cols: 1, rows: 1 });
          onApply({ ...base, layoutType: "roundFrame", layoutParams: params as unknown as Record<string, number | string>, cols: layout.cols, rows: layout.rows });
        }}>
          Apply Round Frame
        </button>
      </div>

      <div>
        <div className="label mb-2">1D Strip / Border Outline</div>
        <input className="field" type="number" value={stripCount} onChange={(e) => setStripCount(+e.target.value)} placeholder="LED count" />
        <button className="btn mt-2 w-full" onClick={() => {
          const layout = buildLayout({ layoutType: "strip", layoutParams: { count: stripCount }, cols: stripCount, rows: 1 });
          onApply({ ...base, layoutType: "strip", layoutParams: { count: stripCount }, cols: layout.cols, rows: layout.rows });
        }}>
          Apply Strip
        </button>
      </div>

      <div>
        <div className="label mb-2">Multi-port splitter</div>
        <select className="field" value={activePorts} onChange={(e) => setActivePorts(+e.target.value)}>
          <option value={1}>1 port</option>
          <option value={4}>4 ports</option>
          <option value={8}>8 ports</option>
        </select>
        <button className="btn mt-2 w-full" onClick={() => onApply({ ...base, activePorts })}>
          Apply ports
        </button>
      </div>

      <div>
        <div className="label mb-2">Wiring overlay</div>
        <div className="flex gap-2">
          <button className={`btn flex-1 ${base.showWiring ? "chip-active" : ""}`} onClick={() => onApply({ ...base, showWiring: !base.showWiring })}>
            {base.showWiring ? "Hide" : "Show"} wiring
          </button>
          <button className={`btn flex-1 ${base.showIndices ? "chip-active" : ""}`} onClick={() => onApply({ ...base, showIndices: !base.showIndices })}>
            {base.showIndices ? "Hide" : "Show"} indices
          </button>
        </div>
      </div>
    </div>
  );
}
