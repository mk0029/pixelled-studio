"use client";

import { useRef, useState } from "react";
import { CHARACTER_VIDEO_PRESETS } from "@/engine/effects/characterSprites";
import {
  createDefaultSpriteCharacterConfig, normalizeSpriteCharacterConfig, normalizeSpriteCharacterPresetId,
  type BuiltIn2DPresetId, type CharacterSwitchMode, type CharacterXMovement, type SpriteCharacterConfig,
} from "@/lib/spriteCharacterEngine";
import { normalizeEmojiLayerConfig, normalizeEmojiItem, DEFAULT_EMOJI_ITEM, type EmojiLayerConfig, type EmojiMoveDirection, type EmojiFlickerMode } from "@/types/layers";
import { decodeAnimatedGif } from "@/lib/gifFrameCache";
import AnimationLibrary, { type LibraryAsset } from "@/components/library/AnimationLibrary";
import type { Project } from "@/types/project";

type CharacterLayer = Project["layers"][number];

interface Props {
  project: Project;
  onCommit: (updater: (p: Project) => Project, key?: string) => void;
  onAdd: (effect: string, name?: string) => void;
  onImportMedia: (file: File, onStatus: (message: string) => void, effect?: "media" | "character-video") => Promise<void>;
}

export default function CharacterSpritesPanel({ project, onCommit, onAdd, onImportMedia }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [gifUrl, setGifUrl] = useState("");
  const [gifBusy, setGifBusy] = useState(false);
  const [gifStoreOpen, setGifStoreOpen] = useState(false);
  const videoLayers = project.layers.filter((l) => l.effect === "character-video");
  const spriteLayers = project.layers.filter((l) => l.effect === "sprites");
  const patch = (id: string, p: Partial<CharacterLayer>) =>
    onCommit((proj) => ({ ...proj, layers: proj.layers.map((l) => (l.id === id ? { ...l, ...p } : l)) }), "character:patch");
  const spriteCfg = (layer: CharacterLayer): SpriteCharacterConfig => normalizeSpriteCharacterConfig(
    layer.spriteCharacter ?? {
      ...createDefaultSpriteCharacterConfig(normalizeSpriteCharacterPresetId(layer.spriteType)),
      scale: Math.max(0.5, Math.min(4, layer.mediaScale ?? 1)),
      xOffset: layer.mediaOffsetX ?? 0,
      yOffset: layer.mediaOffsetY ?? 0,
      animSpeed: Math.max(0.25, Math.min(3, layer.mediaSpeed ?? 1)),
      flipX: !!layer.mediaFlipX,
    },
  );
  const patchSprite = (id: string, p: Partial<SpriteCharacterConfig>) =>
    onCommit((proj) => ({
      ...proj,
      layers: proj.layers.map((l) => l.id === id ? {
        ...l,
        spriteType: p.presetId ?? l.spriteType,
        spriteCharacter: { ...spriteCfg(l), ...p },
      } : l),
    }), "character:sprite");

  const emojiCfg = (layer: CharacterLayer): EmojiLayerConfig => normalizeEmojiLayerConfig(layer.emojiCharacter);
  const patchEmoji = (id: string, p: Partial<EmojiLayerConfig>) =>
    onCommit((proj) => ({
      ...proj,
      layers: proj.layers.map((l) => l.id === id ? {
        ...l,
        characterSourceType: "emoji",
        emojiCharacter: normalizeEmojiLayerConfig({ ...(l.emojiCharacter ?? {}), ...p }),
      } : l),
    }), "character:emoji");

  const importGifFile = async (file: File) => {
    const target = videoLayers[0];
    if (!target) { alert("Add a Character / Video layer first."); return; }
    const url = URL.createObjectURL(file);
    try {
      const decoded = await decodeAnimatedGif(url);
      const cfg = normalizeEmojiLayerConfig(target.emojiCharacter);
      const idx = cfg.items.length + 1;
      const next = normalizeEmojiItem({
        id: `gif-${Date.now()}-${idx}`, label: file.name, sourceType: "gif", emoji: "🖼️",
        gifUrl: url, gifFrameCount: decoded.frames.length, gifFps: 12,
      }, cfg.items.length);
      patch(target.id, { characterSourceType: "emoji", emojiCharacter: normalizeEmojiLayerConfig({ ...cfg, items: [...cfg.items, next], selectedItemId: next.id }) });
    } catch { alert("Failed to load GIF"); }
  };
  const selectPreset = (layer: CharacterLayer, id: BuiltIn2DPresetId) => {
    const cfg = spriteCfg(layer);
    const playlist = cfg.switchMode === "single"
      ? [id]
      : cfg.playlist.includes(id) ? cfg.playlist : [...cfg.playlist, id];
    patchSprite(layer.id, { presetId: id, playlist });
  };

  const importFile = async (file: File) => {
    setBusy(true);
    setStatus("Importing…");
    try {
      await onImportMedia(file, setStatus, "character-video");
      setStatus(`Added ${file.name}`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const slider = (label: string, value: number, min: number, max: number, step: number, apply: (v: number) => void, unit = "") => (
    <label className="block">
      <div className="mb-1 flex justify-between"><span className="label">{label}</span><span className="font-mono text-zinc-400">{value}{unit}</span></div>
      <input type="range" min={min} max={max} step={step} value={value} className="w-full" onChange={(e) => apply(+e.target.value)} />
    </label>
  );

  return (
    <>
    <div className="space-y-3 p-3 text-[11px] text-zinc-200">
      <div className="label mb-2">Characters & Video</div>
      <div className="flex gap-2">
        <button className="btn flex-1" onClick={() => onAdd("character-video", "Character Video")}>Add Character / Video</button>
        <button className="btn flex-1" disabled={busy} onClick={() => fileRef.current?.click()}>Import clip</button>
      </div>
      <input ref={fileRef} type="file" hidden accept=".mp4,.webm,.gif,.avi,video/*,image/gif"
        onChange={(e) => e.target.files?.[0] && void importFile(e.target.files[0])} />
      {status && <div className="text-[10px] text-zinc-500">{status}</div>}
      {videoLayers.length === 0 && spriteLayers.length === 0 && <div className="text-zinc-500">No character layers yet.</div>}

      {videoLayers.map((layer) => (
        <div key={layer.id} className="space-y-2 rounded border border-teal-500/20 bg-teal-500/[.03] p-2">
          <div className="font-semibold">{layer.name}</div>
          {(() => {
            const sourceType = layer.characterSourceType ?? (layer.mediaSrc ? "video" : "sprite");
            return (
              <>
                <label className="block">
                  <div className="mb-1 label">Source type</div>
                  <select className="field" value={sourceType} onChange={(e) => {
                    const v = e.target.value as "sprite" | "emoji" | "video";
                    if (v === "emoji") patch(layer.id, { characterSourceType: "emoji", emojiCharacter: normalizeEmojiLayerConfig(layer.emojiCharacter) });
                    else if (v === "sprite") patch(layer.id, { characterSourceType: "sprite" });
                    else patch(layer.id, { characterSourceType: "video" });
                  }}>
                    <option value="sprite">2D Sprite</option>
                    <option value="emoji">Emoji</option>
                    <option value="video">Uploaded Video/GIF</option>
                  </select>
                </label>
                {sourceType === "emoji" ? (
                  <>
                    {(() => {
                      const cfg = normalizeEmojiLayerConfig(layer.emojiCharacter);
                      const selectedItem = cfg.items.find((it) => it.id === cfg.selectedItemId) ?? cfg.items[0];
                      const patchCfg = (p: Partial<typeof cfg>) => patch(layer.id, { characterSourceType: "emoji", emojiCharacter: normalizeEmojiLayerConfig({ ...cfg, ...p }) });
                      const patchItem = (p: Partial<typeof selectedItem>) => patch(layer.id, {
                        characterSourceType: "emoji",
                        emojiCharacter: normalizeEmojiLayerConfig({
                          ...cfg,
                          items: cfg.items.map((it) => it.id === selectedItem.id ? { ...it, ...p } : it),
                        }),
                      });
                      const selectItem = (id: string) => patchCfg({ selectedItemId: id });
                      const addItem = () => {
                        const idx = cfg.items.length + 1;
                        const next = normalizeEmojiItem({ id: `emoji-${Date.now()}-${idx}`, label: `Emoji ${idx}`, emoji: "❤️" }, cfg.items.length);
                        patchCfg({ items: [...cfg.items, next], selectedItemId: next.id });
                      };
                      const removeItem = (id: string) => {
                        const nextItems = cfg.items.filter((it) => it.id !== id);
                        patchCfg({ items: nextItems.length ? nextItems : [{ ...DEFAULT_EMOJI_ITEM }], selectedItemId: (nextItems[0] ?? cfg.items[0]).id });
                      };
                      const importGif = async (file: File) => {
                        const url = URL.createObjectURL(file);
                        const decoded = await decodeAnimatedGif(url);
                        const idx = cfg.items.length + 1;
                        const next = normalizeEmojiItem({
                          id: `gif-${Date.now()}-${idx}`, label: `GIF ${idx}`, sourceType: "gif", emoji: "🖼️",
                          gifUrl: url, gifFrameCount: decoded.frames.length, gifFps: 12,
                        }, cfg.items.length);
                        patchCfg({ items: [...cfg.items, next], selectedItemId: next.id });
                      };
                      const quickFill = () => {
                        const emojis = ["🪔","❤️","💃","🎉","🦚","✨"];
                        const count = 6;
                        const items = Array.from({ length: count }, (_, i) => normalizeEmojiItem({
                          id: `emoji-${i + 1}`, label: `Emoji ${i + 1}`, emoji: emojis[i % emojis.length],
                          x: Math.round((i / (count - 1 || 1)) * Math.max(0, project.hardware.cols - 10)),
                          y: Math.round(project.hardware.rows / 2),
                        }, i));
                        patchCfg({ items, selectedItemId: items[0].id });
                      };
                      const applyToAll = () => {
                        patchCfg({
                          items: cfg.items.map((it) => ({
                            ...it,
                            scale: selectedItem.scale,
                            speed: selectedItem.speed,
                            rotationDeg: selectedItem.rotationDeg,
                            flipX: selectedItem.flipX,
                            opacity: selectedItem.opacity,
                            flickerMode: selectedItem.flickerMode,
                            flickerSpeed: selectedItem.flickerSpeed,
                            flickerIntensity: selectedItem.flickerIntensity,
                            direction: selectedItem.direction,
                            bounceRadius: selectedItem.bounceRadius,
                          })),
                        });
                      };
                      const quickLayout = (mode: string) => {
                        const cols = project.hardware.cols;
                        const rows = project.hardware.rows;
                        let positions: { x: number; y: number }[] = [];
                        if (mode === "center") positions = cfg.items.map(() => ({ x: Math.round(cols / 2), y: Math.round(rows / 2) }));
                        else if (mode === "corners") {
                          const c = [{ x: 0, y: 0 }, { x: Math.max(0, cols - 10), y: 0 }, { x: 0, y: Math.max(0, rows - 10) }, { x: Math.max(0, cols - 10), y: Math.max(0, rows - 10) }, { x: Math.round(cols / 2), y: Math.round(rows / 2) }];
                          positions = cfg.items.map((_, i) => c[i % c.length]);
                        } else if (mode === "row") positions = cfg.items.map((_, i) => ({ x: Math.round((i / (cfg.items.length - 1 || 1)) * Math.max(0, cols - 10)), y: Math.round(rows / 2) }));
                        else if (mode === "random") positions = cfg.items.map(() => ({ x: Math.floor(Math.random() * Math.max(1, cols - 8)), y: Math.floor(Math.random() * Math.max(1, rows - 8)) }));
                        patchCfg({ items: cfg.items.map((it, i) => ({ ...it, x: positions[i]?.x ?? it.x, y: positions[i]?.y ?? it.y })) });
                      };
                      const max = Math.max(48, Math.max(project.hardware.cols, project.hardware.rows));
                      return (
                        <>
                          <div className="flex flex-wrap gap-1">
                            {cfg.items.map((it, i) => (
                              <button key={it.id} className={`chip ${cfg.selectedItemId === it.id ? "chip-active" : ""}`} onClick={() => selectItem(it.id)}>
                                #{i + 1} {it.sourceType === "gif" ? "[GIF]" : it.emoji}
                              </button>
                            ))}
                            <button className="btn" onClick={addItem}>+ Add Emoji</button>
                            <button className="btn" onClick={() => setGifStoreOpen(true)}>GIF Store</button>
                            <div className="flex w-full gap-1">
                              <input className="field flex-1" placeholder="GIF URL (https://...)" value={gifUrl} onChange={(e) => setGifUrl(e.target.value)} />
                              <button className="btn" disabled={gifBusy} onClick={async () => {
                                if (!gifUrl.trim()) return;
                                setGifBusy(true);
                                try {
                                  const decoded = await decodeAnimatedGif(gifUrl.trim());
                                  const idx = cfg.items.length + 1;
                                  const next = normalizeEmojiItem({
                                    id: `gif-${Date.now()}-${idx}`, label: `GIF ${idx}`, sourceType: "gif", emoji: "🖼️",
                                    gifUrl: gifUrl.trim(), gifFrameCount: decoded.frames.length, gifFps: 12,
                                  }, cfg.items.length);
                                  patchCfg({ items: [...cfg.items, next], selectedItemId: next.id });
                                  setGifUrl("");
                                } catch { alert("Failed to load GIF from URL"); }
                                finally { setGifBusy(false); }
                              }}>Import URL</button>
                            </div>
                            <button className="btn" onClick={quickFill}>Quick Fill 6</button>
                            {cfg.items.length > 1 && <button className="btn text-red-400" onClick={() => removeItem(selectedItem.id)}>Remove Selected</button>}
                          </div>

                          <label className="flex items-center gap-2 text-[11px] text-zinc-400">
                            <input type="checkbox" checked={cfg.clickCanvasToPlace} onChange={(e) => patchCfg({ clickCanvasToPlace: e.target.checked })} />
                            Tap canvas to place selected emoji
                          </label>

                          <div className="label">Selected emoji location</div>
                          {["X", "Y"].map((axis) => {
                            const key = axis === "X" ? "x" : "y";
                            const maxAxis = axis === "X" ? project.hardware.cols : project.hardware.rows;
                            const val = selectedItem[key];
                            const setVal = (v: number) => patchItem({ [key]: v });
                            return (
                              <div key={axis} className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="label">{axis} position</span>
                                  <span className="font-mono text-[10px] tabular-nums text-zinc-400">{val} px</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <button type="button" className="btn h-8 px-2" onClick={() => setVal(val - 1)}>−1</button>
                                  <input type="range" min={-maxAxis} max={maxAxis} step={1} className="min-w-0 flex-1" value={val} onChange={(e) => setVal(+e.target.value)} />
                                  <button type="button" className="btn h-8 px-2" onClick={() => setVal(val + 1)}>+1</button>
                                </div>
                              </div>
                            );
                          })}

                          <div className="flex flex-wrap gap-1">
                            <button className="btn" onClick={() => quickLayout("center")}>Center</button>
                            <button className="btn" onClick={() => quickLayout("corners")}>4 Corners + Center</button>
                            <button className="btn" onClick={() => quickLayout("row")}>Horizontal Row</button>
                            <button className="btn" onClick={() => quickLayout("random")}>Random</button>
                          </div>

                          {selectedItem.sourceType === "gif" ? (
                            <div className="space-y-2 rounded border border-white/10 bg-[#0B0F17] p-2">
                              <div className="text-[10px] text-zinc-500">GIF: {selectedItem.gifFrameCount ?? 1} frames</div>
                              {slider("GIF speed (FPS)", selectedItem.gifFps ?? 12, 1, 30, 1, (v) => patchItem({ gifFps: v }))}
                              <label className="flex items-center gap-2 text-[11px] text-zinc-400">
                                <input type="checkbox" checked={!!selectedItem.chromaKeyEnabled} onChange={(e) => patchItem({ chromaKeyEnabled: e.target.checked })} />
                                Remove BG (Chroma Key)
                              </label>
                              {selectedItem.chromaKeyEnabled && (
                                <>
                                  <input type="color" value={selectedItem.chromaKeyColor ?? "#000000"} onChange={(e) => patchItem({ chromaKeyColor: e.target.value })} />
                                  {slider("Tolerance", selectedItem.chromaTolerance ?? 25, 0, 100, 1, (v) => patchItem({ chromaTolerance: v }), "%")}
                                </>
                              )}
                            </div>
                          ) : (
                            <>
                              <label className="block">
                                <div className="mb-1 label">Emoji</div>
                                <input className="field" value={selectedItem.emoji} onChange={(e) => patchItem({ emoji: e.target.value })} />
                              </label>
                              <div className="flex flex-wrap gap-1">
                                {["🪔","🕉️","❤️","💖","💍","💐","🌺","🪷","🌹","🎊","🎉","✨","🎆","🎇","👑","🙏","💃","🕺","🥁","🎶","🦚","🦋","🕊️","🔥","⭐","🌟","☀️","🌈","⚡","💎"].map((em) => (
                                  <button key={em} className={`chip ${selectedItem.emoji === em ? "chip-active" : ""}`} onClick={() => patchItem({ emoji: em })}>{em}</button>
                                ))}
                              </div>
                            </>
                          )}

                          {slider("Scale", selectedItem.scale, 0.25, 4, 0.05, (v) => patchItem({ scale: v }), "×")}
                          <div className="label">Movement & Bounce</div>
                          <select className="field" value={selectedItem.direction} onChange={(e) => patchItem({ direction: e.target.value as any })}>
                            <option value="fixed-spot">Fixed at (X, Y)</option>
                            <option value="bounce-xy">Bounce 2D (X & Y)</option>
                            <option value="bounce-x">Bounce Left ↔ Right</option>
                            <option value="bounce-y">Bounce Up ↕ Down</option>
                            <option value="bounce-local">Bounce Local Spot</option>
                            <option value="up">Up</option>
                            <option value="down">Down</option>
                            <option value="left">Left</option>
                            <option value="right">Right</option>
                            <option value="diag-ul">Diag Up-Left</option>
                            <option value="diag-ur">Diag Up-Right</option>
                            <option value="diag-dl">Diag Down-Left</option>
                            <option value="diag-dr">Diag Down-Right</option>
                            <option value="float-drift">Float Drift</option>
                          </select>
                          {selectedItem.direction === "bounce-local" && slider("Bounce radius", selectedItem.bounceRadius, 2, 32, 1, (v) => patchItem({ bounceRadius: v }), " px")}
                          {slider("Speed", selectedItem.speed, 0, 100, 1, (v) => patchItem({ speed: v }))}
                          {slider("Rotation", selectedItem.rotationDeg, -180, 180, 1, (v) => patchItem({ rotationDeg: v }), "°")}
                          <label className="flex items-center gap-2 text-[11px] text-zinc-400">
                            <input type="checkbox" checked={selectedItem.flipX} onChange={(e) => patchItem({ flipX: e.target.checked })} />
                            Flip X
                          </label>
                          {slider("Opacity", Math.round(selectedItem.opacity * 100), 10, 100, 1, (v) => patchItem({ opacity: v / 100 }), "%")}
                          <div className="label">Flicker mode</div>
                          <select className="field" value={selectedItem.flickerMode} onChange={(e) => patchItem({ flickerMode: e.target.value as any })}>
                            {["none","blink","candle-flicker","strobe","pulse"].map((m) => <option key={m} value={m}>{m}</option>)}
                          </select>
                          {slider("Flicker speed", selectedItem.flickerSpeed, 0, 100, 1, (v) => patchItem({ flickerSpeed: v }))}
                          {slider("Flicker intensity", selectedItem.flickerIntensity, 0, 100, 1, (v) => patchItem({ flickerIntensity: v }))}
                          <button className="btn w-full" onClick={applyToAll}>Apply Movement & Size to All Emojis</button>

                          <div className="label">Global multipliers</div>
                          {slider("Global scale", Math.round(cfg.globalScaleMult * 100), 25, 400, 1, (v) => patchCfg({ globalScaleMult: v / 100 }), "%")}
                          {slider("Global speed", Math.round(cfg.globalSpeedMult * 100), 25, 400, 1, (v) => patchCfg({ globalSpeedMult: v / 100 }), "%")}
                        </>
                      );
                    })()}
                  </>
                ) : !layer.mediaSrc ? (

            <>
              <div className="flex gap-1">
                <button className="btn" title="Previous character" onClick={() => {
                  const list = CHARACTER_VIDEO_PRESETS;
                  const index = Math.max(0, list.findIndex((p) => p.id === spriteCfg(layer).presetId));
                  selectPreset(layer, list[(index - 1 + list.length) % list.length].id);
                }}>◀</button>
                <select className="field flex-1" value={spriteCfg(layer).presetId}
                  onChange={(e) => selectPreset(layer, e.target.value as BuiltIn2DPresetId)}>
                  {Array.from(new Set(CHARACTER_VIDEO_PRESETS.map((preset) => preset.category))).map((category) => (
                    <optgroup key={category} label={category}>
                      {CHARACTER_VIDEO_PRESETS.filter((preset) => preset.category === category).map((preset) => (
                        <option key={preset.id} value={preset.id}>{preset.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <button className="btn" title="Next character" onClick={() => {
                  const list = CHARACTER_VIDEO_PRESETS;
                  const index = Math.max(0, list.findIndex((p) => p.id === spriteCfg(layer).presetId));
                  selectPreset(layer, list[(index + 1) % list.length].id);
                }}>▶</button>
              </div>
              <label className="flex items-center gap-2 text-[11px] text-zinc-400">
                <input type="checkbox" checked={spriteCfg(layer).usePresetColors}
                  onChange={(e) => patchSprite(layer.id, { usePresetColors: e.target.checked })} />
                Authentic preset colors
              </label>
              {!spriteCfg(layer).usePresetColors && (
                <div className="flex flex-wrap items-center gap-2">
                  {(["primaryColor", "secondaryColor", "glowColor"] as const).map((key) => (
                    <label key={key} className="flex items-center gap-1 text-[10px] text-zinc-500">
                      {key === "primaryColor" ? "Body" : key === "secondaryColor" ? "Accent" : "Glow"}
                      <input type="color" value={spriteCfg(layer)[key]}
                        onChange={(e) => patchSprite(layer.id, { [key]: e.target.value })} className="h-6 w-7 cursor-pointer bg-transparent" />
                    </label>
                  ))}
                </div>
              )}
              {slider("Scale", spriteCfg(layer).scale, 0.5, 4, 0.1, (v) => patchSprite(layer.id, { scale: v }), "×")}
              {slider("Animation speed", spriteCfg(layer).animSpeed, 0.25, 3, 0.05, (v) => patchSprite(layer.id, { animSpeed: v }), "×")}
              <div className="label">X movement</div>
              <select className="field" value={spriteCfg(layer).xMovement}
                onChange={(e) => patchSprite(layer.id, { xMovement: e.target.value as CharacterXMovement })}>
                <option value="static">Static (Center)</option>
                <option value="scroll-right">Move Right →</option>
                <option value="scroll-left">Move Left ←</option>
                <option value="bounce-x">Bounce Left ↔ Right</option>
              </select>
              {slider("X speed", spriteCfg(layer).xSpeed, 0, 100, 1, (v) => patchSprite(layer.id, { xSpeed: v }))}
              {slider("X offset", spriteCfg(layer).xOffset, -100, 100, 1, (v) => patchSprite(layer.id, { xOffset: v }), " px")}
              {slider("Y offset", spriteCfg(layer).yOffset, -100, 100, 1, (v) => patchSprite(layer.id, { yOffset: v }), " px")}
              <label className="flex items-center gap-2 text-[11px] text-zinc-400">
                <input type="checkbox" checked={spriteCfg(layer).flipX}
                  onChange={(e) => patchSprite(layer.id, { flipX: e.target.checked })} />
                Flip horizontal (auto-flips on bounce)
              </label>
              <label className="flex items-center gap-2 text-[11px] text-zinc-400">
                <input type="checkbox" checked={spriteCfg(layer).tileRepeat}
                  onChange={(e) => patchSprite(layer.id, { tileRepeat: e.target.checked })} />
                Repeat across matrix
              </label>
              {spriteCfg(layer).tileRepeat && slider("Tile gap", spriteCfg(layer).tileGap, 0, 32, 1, (v) => patchSprite(layer.id, { tileGap: v }), " px")}
              <div className="label mt-1">Auto character switcher</div>
              <select className="field" value={spriteCfg(layer).switchMode}
                onChange={(e) => patchSprite(layer.id, { switchMode: e.target.value as CharacterSwitchMode })}>
                <option value="single">Single Character</option>
                <option value="cycle-on-pass">Switch on Each X-Pass</option>
                <option value="cycle-timed">Switch Every N Seconds</option>
              </select>
              {spriteCfg(layer).switchMode === "cycle-timed" && slider("Switch interval", spriteCfg(layer).switchIntervalSec, 2, 15, 1,
                (v) => patchSprite(layer.id, { switchIntervalSec: v }), " s")}
              {spriteCfg(layer).switchMode !== "single" && (
                <div className="space-y-1">
                  {Array.from(new Set(CHARACTER_VIDEO_PRESETS.map((preset) => preset.category))).map((category) => (
                    <div key={category}>
                      <div className="text-[10px] text-zinc-500">{category}</div>
                      <div className="flex flex-wrap gap-1">
                        {CHARACTER_VIDEO_PRESETS.filter((preset) => preset.category === category).map((preset) => {
                          const active = spriteCfg(layer).playlist.includes(preset.id);
                          return (
                            <button key={preset.id} className={`chip ${active ? "chip-active" : ""}`}
                              onClick={() => {
                                const current = spriteCfg(layer);
                                const next = active
                                  ? current.playlist.filter((id) => id !== preset.id)
                                  : [...current.playlist, preset.id];
                                patchSprite(layer.id, { playlist: next.length ? next : [preset.id] });
                              }}>{preset.name}</button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="text-[10px] text-zinc-500">Loaded clip: {layer.mediaSrc.startsWith("data:") ? "sampled frames" : layer.mediaSrc}</div>
              {slider("Scale", Math.max(0.1, Math.min(3, layer.mediaScale ?? 1)), 0.1, 3, 0.05, (v) => patch(layer.id, { mediaScale: v, mediaScaleY: v }), "×")}
              {slider("Speed", Math.max(0.25, Math.min(3, layer.mediaSpeed ?? 1)), 0.25, 3, 0.05, (v) => patch(layer.id, { mediaSpeed: v }), "×")}
              {slider("X offset", layer.mediaOffsetX ?? 0, -100, 100, 1, (v) => patch(layer.id, { mediaOffsetX: v }), " px")}
              {slider("Y offset", layer.mediaOffsetY ?? 0, -100, 100, 1, (v) => patch(layer.id, { mediaOffsetY: v }), " px")}
              <label className="flex items-center gap-2 text-[11px] text-zinc-400">
                <input type="checkbox" checked={!!layer.mediaFlipX} onChange={(e) => patch(layer.id, { mediaFlipX: e.target.checked })} />
                Flip horizontal
              </label>
            </>
          )}
          <label className="flex items-center gap-2 text-[11px] text-zinc-400">
            <input type="checkbox" checked={!!layer.mediaSilhouette} onChange={(e) => patch(layer.id, { mediaSilhouette: e.target.checked })} />
            High-contrast silhouette
          </label>
          {slider("Threshold", layer.mediaThreshold ?? 0, 0, 255, 1, (v) => patch(layer.id, { mediaThreshold: v }))}
          {slider("Brightness", layer.mediaBrightness ?? 100, 0, 200, 1, (v) => patch(layer.id, { mediaBrightness: v }), "%")}
          {slider("Contrast", layer.mediaContrast ?? 100, 0, 200, 1, (v) => patch(layer.id, { mediaContrast: v }), "%")}
          {slider("Saturation", layer.mediaSaturation ?? 100, 0, 200, 1, (v) => patch(layer.id, { mediaSaturation: v }), "%")}
          <label className="flex items-center gap-2 text-[11px] text-zinc-400">
            <input type="checkbox" checked={!!layer.mediaChromaEnabled} onChange={(e) => patch(layer.id, { mediaChromaEnabled: e.target.checked })} />
            Chroma key
          </label>
          {layer.mediaChromaEnabled && (
            <>
              <div className="flex gap-2">
                {["#000000", "#00ff00"].map((color) => (
                  <button key={color} className={`chip ${layer.mediaChromaColor === color ? "chip-active" : ""}`}
                    onClick={() => patch(layer.id, { mediaChromaColor: color })}>{color}</button>
                ))}
              </div>
              {slider("Tolerance", Math.round((layer.mediaChromaTolerance ?? 0.35) * 100), 0, 100, 1,
                (v) => patch(layer.id, { mediaChromaTolerance: v / 100 }), "%")}
            </>
          )}
                </>
              );
            })()}          <label className="block">
            <div className="mb-1 label">Blend</div>
            <select className="field" value={layer.blend} onChange={(e) => patch(layer.id, { blend: e.target.value as any })}>
              <option value="normal">Normal</option>
              <option value="screen">Screen</option>
              <option value="lighter">Lighter</option>
            </select>
          </label>
        </div>
      ))}

      {spriteLayers.map((layer) => (
        <div key={layer.id} className="space-y-2 rounded border border-zinc-800 bg-zinc-900/60 p-2">
          <div className="font-semibold">{layer.name}</div>
          <select className="field" value={layer.spriteType || "heart"} onChange={(e) => patch(layer.id, { spriteType: e.target.value })}>
            <option value="heart">Beating Heart</option>
          </select>
          {slider("Count", layer.spriteCount ?? 1, 1, 20, 1, (v) => patch(layer.id, { spriteCount: v }))}
          {slider("Scale", layer.spriteScale ?? 1, 0.5, 4, 0.5, (v) => patch(layer.id, { spriteScale: v }))}
          {slider("Speed", layer.spriteSpeed ?? 1, 0.25, 3, 0.05, (v) => patch(layer.id, { spriteSpeed: v }))}
        </div>
      ))}
    </div>
    {gifStoreOpen && (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4" onClick={() => setGifStoreOpen(false)}>
        <div className="flex h-[80vh] w-full max-w-3xl flex-col rounded-xl border border-white/10 bg-[#0B0F17] p-3 shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[12px] font-semibold text-zinc-100">GIF Store</span>
            <button className="btn btn-icon" onClick={() => setGifStoreOpen(false)} aria-label="Close">✕</button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <AnimationLibrary compact onLoad={async (asset) => {
              if (!asset.url) return;
              const target = videoLayers[0];
              if (!target) { alert("Add a Character / Video layer first."); setGifStoreOpen(false); return; }
              try {
                const decoded = await decodeAnimatedGif(asset.url);
                const cfg = normalizeEmojiLayerConfig(target.emojiCharacter);
                const idx = cfg.items.length + 1;
                const next = normalizeEmojiItem({
                  id: `gif-${Date.now()}-${idx}`, label: asset.title || `GIF ${idx}`, sourceType: "gif", emoji: "🖼️",
                  gifUrl: asset.url, gifFrameCount: decoded.frames.length, gifFps: 12,
                }, cfg.items.length);
                patch(target.id, { characterSourceType: "emoji", emojiCharacter: normalizeEmojiLayerConfig({ ...cfg, items: [...cfg.items, next], selectedItemId: next.id }) });
              } catch { alert("Failed to load GIF"); }
              setGifStoreOpen(false);
            }} />
          </div>
          <div className="mt-2 flex justify-end">
            <label className="btn cursor-pointer">
              Import local GIF
              <input type="file" hidden accept="image/gif,image/webp,image/png" onChange={(e) => e.target.files?.[0] && void importGifFile(e.target.files[0])} />
            </label>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
