# LedEdit 2014 — REA findings

> Update 2026-11-23: §7's additive-offset claim was not proven. The verified
> container codec and current evidence are in `docs/LEDEDIT_2014_FORMAT.md`
> and `src/engine/codecs/ledEdit2014Codec.ts`. A known-content 114-frame rainbow
> export confirmed `decoded = raw - mask` and an interleaved 8-bit RGB payload
> (3 bytes/pixel); byte-exact decode→RGB→encode round-tripping now works. Still
> unknown: mask derivation from the header salt and the physical LED wiring order.

Target: `C:\LedEdit 2014` (LedEdit.exe 2,469,888 bytes, sha256 `a2af3917af6ce8d472c8592566ec738e52abf379da55fbe1cdce2c3085d66f64`).
Evidence: REA `inspect_managed_artifact` (ev_bbe5f56d…, ev_2e832d35…), direct PE/format parsing of shipped files, extracted .NET satellite resources, and the user's own exported `.led` files.

## 1. What it is, technically

- Original build is a **.NET 2.0 WinForms app** — proved by `en-US\LedEdit.resources.dll` / `zh-CN\LedEdit.resources.dll`: CLI header, metadata `v2.0.50727`, `AssemblyRef: mscorlib`, one type, 23 manifest resources. All form text lives there.
- The **shipped main executable is not managed** and is **packed/encrypted**:
  - no CLI data directory, no `BSJB` metadata signature, no `mscoree` import (observed);
  - section names `vsfjtrqm`, `iucwijew`, entropy 7.9–8.0 (encrypted), `.rsrc` also encrypted (7.99);
  - imports reduced to `kernel32` + `comctl32` only;
  - sibling `xb00001a.dll` carries `.vmp0`/`.vmp1` sections (VMProtect-style VM sections, v3.7.0.0). Inference: VMProtect .NET-style packer with an encrypted managed payload.
- Consequence: **static decompilation of application logic is not possible** with metadata inspection alone. Only UI vocabulary, shipped assets and file formats are recoverable. Decompilation of logic requires a runtime memory dump of the unpacked assembly.

## 2. Feature map (from en-US/zh-CN form resources)

Main form (ClientSize 1097×375, tree of programs + preview panels):
- Files: Open Project, New Project, Save, Close Project, Project Config, Open .swf, Open Video, Import (.dxf) / CorelDRAW .dxf / (.cxb), Open .tol
- Record: Record, Stop Record, Fast recording .swf/.tol, Set time, Frame Rate (1–30 fps), speed F6/F7, next/previous frame
- Export: Effect **.led**, Offline player **.BIN**, preview **AVI**, preview **SWF**, layout **DXF**, reference **BMP**, instruction text
- Text input panel: font, colors, outline, reverse rolling, background, monochrome/full color, horizontal/vertical, speed
- Video Effect module + built-in "Default Effect" wipes: move up/down/left/right, rectangular/elliptic diffusion+contraction, double-angle open/close, pixel, passage, color change, color gradient, R/G/B/white-gray, RGB gradual change
- Screen Shot capture as source, Screen Realtime Play, PC sync start/stop, auto play
- Auto Layout, manual Layout editor (`LEDLAYOUT.exe`), zoom, light layout tree
- Controller: download to SD card, controller list/add/remove, set controller number, DMX addressing (start channel, channel spacing, chips), controller encryption, offline player enable/disable
- Gamma & brightness dialog, current setting, "Make Effect Setup" (gamma correction, RGB seq, program code 00–16)
- New Project dialog: controllers count, port count, **512 or 1024 lights per port**, max lights per port, chips, frame rate, channel fill before/after gaps, "every four/six points reverse", normal/high/low speed

Layout editor (`LEDLAYOUT.resources.dll`): draw straight lines, add port, light direction horizontal/vertical, detect wiring, insert/remove reference image, canvas size, copy/paste/delete, import DXF, save.

Note: nothing in the binary suggests a math/procedural animation engine, layers, blend modes, keyframes, timeline sequencer, transitions or post-processing as described in the user's target stack. LedEdit is: **Flash/SWF or video → recorded frame sequence → packed per-controller file**.

## 3. Shipped effect assets

`Effect_en\…\*.swf` — real Flash animations (not presets):
- Linear effect: 36 files, e.g. `4.swf` = 1002×1425, 79.99 fps, 58,131 frames; `1.swf` = 1003×1316, 15.77 fps, 21,210 frames.
- Over: 4 files, 1600 px tall, 12 fps, 230 frames, CWS/FWS Flash 4–8.
- Symmetrical: 2 files, 12 fps, 301 frames.

So the effect library is Flash content that is sampled into the LED grid. Porting it to a browser means either an SWF runtime (Ruffle), pre-rendered video, or replacing it with your own procedural generators.

## 4. `.led` container (SD-card program file)

Observed on the user's own exports (`torhan Shop\Led\…\00_program1.led`, `01_Program2.led`, `FROM EDIT\…\00.led`, `_T_1000_AC\00_1.led`):
- Magic `rzbv001` + `0x01` at offset 0, in every file.
- Header block = **512 bytes**, payload = **N × 512-byte records**; every sample length is a multiple of 512 exactly (3257, 10661, 11885, 41 records).
- Header fields visible: `60 00` (0x6000 → the T-1000 "1024 LEDs/port" code; 0x3000 = 512 per port per the community protocol notes), `55 AA` at offset 21, a further `… AA AA` field, and 24-bit size-like values at 0x10.
- Payload is **not plain RGB**: entropy 2.6–3.4 bits/byte, <1.5 % zero bytes, top byte values 0xE3 (40 %), 0x63, 0x23 — i.e. record-leading bytes are `0bXX100011`, a 2-bit field over constant low bits, with bit frequencies 0.88/0.94/0.05/0.06/0.06/0.93/0.85/0.75. No zlib/gzip/zip signatures. Empty program = 40 all-zero records.
- External corroboration (not my observation): `.led` files carrying the `rzbv001` magic are widely reported as software+controller-matched encrypted exports; vendor manual documents a "Controller encryption" tool.
- ~~Conclusion: writing `.led` from a web app is impossible without the cipher.~~ **Superseded by §7** — the payload is an offset-shifted packed bitstream, not strong encryption.

Live (USB/serial) protocol — community-reverse-engineered, not verified here: 24 packets × 1040 bytes, 8 ports interleaved per byte, R/G/B planes, per-session salt → byte offset `offset = (Σ salt[i]^key[i]) ^ 90`, `key={59,129,197,228,81,208,127,174,99,41}`; flush packet starts `AA "rzbv001"`, controller id, 0x6000/0x3000 pixel-count code, 50 ms period (20 fps).

SD-card contract: FAT32, file `PP_C.led` (program 00–16, controller 1..N), 512 LEDs/port at 30 fps or 1024 at 20 fps, RGB channel order per driver IC, gamma correction, per-channel dimming.

## 5. What the REA establishes vs. doesn't

Observed: packing, absence of CLI metadata, UI strings/feature list, SWF asset structure, `.led` magic/block/entropy structure, file-set layout.
Inferred: packer family (VMProtect-style), meaning of 0x6000/0x3000 header code, 512-byte record = one frame/block.
Unknown/blocked: application algorithms (VMProtect-virtualised, so an unpacked assembly still does not expose them), `.tol`/`.cxb`/`.bin` formats (no `.led`-format samples shipped for those), exact pixel→byte mapping inside a `.led` frame (see §7).

## 6. Implications for the planned Next.js studio

1. Different product. Your spec (math evaluator, layers, blend modes, keyframes, timeline, transitions, FFT post-FX) has no LedEdit counterpart. Don't call it a port; reuse only the hardware contract and the export targets.
2. Interop targets that are safe and cheap: DXF layout import/export, BMP reference image, JSON project, WebCodecs/AVI-ish export, `.bin` only if you can decode it. `.led` container is now known (§7); only the pixel mapping needs one ground-truth export.
3. Zero-backend is fine for the editor; it is not enough for `.led`. Either add a tiny local helper that talks to controllers (protocol above), or ship unencrypted `.bin` for controllers that accept it.
4. Preview cost is tiny: 512–1024 LEDs × RGB at 20–30 fps. A CPU loop or a small WebGL framebuffer is enough; 60 FPS shaders are a luxury, not a requirement.
5. The only thing worth copying verbatim is the export dialog contract (program code 00–16, RGB seq, gamma, per-channel brightness, fps tied to pixel count) and the SD file naming.

## 7. Runtime dump + `.led` container cracked (2026-11-19)

### Runtime dump

- With LedEdit running (PID 2408), the VMProtect stub unpacks a valid managed PE in-process at image base `0x11000000`, `SizeOfImage 0x42E000`, CLI directory RVA `0x2008`, metadata `BSJB` at RVA `0x902FC`. Dumped page-by-page, section headers converted from image layout to file layout (`PointerToRawData = VirtualAddress`) → `ilspycmd` reads it.
- Assembly is Dotfuscator-obfuscated (55 types, single-letter names). Decompiled with **ilspycmd 7.2.1.6856** (`DOTNET_ROLL_FORWARD=Major`); ILSpy 11 fails on its legacy metadata.
- **Application methods are VMProtect-virtualised**: every method body in the UI/business types has an invalid header (`0xF3 0xFF`), so no recording loop, gamma LUT or cipher is recoverable as IL. The only intact logic is the loader stub `s3t1z9k3c6h2` (extracts `xb00001a[64].dll`, calls `MainDLL`/`CheckRuntime`).
- Artefacts: `C:\Users\mkhic\AppData\Local\Temp\dotnetdump\dumps4\LedEdit_unpacked_11000000.dll`, `src7\*.cs`, `dump_main2.py`.

### `.led` container — determined from all 7 real samples

| Region | Meaning |
|---|---|
| Sector 0 (512 B) | Header: magic `rzbv001\x01`; **frame count big-endian at 0x0C–0x0D** (536, 1770, 1974 in the samples); `60 00` big-endian = 0x6000 at 0x08/0x0A; `55 AA` at 0x15; `AA AA` at 0x1A–0x1B; per-file 3-byte random at ~0x2D; 10-byte salt-like field at 0x37–0x40; random padding to 512. |
| Sectors 1..6N | **N frames of 6 sectors = 3072 B**. Sectors 4 and 5 of every frame are constant = the file's per-export "off" byte (0xE3, 0x59 or 0x49 in the samples). Sectors 0–3 carry data. |
| Final 40 sectors | All-zero trailer. `(file_size/512 - 41) / 6` equals the header frame count for every non-empty sample, exactly. |

- The per-frame constant byte is **per export**, not global — same pattern in all frames of a file, different between files. Subtraction is now **confirmed** by a known-content rainbow export (mask `0xB5`): decoded bytes form clean 8-bit RGB triples `(0,153,255)`, `(0,236,255)`, `(0,160,255)`, `(0,0,255)` … under subtraction; XOR turns them into noise. The codec keeps XOR as an option for source compatibility only.
- The 0x6000 (1024 LEDs/port) / 0x3000 (512 LEDs/port) code and the live salt formula `offset = (Σ salt[i]^key[i]) ^ 90` are from the Hackaday T300K notes; I could not make the header's candidate salt reproduce the file offsets exactly (two files were off by a constant 0x0C, one by more), so the exact file-offset derivation remains unconfirmed.
- Practical consequence: a compatible writer can **reuse a known-good header and its mask byte**, write `frame_count` at 0x0C, emit each frame as 2,048 interleaved RGB bytes (up to 682 pixels) followed by 1,024 mask bytes, then append 40 zero sectors. `encodeLedEdit2014FromPixels` in the codec does exactly this and round-trips the rainbow export byte-for-byte. What is still unknown is the physical order of the pixels and which file byte drives R/G/B on the IC; pinning that down needs one known-pixel export with a visible colour reference.

### Revised answer for the Next.js studio

`.led` is **no longer "blocked"**: the container, mask arithmetic and RGB pixel layout are known, and a template-based writer (`encodeLedEdit2014FromPixels`) is feasible in the browser (JSZip, no backend). Keep the same export contract; wire the writer to a template-header picker. The rest of §6 stands.
