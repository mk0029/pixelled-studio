import type { ReactNode } from "react";

const PATHS: Record<string, ReactNode> = {
  play: <path d="M7 4l12 8-12 8V4z" fill="currentColor" stroke="none" />,
  pause: <><path d="M8 5v14M16 5v14" /></>,
  stop: <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none" />,
  prev: <><path d="M18 5v14L8 12l10-7zM5 5v14" /></>,
  next: <><path d="M6 5v14l10-7L6 5zM19 5v14" /></>,
  loop: <><path d="M17 2l4 4-4 4M3 11V9a3 3 0 013-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 01-3 3H3" /></>,
  rec: <circle cx="12" cy="12" r="6" fill="currentColor" stroke="none" />,
  eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  eyeOff: <><path d="M3 3l18 18M10.6 5.2A10 10 0 0112 5c6 0 10 7 10 7a17 17 0 01-3 3.7M6.2 6.3A17 17 0 002 12s4 7 10 7a10 10 0 004-.8" /></>,
  trash: <><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></>,
  copy: <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2" /></>,
  split: <><path d="M12 3v18M6 7l-3 5 3 5M18 7l3 5-3 5" /></>,
  up: <><path d="M12 19V5M6 11l6-6 6 6" /></>,
  down: <><path d="M12 5v14M6 13l6 6 6-6" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  x: <><path d="M5 5l14 14M19 5L5 19" /></>,
  cpu: <><rect x="6" y="6" width="12" height="12" rx="2" /><rect x="9" y="9" width="6" height="6" /><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4" /></>,
  grid: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18M15 3v18M3 9h18M3 15h18" /></>,
  sigma: <><path d="M18 4H6l7 8-7 8h12" /></>,
  sparkles: <><path d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3zM19 17l.7 2.3L22 20l-2.3.7L19 23l-.7-2.3L16 20l2.3-.7L19 17z" /></>,
  image: <><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></>,
  zoomIn: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4M11 8v6M8 11h6" /></>,
  zoomOut: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4M8 11h6" /></>,
  fit: <><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></>,
  layers: <><path d="M12 2L2 8l10 6 10-6-10-6zM2 13l10 6 10-6M2 18l10 6 10-6" /></>,
  save: <><path d="M4 3h13l3 3v15H4zM8 3v6h8V3M8 21v-7h8v7" /></>,
  folder: <><path d="M3 6h7l2 2h9v12H3z" /></>,
  download: <><path d="M12 3v12M7 10l5 5 5-5M4 21h16" /></>,
  undo: <><path d="M9 7L4 12l5 5M4 12h10a6 6 0 010 12" /></>,
  redo: <><path d="M15 7l5 5-5 5M20 12H10a6 6 0 000 12" /></>,
  sliders: <><path d="M4 6h16M4 12h16M4 18h16" /><circle cx="9" cy="6" r="2" fill="#09090b" /><circle cx="15" cy="12" r="2" fill="#09090b" /><circle cx="8" cy="18" r="2" fill="#09090b" /></>,
  chevron: <path d="M6 9l6 6 6-6" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
  warning: <><path d="M12 3L2 21h20L12 3zM12 9v5M12 18v.5" /></>,
  wifi: <><path d="M2 8a16 16 0 0120 0M5 12a11 11 0 0114 0M9 16a5 5 0 016 0" /><circle cx="12" cy="20" r="1" fill="currentColor" /></>,
  check: <path d="M4 12l5 5L20 6" />,
  shield: <><path d="M12 2l8 3v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V5l8-3z" /></>,
  instagram: <><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4.2" /><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" /></>,
};

export function Icon({ name, size = 14 }: { name: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
      {PATHS[name] ?? PATHS.play}
    </svg>
  );
}
