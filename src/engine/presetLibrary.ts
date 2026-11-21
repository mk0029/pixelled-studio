import type { Layer, Symmetry, BlendMode } from "@/types/project";
import { MATH_EFFECTS } from "./mathCatalog";

export interface Preset {
  id: string;
  name: string;
  category: string;
  effectId: string;
  description: string;
  params: Partial<Layer>;
}

export const PRESET_CATEGORIES = [
  "Festive & Toran",
  "DJ & Club Strobes",
  "Flags & Tricolor",
  "Water & Fire",
  "Retro Arcade",
  "Sacred Geometry",
  "Smooth Ambient Gradients",
  "All",
] as const;

interface Profile {
  name: string;
  category: string;
  colors: string[];
  blend: BlendMode;
  speed: number;
  density: number;
  angle: number;
  symmetry: Symmetry;
  brightness: number;
  trails: number;
  strobeHz: number;
}

const PROFILES: Profile[] = [
  { name: "Diwali Gold Slow", category: "Festive & Toran", colors: ["#ffcc33", "#ff6600"], blend: "add", speed: 0.6, density: 1.2, angle: 0, symmetry: "none", brightness: 85, trails: 0.3, strobeHz: 0 },
  { name: "Wedding Rose Fast", category: "Festive & Toran", colors: ["#ff5c8a", "#9a7cff"], blend: "screen", speed: 1.6, density: 1.6, angle: 45, symmetry: "vertical", brightness: 90, trails: 0, strobeHz: 0 },
  { name: "Tricolor Static", category: "Flags & Tricolor", colors: ["#ff9933", "#ffffff", "#138808"], blend: "normal", speed: 0, density: 1.0, angle: 0, symmetry: "none", brightness: 100, trails: 0, strobeHz: 0 },
  { name: "Club Neon Strobe", category: "DJ & Club Strobes", colors: ["#38e1d4", "#9a7cff"], blend: "add", speed: 2.4, density: 2.0, angle: 90, symmetry: "quad", brightness: 95, trails: 0, strobeHz: 6 },
  { name: "Fire Heat", category: "Water & Fire", colors: ["#ff3300", "#ffcc00"], blend: "add", speed: 1.2, density: 1.4, angle: 0, symmetry: "none", brightness: 90, trails: 0.5, strobeHz: 0 },
  { name: "Ocean Blue Calm", category: "Water & Fire", colors: ["#0066ff", "#38e1d4"], blend: "screen", speed: 0.4, density: 0.9, angle: 0, symmetry: "horizontal", brightness: 80, trails: 0.4, strobeHz: 0 },
  { name: "Retro Arcade", category: "Retro Arcade", colors: ["#00ff66", "#000000"], blend: "normal", speed: 1.0, density: 1.0, angle: 0, symmetry: "none", brightness: 100, trails: 0, strobeHz: 2 },
  { name: "Sacred Gold", category: "Sacred Geometry", colors: ["#ffd700", "#8b4513"], blend: "add", speed: 0.8, density: 1.3, angle: 30, symmetry: "quad", brightness: 90, trails: 0.2, strobeHz: 0 },
  { name: "Ambient Soft", category: "Smooth Ambient Gradients", colors: ["#a78bfa", "#38bdf8"], blend: "screen", speed: 0.3, density: 0.8, angle: 0, symmetry: "none", brightness: 70, trails: 0.6, strobeHz: 0 },
  { name: "Strobe White", category: "DJ & Club Strobes", colors: ["#ffffff", "#000000"], blend: "normal", speed: 3.0, density: 1.0, angle: 0, symmetry: "none", brightness: 100, trails: 0, strobeHz: 12 },
];

export const PRESETS: Preset[] = [];
let idx = 0;
for (const eff of MATH_EFFECTS) {
  if (eff.id === "custom") continue;
  for (let p = 0; p < 2; p++) {
    const prof = PROFILES[(idx + p * 3) % PROFILES.length];
    idx++;
    PRESETS.push({
      id: `preset:${eff.id}:${p}`,
      name: `${eff.name} · ${prof.name}`,
      category: prof.category,
      effectId: eff.id,
      description: `${eff.description} — ${prof.name}`,
      params: {
        color: prof.colors[0],
        gradient: [...prof.colors],
        blend: prof.blend,
        brightness: prof.brightness,
        speed: prof.speed,
        density: prof.density,
        angle: prof.angle,
        symmetry: prof.symmetry,
        trails: prof.trails,
        strobeHz: prof.strobeHz,
      },
    });
  }
}
while (PRESETS.length < 200) {
  const eff = MATH_EFFECTS[PRESETS.length % MATH_EFFECTS.length];
  const prof = PROFILES[PRESETS.length % PROFILES.length];
  PRESETS.push({
    id: `preset:extra:${PRESETS.length}`,
    name: `${eff.name} · ${prof.name} ${PRESETS.length}`,
    category: prof.category,
    effectId: eff.id,
    description: `${eff.description} — ${prof.name}`,
    params: {
      color: prof.colors[0],
      gradient: [...prof.colors],
      blend: prof.blend,
      brightness: prof.brightness,
      speed: prof.speed,
      density: prof.density,
      angle: prof.angle,
      symmetry: prof.symmetry,
      trails: prof.trails,
      strobeHz: prof.strobeHz,
    },
  });
}
