"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { MotionConfig } from "framer-motion";

export type UiAnimationSpeed = "off" | "fast" | "normal" | "smooth";
export type LedGlowQuality = "high" | "performance";

export interface UiSettings {
  uiAnimationsEnabled: boolean;
  uiAnimationSpeed: UiAnimationSpeed;
  ledGlowQuality: LedGlowQuality;
  autoSaveProject: boolean;
  confirmLayerDelete: boolean;
}

export const DEFAULT_UI_SETTINGS: UiSettings = {
  uiAnimationsEnabled: true,
  uiAnimationSpeed: "normal",
  ledGlowQuality: "high",
  autoSaveProject: true,
  confirmLayerDelete: false,
};

const KEY = "pixleled_ui_settings_v1";
const SPEED_MULT: Record<UiAnimationSpeed, number> = { off: 0, fast: 0.5, normal: 1, smooth: 1.6 };

interface StudioSettingsCtx {
  settings: UiSettings;
  update: (patch: Partial<UiSettings>) => void;
  resetSettings: () => void;
  getTransition: (baseDuration?: number) => { duration: number };
}

const StudioSettingsContext = createContext<StudioSettingsCtx | null>(null);

function load(): UiSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULT_UI_SETTINGS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return DEFAULT_UI_SETTINGS;
}

export function StudioSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<UiSettings>(load);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* ignore */ }
  }, [settings]);

  const update = (patch: Partial<UiSettings>) => setSettings((s) => ({ ...s, ...patch }));
  const resetSettings = () => setSettings(DEFAULT_UI_SETTINGS);

  const getTransition = (baseDuration = 0.3) => {
    const mult = SPEED_MULT[settings.uiAnimationSpeed];
    const enabled = settings.uiAnimationsEnabled && settings.uiAnimationSpeed !== "off";
    return { duration: enabled ? baseDuration * mult : 0 };
  };

  return (
    <StudioSettingsContext.Provider value={{ settings, update, resetSettings, getTransition }}>
      <MotionConfig reducedMotion={settings.uiAnimationsEnabled ? "never" : "always"}>
        {children}
      </MotionConfig>
    </StudioSettingsContext.Provider>
  );
}

export function useStudioSettings(): StudioSettingsCtx {
  const ctx = useContext(StudioSettingsContext);
  if (!ctx) throw new Error("useStudioSettings must be used within StudioSettingsProvider");
  return ctx;
}
