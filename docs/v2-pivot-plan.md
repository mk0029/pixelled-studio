# V2 Studio Engine — File-by-File Pivot Plan

Branch: `feat/v2-studio-engine` (backup: `archive/led-converter-v1`).

## A. Delete (`.led` binary converter + controller/IC lookup)

| File | Reason |
|---|---|
| `src/engine/codecs/ledCodec.ts` | rzbv001 controller profile parser |
| `src/engine/codecs/ledDecoder.ts` | .led decode |
| `src/engine/codecs/ledEdit2014Codec.ts` | rzbv001 encode/decode |
| `src/engine/codecs/ledHeaders.ts` | T-1000S header table |
| `src/engine/codecs/ledProbeDiff.ts` | probe diff helper |
| `src/engine/codecs/ledRecorder.ts` | recovered byte map recorder |
| `src/engine/codecs/ledByteMap.ts` | 600-LED byte map |
| `src/engine/codecs/recToLed.ts` | REC→LED converter |
| `src/components/studio/LedImportModal.tsx` | .led import UI |
| `src/components/studio/LedProbeDiff.tsx` | probe diff UI |
| `src/components/studio/panels/TechnicianToolsPanel.tsx` | .led calibration/recorder UI (keep SMPS calc inline if wanted) |
| `src/config/hardware/registry.ts` | trim CONTROLLERS/CHIPSETS to resolution presets only (or remove and inline cols/rows) |
| root `analyze*.py`, `build_*.py`, `make_*_avi.py`, `verify_*.mjs`, `verify_*.py`, `gen_led_byte_map_ts.py` | unused Python/TS converter scripts |

## B. Modify (remove `.led` references)

- `src/types/project.ts`: drop `"led"` from `mediaType` union; add media preprocessing fields (chromaKey*, brightness/contrast/saturation/gamma/threshold, silhouette).
- `src/engine/exporters.ts`: remove `exportLed`, `exportLedRecording`, `exportLedTest`, `exportTolToLed`, `testFrame` (move testFrame preview helper to ExportModal local if needed); trim `ExportFormat` to `"zip" | "avi" | "avi-raw" | "fseq" | "gif" | "swf" | "bin"`; remove corresponding `runExport` cases; remove imports of led codecs.
- `src/engine/mediaImport.ts`: remove `importLed` + `ledFiles`; remove `.led/.zip` branch; keep gif/video/image/swf/sfx.
- `src/components/studio/Studio.tsx`: remove `LedImportModal` import/state/usage; remove `.led` branch in `importMedia`; remove `importLedFile`; change TopBar/OverlaySidebar `onExport` to `"avi"` (or remove `onExportLed`).
- `src/components/studio/ExportModal.tsx`: remove led/led-rec/led-test/tol-to-led FORMATS and related state/UI; remove ledRecorder/tolDecoder imports; keep avi-raw LedEdit workflow note.
- `src/components/studio/shell/OverlaySidebar.tsx`: remove `onExportLed` prop and Export .led button; remove TechnicianToolsPanel import or replace with a minimal SMPS panel; keep controller chip display (or simplify to resolution).
- `src/components/studio/TopBar.tsx`: remove led export trigger.
- `src/workers/importWorker.ts`: remove ledDecoder dynamic import.
- `src/lib/db.ts`: remove `ControllerBinaryProfile` import if only used for led.

## C. Modify (render engine optimization)

- New `src/workers/renderWorker.ts`: OffscreenCanvas + frame sampling loop, posts ImageData/RGB frames.
- `src/components/studio/CanvasViewport.tsx`: use worker with fallback to main thread; keep 60fps UI.
- `src/engine/compositor.ts`: expose pure pixel-sampling helpers for OffscreenCanvas; no behavior change.
- `src/engine/aviEncoder.ts`: ensure uncompressed AVI path is the LEDEdit-ready exporter (already exists as `exportAviUncompressed`); add FPS option 15/24/30 (use project.fps, clamp).

## D. New (Characters & Real-World Video layer)

- `src/engine/mediaRenderer.ts`: add chroma-key + matrix preprocessing (brightness/contrast/saturation/gamma/threshold/silhouette) + transform/blend for media layers.
- `src/types/project.ts`: add fields to `Layer` (chromaKeyColor, chromaKeyTolerance, mediaBrightness, mediaContrast, mediaSaturation, mediaGamma, mediaThreshold, mediaSilhouette, mediaChromaEnabled).
- `src/components/studio/panels/CharacterSpritesPanel.tsx` (or new `CharactersPanel.tsx`): upload/select WebM/GIF/sprite sheets/video; controls for chroma key, preprocessing, transform, blend.
- `src/components/studio/Inspector.tsx`: expose new media preprocessing controls when media layer selected.

## E. New (Sanity CMS library)

- Add dependency `@sanity/client` (and `@sanity/image-url` if thumbnails).
- New `src/lib/sanityClient.ts`: client config from env.
- New `src/sanity/schemas/animationAsset.ts`: schema with title, slug, category, format, resolution, file, previewThumbnail, tags, sourceAttribution.
- New `src/app/library/page.tsx` (or Studio sidebar tab): fetch & filter assets, preview/download .swf/.tol/.avi, load .avi into media layer.
- Update `next.config.ts` / env docs for Sanity project id/dataset.

## F. Tests / self-checks

- Keep `tsc --noEmit` green after deletions.
- Add a small self-check in `mediaRenderer` (chroma key alpha) if non-trivial.

## Out of scope / skipped

- No migration of existing saved projects' `mediaType: "led"` (will be ignored).
- No removal of `.swf`/`.tol` preview support.
- Hardware wiring map kept for cols/rows resolution; only controller/IC tables removed.

---

Approve to proceed with edits?