"use client";

import { Icon } from "./icons";

interface Props {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onExport: () => void;
}

export default function TopBar(p: Props) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-zinc-800 bg-zinc-950 px-3">
      <div className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-blue-500 to-amber-500 text-[13px] font-black text-zinc-950">
        T
      </div>
      <div className="text-[11px] font-bold tracking-tight text-zinc-100">
        PixleLED <span className="text-zinc-500">Studio</span>
      </div>
      <a
        href="https://www.instagram.com/jambh_elecricals/"
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-icon"
        title="Instagram"
      >
        <Icon name="instagram" size={13} />
      </a>
      <button type="button" onClick={p.onExport} className="btn" title="Export">
        Export
      </button>
      <button
        type="button"
        onClick={p.onToggleSidebar}
        className="btn btn-icon ml-auto"
        title={p.sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        aria-expanded={p.sidebarOpen}
        aria-label="Toggle sidebar"
      >
        <Icon name={p.sidebarOpen ? "x" : "menu"} size={13} />
      </button>
    </header>
  );
}
