"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "./icons";
import { useStudioSettings, type LedGlowQuality, type UiAnimationSpeed } from "@/context/StudioSettingsContext";

const SPEEDS: { id: UiAnimationSpeed; label: string }[] = [
  { id: "off", label: "Instant (0x)" },
  { id: "fast", label: "Snappy (0.5x)" },
  { id: "normal", label: "Standard (1.0x)" },
  { id: "smooth", label: "Smooth (1.6x)" },
];

export default function StudioSettingsModal({ open, onClose, onOpenFeedback }: { open: boolean; onClose: () => void; onOpenFeedback: () => void }) {
  const { settings, update, getTransition } = useStudioSettings();

  const clearCache = () => {
    if (!window.confirm("Clear cached PixleLED Studio data? Your current project will be lost.")) return;
    try {
      localStorage.removeItem("pixleled_hw_v1");
      localStorage.removeItem("pixleled_prefs_v1");
      localStorage.removeItem("tohran-layout");
      const req = indexedDB.deleteDatabase("tohran-led-studio");
      req.onsuccess = () => { /* db deleted */ };
      req.onerror = () => { /* ignore */ };
    } catch { /* ignore */ }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div key="studio-settings" className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={getTransition(0.18)}
          onClick={onClose}>
          <motion.div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-950 p-4 shadow-2xl"
            initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={getTransition(0.22)} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-2">
              <Icon name="sliders" size={18} />
              <div>
                <div className="text-[13px] font-bold text-zinc-100">Studio Settings</div>
                <div className="text-[10px] text-zinc-500">Motion, performance &amp; workspace</div>
              </div>
              <button className="btn btn-icon ml-auto" onClick={onClose} title="Close"><Icon name="x" /></button>
            </div>

            <div className="mt-4">
              <div className="label">Motion &amp; UI</div>
              <div className="mt-2 flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/60 p-2">
                <span className="text-[11px] text-zinc-300">Master UI animations</span>
                <button className={`btn text-[10px] ${settings.uiAnimationsEnabled ? "btn-primary" : ""}`} onClick={() => update({ uiAnimationsEnabled: !settings.uiAnimationsEnabled })}>
                  {settings.uiAnimationsEnabled ? "Enabled" : "Disabled (Instant UI)"}
                </button>
              </div>
              <div className="label mt-3">UI animation speed</div>
              <div className="mt-2 grid grid-cols-4 gap-1">
                {SPEEDS.map((s) => (
                  <button key={s.id} className={`btn text-[9px] ${settings.uiAnimationSpeed === s.id ? "btn-primary" : ""}`} onClick={() => update({ uiAnimationSpeed: s.id })}>{s.label}</button>
                ))}
              </div>
              <div className="label mt-3">Live motion test</div>
              <motion.div key={settings.uiAnimationSpeed} className="mt-2 h-14 w-full rounded-lg border border-zinc-800 bg-gradient-to-br from-teal-400/30 to-violet-500/30"
                initial={{ opacity: 0.2, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={getTransition(0.35)} />
            </div>

            <div className="mt-4 border-t border-zinc-800 pt-3">
              <div className="label">Canvas &amp; performance</div>
              <div className="mt-2 grid gap-1">
                <button className={`btn text-[11px] ${settings.ledGlowQuality === "high" ? "btn-primary" : ""}`} onClick={() => update({ ledGlowQuality: "high" })}>Rich Radial Glow</button>
                <button className={`btn text-[11px] ${settings.ledGlowQuality === "performance" ? "btn-primary" : ""}`} onClick={() => update({ ledGlowQuality: "performance" })}>Fast Flat Matrix</button>
              </div>
              <div className="mt-3 flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/60 p-2">
                <span className="text-[11px] text-zinc-300">Auto-save workspace</span>
                <button className={`btn text-[10px] ${settings.autoSaveProject ? "btn-primary" : ""}`} onClick={() => update({ autoSaveProject: !settings.autoSaveProject })}>{settings.autoSaveProject ? "On" : "Off"}</button>
              </div>
              <button className="btn mt-3 w-full text-[10px] text-red-400" onClick={clearCache}>Clear Cached Studio Data</button>
              <button className="btn mt-2 w-full text-[10px]" onClick={() => { onClose(); onOpenFeedback(); }}>Send Feedback / Suggest</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
