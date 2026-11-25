import type { Project } from "@/types/project";

export interface FontFamily {
  name: string;
  /** CSS font-family stack; next/font variables resolve to self-hosted fonts. */
  css: string;
  script: "hindi" | "english" | "pixel" | "display" | "stylish";
}

const V = (name: string, fallback: string) => `var(--font-${name}), ${fallback}`;

export const FONT_FAMILIES: FontFamily[] = [
  { name: "Noto Sans Devanagari", css: V("noto-sans-devanagari", "sans-serif"), script: "hindi" },
  { name: "Teko", css: V("teko", "sans-serif"), script: "hindi" },
  { name: "Mukta", css: V("mukta", "sans-serif"), script: "hindi" },
  { name: "Hind", css: V("hind", "sans-serif"), script: "hindi" },
  { name: "Poppins", css: V("poppins", "sans-serif"), script: "hindi" },
  { name: "Gotu", css: V("gotu", "sans-serif"), script: "hindi" },
  { name: "Rajdhani", css: V("rajdhani", "sans-serif"), script: "hindi" },
  { name: "Rozha One", css: V("rozha-one", "serif"), script: "stylish" },
  { name: "Yatra One", css: V("yatra-one", "serif"), script: "stylish" },
  { name: "Kalam", css: V("kalam", "cursive"), script: "stylish" },
  { name: "Modak", css: V("modak", "cursive"), script: "stylish" },
  { name: "Pacifico", css: V("pacifico", "cursive"), script: "stylish" },
  { name: "Press Start 2P", css: V("press-start-2p", "monospace"), script: "pixel" },
  { name: "Silkscreen", css: V("silkscreen", "monospace"), script: "pixel" },
  { name: "VT323", css: V("vt323", "monospace"), script: "pixel" },
  { name: "Orbitron", css: V("orbitron", "sans-serif"), script: "display" },
  { name: "Bungee", css: V("bungee", "sans-serif"), script: "display" },
  { name: "Anton", css: V("anton", "sans-serif"), script: "display" },
  { name: "Bebas Neue", css: V("bebas-neue", "sans-serif"), script: "display" },
  { name: "Oswald", css: V("oswald", "sans-serif"), script: "display" },
  { name: "Montserrat", css: V("montserrat", "sans-serif"), script: "display" },
  { name: "Pixel Mono", css: "ui-monospace, monospace", script: "pixel" },
];

/** Canvas `font` cannot parse CSS variables, so expand next/font vars first. */
export function resolveFontStack(stack: string): string {
  if (typeof document === "undefined") return stack;
  const style = getComputedStyle(document.documentElement);
  return stack.replace(/var\((--font-[a-z0-9-]+)(?:,\s*([^)]+))?\)/g, (_, name: string, fallback?: string) =>
    style.getPropertyValue(name).trim() || fallback?.trim() || "sans-serif",
  );
}

/** Canvas silently falls back to Arial unless the web font is loaded first. */
export async function preloadFont(family: string, weight = 700, size = 24): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  const stack = resolveFontStack(family);
  try {
    await document.fonts.load(`${weight} ${size}px ${stack}`);
    await document.fonts.ready;
  } catch {
    // Offline: the self-hosted next/font files are cached by the service worker.
  }
}

export async function preloadProjectFonts(project: Project): Promise<void> {
  const fonts = new Map<string, number>();
  for (const layer of project.layers) {
    if (layer.effect === "text" || layer.kind === "text") {
      const font = layer.textFont ?? FONT_FAMILIES[0].css;
      fonts.set(font, Math.max(8, Math.min(96, layer.textSize ?? 16)));
    }
  }
  await Promise.all([...fonts].map(([font, size]) => preloadFont(font, 700, size)));
}
