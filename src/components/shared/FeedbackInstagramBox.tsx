"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@/components/studio/icons";
import { useStudioSettings } from "@/context/StudioSettingsContext";

const INSTAGRAM_URL = process.env.NEXT_PUBLIC_INSTAGRAM_URL || "https://www.instagram.com/jambh_elecricals/";
const TAGS = ["Feature Suggestion", "Bug Report", "Controller Request", "Review / Appreciation"];

export default function FeedbackInstagramBox({ open, onClose, specs }: { open: boolean; onClose: () => void; specs?: string }) {
  const { getTransition } = useStudioSettings();
  const [tag, setTag] = useState<string>(TAGS[0]);
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState(false);
  const [sent, setSent] = useState(false);

  const text = [specs, message.trim()].filter(Boolean).join("\n");

  const send = async () => {
    try { await navigator.clipboard.writeText(text || `PixleLED Studio feedback — ${tag}`); } catch { /* clipboard unavailable */ }
    setSent(true);
    setToast(true);
    window.setTimeout(() => setToast(false), 2400);
    window.open(INSTAGRAM_URL, "_blank", "noopener,noreferrer");
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div key="feedback" className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={getTransition(0.18)}
          onClick={onClose}>
          <motion.div className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-950 p-4 shadow-2xl"
            initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={getTransition(0.22)} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-2">
              <Icon name="instagram" size={18} />
              <div>
                <div className="text-[13px] font-bold text-zinc-100">Reviews &amp; Suggestions</div>
                <div className="text-[10px] text-zinc-500">PixleLED Studio · by Jambh Electricals</div>
              </div>
              <button className="btn btn-icon ml-auto" onClick={onClose} title="Close"><Icon name="x" /></button>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {TAGS.map((t) => (
                <button key={t} className={`chip text-[9px] ${tag === t ? "chip-active" : ""}`} onClick={() => setTag(t)}>{t}</button>
              ))}
            </div>

            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="Tell us what you think…"
              className="mt-3 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-2 text-[11px] text-zinc-200 outline-none placeholder:text-zinc-600" />

            {sent && (
              <div className="mt-2 rounded-lg border border-zinc-800 bg-zinc-900/60 p-2">
                <div className="text-[9px] uppercase tracking-[.1em] text-zinc-500 mb-1">Paste this into the Instagram chat:</div>
                <div className="text-[10px] text-zinc-300 whitespace-pre-wrap break-words">{text || `PixleLED Studio feedback — ${tag}`}</div>
              </div>
            )}

            {toast && <div className="mt-2 text-[10px] font-semibold text-teal-300">Message copied! Paste into Instagram chat…</div>}

            {!sent && <button className="btn btn-primary mt-3 w-full" onClick={send}>
              <Icon name="instagram" size={13} /> Send on Instagram Chat →
            </button>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
