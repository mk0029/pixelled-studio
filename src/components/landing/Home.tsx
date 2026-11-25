"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/studio/icons";
import { useStudioSettings } from "@/context/StudioSettingsContext";

const FEATURES = [
  { icon: "sigma", title: "100+ Math & Logical Shaders", body: "Trig waves, polar spirals, bitwise XOR logic, cellular automata, particle drops, and a live custom math formula editor." },
  { icon: "layers", title: "Multi-Layer Independent Text Engine", body: "Stack multiple scrolling tickers with independent directions, speeds and colors, on crisp pixel fonts." },
  { icon: "image", title: "Universal Media & Effect Import", body: "PNG / JPG / GIF / WEBP / MP4 / WEBM inputs, legacy LEDEdit .sfx / .swf effects, auto-cropped to the matrix." },
  { icon: "cpu", title: "Hardware-Accurate Wiring & Mapper", body: "Visualizes Vertical S-Snake / Progressive paths, port splits and RGB / GRB channel order live on the canvas." },
  { icon: "grid", title: "NLE Timeline with Magnetic Snapping", body: "Frame-accurate trimming, splitting, per-layer controls and phase-alignment snap lines." },
  { icon: "wifi", title: "100% Offline-First PWA", body: "Installable on Windows, Android or macOS — works with zero internet connection at real event sites." },
];

const GRIDS = ["8×8", "16×16", "16×32", "16×60", "32×64", "64×64", "custom"];
const EXPORTS = ["LEDEdit AVI", "FSEQ", "BIN", "JSON"];
const MEDIA = ["PNG", "JPG", "GIF", "WEBP", "MP4", "WEBM"];

// framer-motion's whileInView never fires in this app, so reveal on a raw IntersectionObserver
function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setInView(true); io.disconnect(); }
    }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, inView };
}

export default function Home({ onLaunch }: { onLaunch: () => void }) {
  const { getTransition } = useStudioSettings();
  const launch = useCallback(() => onLaunch(), [onLaunch]);
  const quick = useReveal<HTMLElement>();
  const formats = useReveal<HTMLElement>();
  const why = useReveal<HTMLElement>();
  const features = useReveal<HTMLElement>();

  return (
    <div className="min-h-[100dvh] overflow-y-auto bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-50 flex h-12 shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-950/90 px-4 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="grid h-6 w-6 place-items-center rounded bg-gradient-to-br from-teal-400 to-violet-500 text-[10px] font-black text-zinc-950">T</div>
          <div className="text-[11px] font-bold tracking-tight">PixleLED <span className="text-zinc-500">Studio</span></div>
          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-zinc-400">by Jambh Electricals</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/library" className="btn text-[10px]">Asset Library</Link>
          <button onClick={launch} className="btn btn-primary text-[10px]">Open Studio →</button>
        </div>
      </header>

      <section className="relative flex min-h-[70dvh] flex-col items-center justify-center overflow-hidden px-4 py-16 text-center">
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(60% 50% at 50% 40%, rgba(45,212,191,0.08), transparent)" }} />
        <div className="relative max-w-3xl">
          <div className="label mb-3">PixleLED Studio · Engineered by Jambh Electricals</div>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Professional Pixel LED Toran & Matrix Programming — Directly in Your Browser.</h1>
          <p className="mt-4 text-[13px] leading-relaxed text-zinc-400">Zero installation, 100% client-side speed, offline PWA support, 200+ shaders and stackable text, characters and dots/lines layers — exported as LEDEdit-ready AVI.</p>
          <div className="mt-7 flex items-center justify-center gap-2">
            <button onClick={launch} className="btn btn-primary anim-fade-up anim-fade-up-1 anim-hover">Launch PixleLED Studio</button>
            <button onClick={() => window.open("https://www.instagram.com/jambh_elecricals/", "_blank", "noopener,noreferrer")} className="btn anim-fade-up anim-fade-up-2 anim-hover">Send Feedback</button>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <span className="anim-fade-up anim-fade-up-2 anim-hover rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">100% Free Forever</span>
            <span className="anim-fade-up anim-fade-up-3 anim-hover rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan-300">Zero Ads / Ad-Free</span>
            <span className="anim-fade-up anim-fade-up-4 anim-hover rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-300">100% Offline PWA</span>
          </div>
        </div>
      </section>

      <section id="quickstart" ref={quick.ref} style={{ transitionDuration: `${getTransition(0.5).duration}s` }}
        className={`border-t border-zinc-800 px-4 py-12 ${quick.inView ? "reveal-in" : "reveal"}`}>
        <div className="mx-auto max-w-5xl">
          <div className="label mb-6 text-center">Quick Start Guide</div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["1", "Set the LED Matrix Size", "Pick your grid dimensions and wiring path — preview matches the hardware."],
              ["2", "Stack Math, Text, Characters & Dots", "Add shaders, presets, Hindi text, video clips or hand-drawn stamps."],
              ["3", "Align & Merge on Timeline", "Drag, resize, split, magnetically snap, blend layers."],
              ["4", "Export for LEDEdit", "Export an uncompressed AVI at the exact matrix size."],
            ].map(([n, t, b]) => (
              <div key={n} className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
                <div className="font-mono text-[10px] text-teal-300">{n}</div>
                <div className="mt-2 text-[12px] font-bold text-zinc-100">{t}</div>
                <div className="mt-1 text-[10px] leading-relaxed text-zinc-500">{b}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section ref={formats.ref} style={{ transitionDuration: `${getTransition(0.5).duration}s` }}
        className={`border-t border-zinc-800 px-4 py-12 ${formats.inView ? "reveal-in" : "reveal"}`}>
        <div className="mx-auto max-w-5xl">
          <div className="label mb-6 text-center">Matrix Sizes, Inputs & Exports</div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
              <div className="label mb-2">Grid sizes</div>
              <div className="flex flex-wrap gap-1.5">{GRIDS.map((c) => <span key={c} className="chip text-[9px]">{c}</span>)}</div>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
              <div className="label mb-2">Asset library</div>
              <div className="text-[10px] text-zinc-500">Browse .swf, .avi and .tol animations from Sanity and load clips straight into the studio.</div>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
              <div className="label mb-2">Media & Effect Inputs</div>
              <div className="flex flex-wrap gap-1.5">{MEDIA.map((m) => <span key={m} className="chip text-[9px]">{m}</span>)}</div>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
              <div className="label mb-2">Exports</div>
              <div className="flex flex-wrap gap-1.5">{EXPORTS.map((e) => <span key={e} className="chip text-[9px]">{e}</span>)}</div>
            </div>
          </div>
          <p className="mt-4 text-[10px] leading-relaxed text-zinc-500">
            Every frame is rendered at the exact grid size with nearest-neighbour sampling, then written as uncompressed BGR24 AVI for LEDEdit.
          </p>
        </div>
      </section>

      <section ref={why.ref} style={{ transitionDuration: `${getTransition(0.5).duration}s` }}
        className={`border-t border-zinc-800 px-4 py-12 ${why.inView ? "reveal-in" : "reveal"}`}>
        <div className="mx-auto max-w-5xl">
          <div className="label mb-6 text-center">Why PixleLED Studio is Free, Ad-Free &amp; Offline-First</div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ["100%", "Free Forever", "No paywalls, no watermarks, no subscriptions — built for makers on a budget."],
              ["Ad-Free", "Zero Distraction", "A clean pro workspace with no ads, no tracking walls, no noise."],
              ["100%", "Offline PWA", "Runs fully client-side — event sites, workshops, basements with zero internet."],
            ].map(([n, t, b]) => (
              <div key={t} className="anim-hover rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 text-center">
                <div className="font-mono text-[20px] font-black text-teal-300">{n}</div>
                <div className="mt-2 text-[12px] font-bold text-zinc-100">{t}</div>
                <div className="mt-1 text-[10px] leading-relaxed text-zinc-500">{b}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section ref={features.ref} style={{ transitionDuration: `${getTransition(0.5).duration}s` }}
        className={`border-t border-zinc-800 px-4 py-14 ${features.inView ? "reveal-in" : "reveal"}`}>
        <div className="mx-auto max-w-5xl">
          <div className="label mb-6 text-center">Features</div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="anim-hover rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
                <Icon name={f.icon} size={16} />
                <div className="mt-2 text-[12px] font-bold text-zinc-100">{f.title}</div>
                <div className="mt-1 text-[10px] leading-relaxed text-zinc-500">{f.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="flex flex-col items-center gap-4 border-t border-zinc-800 px-4 py-14 text-center">
        <h2 className="text-2xl font-black">Ready to light it up?</h2>
        <div className="flex items-center gap-2">
          <button onClick={launch} className="btn btn-primary anim-hover">Launch Studio Now</button>
          <button onClick={() => window.open("https://www.instagram.com/jambh_elecricals/", "_blank", "noopener,noreferrer")} className="btn anim-hover">Send Feedback</button>
        </div>
        <div className="text-[10px] text-zinc-600">PixleLED Studio — Engineered by Jambh Electricals</div>
      </section>
    </div>
  );
}
