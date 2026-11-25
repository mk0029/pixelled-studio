import type { Project } from "@/types/project";

export interface FontFamily {
  name: string;
  css: string;
  script: "hindi" | "english" | "pixel" | "display" | "stylish";
}

export const FONT_FAMILIES: FontFamily[] = [
  { name: "Noto Sans Devanagari", css: "'Noto Sans Devanagari', sans-serif", script: "hindi" },
  { name: "Teko", css: "'Teko', sans-serif", script: "hindi" },
  { name: "Mukta", css: "'Mukta', sans-serif", script: "hindi" },
  { name: "Hind", css: "'Hind', sans-serif", script: "hindi" },
  { name: "Poppins", css: "'Poppins', sans-serif", script: "hindi" },
  { name: "Rozha One", css: "'Rozha One', serif", script: "stylish" },
  { name: "Yatra One", css: "'Yatra One', cursive", script: "stylish" },
  { name: "Kalam", css: "'Kalam', cursive", script: "stylish" },
  { name: "Gotu", css: "'Gotu', sans-serif", script: "hindi" },
  { name: "Press Start 2P", css: "'Press Start 2P', monospace", script: "pixel" },
  { name: "Silkscreen", css: "'Silkscreen', monospace", script: "pixel" },
  { name: "VT323", css: "'VT323', monospace", script: "pixel" },
  { name: "Orbitron", css: "'Orbitron', sans-serif", script: "display" },
  { name: "Bungee", css: "'Bungee', sans-serif", script: "display" },
  { name: "Anton", css: "'Anton', sans-serif", script: "display" },
  { name: "Bebas Neue", css: "'Bebas Neue', sans-serif", script: "display" },
  { name: "Oswald", css: "'Oswald', sans-serif", script: "display" },
  { name: "Montserrat", css: "'Montserrat', sans-serif", script: "display" },
  { name: "Pacifico", css: "'Pacifico', cursive", script: "stylish" },
  { name: "Permanent Marker", css: "'Permanent Marker', cursive", script: "stylish" },
  { name: "Cinzel", css: "'Cinzel', serif", script: "stylish" },
  { name: "Pixel Mono", css: "ui-monospace, monospace", script: "pixel" },
];

const fontSpec = (family: string, weight: number, size: number) => {
  const named = FONT_FAMILIES.find((f) => f.css === family)?.name;
  return `${weight} ${size}px ${named ? `"${named}"` : family}`;
};

/** Canvas silently falls back to Arial unless the web font is loaded first. */
export async function preloadFont(family: string, weight = 700, size = 24): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  try {
    await document.fonts.load(fontSpec(family, weight, size));
    await document.fonts.ready;
  } catch {
    // Offline / blocked Google Fonts: keep the system fallback.
  }
}

export async function preloadProjectFonts(project: Project): Promise<void> {
  const families = new Set<string>();
  for (const layer of project.layers) {
    if (layer.effect === "text" || layer.kind === "text") {
      families.add(layer.textFont ?? FONT_FAMILIES[FONT_FAMILIES.length - 1].css);
    }
  }
  await Promise.all([...families].map((family) => preloadFont(family)));
}
