"use client";

import { useEffect, useState } from "react";

export default function PwaManager() {
  const [online, setOnline] = useState<boolean | null>(null);
  const [installed, setInstalled] = useState(false);
  const [installable, setInstallable] = useState(false);
  const [promptEvent, setPromptEvent] = useState<any>(null);

  useEffect(() => {
    // Already installed as a standalone PWA?
    setInstalled(window.matchMedia("(display-mode: standalone)").matches);
    setOnline(navigator.onLine);

    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").then((reg) => {
        if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          window.location.reload();
        });
      }).catch(() => {});
    }

    const handler = (e: any) => {
      e.preventDefault();
      setPromptEvent(e);
      setInstallable(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const install = async () => {
    if (!promptEvent) return;
    promptEvent.prompt();
    await promptEvent.userChoice;
    setInstallable(false);
    setPromptEvent(null);
  };

  if (installed) return null;

  return (
    <div className="flex items-center gap-2 pointer-events-none">
      {online === false && (
        <span className="pointer-events-auto animate-pulse rounded bg-amber-500 px-2 py-0.5 text-[9px] font-bold text-zinc-950">Offline</span>
      )}
      {installable && (
        <button onClick={install} className="pointer-events-auto btn text-[10px]">Install App</button>
      )}
    </div>
  );
}
