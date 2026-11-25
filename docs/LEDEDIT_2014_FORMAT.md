# LEDEdit 2014 `.led` format (clean-room specification)

Status: **container, mask arithmetic and interleaved-RGB pixel payload confirmed;
the physical port/LED wiring order and mask derivation are still unproven**.
All statements below are derived from the actual `LedEdit.exe` install at
`C:\LedEdit 2014`, the runtime-unpacked managed assembly, and byte-level analysis of
real exports including a 114-frame rainbow animation of known visual content.
Web sources were used only as hints and are marked as such.

## Evidence

| Artifact | Size / SHA-256 (prefix) | Role |
|---|---|---|
| `C:\LedEdit 2014\LedEdit.exe` | 2,469,888 / `a2af3917af6ce8d472c8592566ec738e52abf379da55fbe1cdce2c3085d66f64` | shipped, VMProtect-packed .NET 2.0 WinForms app |
| `...\dumps4\LedEdit_unpacked_11000000.dll` | 4,382,720 | runtime memory dump; methods are VM-virtualised (`0xF3 0xFF` headers), so no writer IL is recoverable |
| `D:\Program_1\_T_1000_AC\00_1.led` | 3,716,608 / `61f9780d7fd62ede` | original 1,203-frame reference (copy at `D:\Program_1\_T_1000_AC\00_1.led`) |
| `D:\ashish\Program_1\_T_1000_AC\00_1.led` | 371,200 / `e20e391f5d82270a` | **known-content ground truth**: 114-frame linear rainbow, mask `0xB5` |
| `D:\ashish\Program_1\_rec.bin` | 2,801,664 / `aaa0aed99a3e298` | 114 x 24,576 B companion recording; not a simple view of the frames |
| other exports | 1,126,912 / `5af60503e62e9049`, 5,458,432 / `8dc98447cab255b0`, 6,085,120 / `b279d5abf59f715f`, 61,504,000 / `e0c250fb7bd82e8f` | cross-checks |

## 1. File layout

```
offset 0x000           512-byte header
offset 0x200           N x 3072-byte frames (6 x 512-byte sectors each)
offset 0x200+3072N     40 x 512-byte zero trailer (20,480 bytes)
```

Therefore `fileSize === 512 + 3072 * N + 20480` and
`N === (fileSize / 512 - 41) / 6`. This identity holds **exactly** for every
non-empty standard sample (360, 1,203, 1,770, 1,974 frames).

The 61,504,000-byte sample has a header frame count of 10,007 but 20,014 physical
frames: it uses a double-width variant (pixel code `0xC000`, 2,048 LEDs/port).
Treat it as a separate layout; the codec rejects it rather than guessing.

The two 22,528-byte black/white samples use an older `0x3000` layout: one
1,536-byte frame (3 sectors) plus the same 40-sector trailer. They are also out
of scope; the codec rejects them because the size is not a whole number of
3,072-byte frames.

## 2. Header (512 bytes)

Values below are the reference file's bytes; fields marked *per-export* differ
between files and must be preserved verbatim for a compatible writer.

| Offset | Size | Reference value | Meaning |
|---|---|---|---|
| `0x00` | 8 | `72 7A 62 76 30 30 31 01` | ASCII magic `rzbv001` + version `0x01` |
| `0x08` | 2 | `60 00` | big-endian capacity/config code: `0x6000` for the 8-port exports (24,576 = 3,072 x 8). Also seen `0x0400`, `0x3000`, `0xC000`. Exact meaning unresolved. |
| `0x0A` | 2 | `60 00` | repeat of the capacity code |
| `0x0C` | 2 | `04 B3` | **big-endian frame count** (1,203) |
| `0x0E` | 2 | `32 20` | per-export seed (`"2 "`) |
| `0x10` | 2 | `D3 EF` | per-export seed |
| `0x12` | 2 | `00 60` | constant across the four `0x6000` samples |
| `0x14` | 1 | `00` | constant |
| `0x15` | 2 | `55 AA` | marker |
| `0x17` | 1 | `00` | constant |
| `0x18` | 1 | `10` | constant across `0x6000` samples |
| `0x19` | 1 | `84` | per-export |
| `0x1A` | 2 | `AA AA` | marker |
| `0x1C` | 1 | `B4` | per-export |
| `0x1D` | 1 | `00` | constant |
| `0x1E` | 2 | `00 0F` | constant across `0x6000` samples |
| `0x20`–`0x2C` | 13 | mostly zero | small configuration fields; `0x21=01`, `0x22=11`, `0x23=02`, `0x24=58` in all four `0x6000` samples |
| `0x2D`–`0x2F` | 3 | `12 A9 98` | per-export 24-bit value |
| `0x30`–`0x2FF` | ~464 | pseudorandom | per-export blob; salt-like field at `0x37`–`0x40` per community notes |

The header contains **no obvious copy of the target frame bytes**:
`0x78` (the reference off byte) appears only at `0xB3` and `0x18A`, and for the
`0x49`/`0xE3` samples it does not appear at all. So the export mask cannot be
recovered by a fixed header offset.

Community live-protocol notes (unverified for SD files) claim
`offset = (Σ salt[i] ^ key[i]) ^ 90` with
`key = {59,129,197,228,81,208,127,174,99,41}`. Applying that formula to the
header salt reproduced none of the four observed off bytes exactly, so a writer
must reuse a known-good header and its mask.

### Controller / IC identification

A selection is stored as a `MODEL-CHIP` string. Confirmed plaintext pairings:
`T-1000S-WS2811`, `T-1000S-TM1803,1804,1809,1812`, and `T-1000S-LPD6803` (the
last from a runtime-dump resource). Special driver ICs named in the shipped
zh-CN resources: `SC16722/ZQL9712, DM314, MBI5026` (the English dump label reads
`DM413`). The full model/IC matrix lives in `SET\set_xb.txt`: 352 records in 36
first-block groups, encrypted with an 8-byte-block ECB-like cipher that was not
decrypted. Other models listed in `src/config/hardware/registry.ts` are
**unverified**; none appears in plaintext anywhere scanned.

Machine-readable evidence, encrypted-table metadata, and the unverified registry
mirror: `docs/lededit2014-controller-ic-tables.json`.

## 3. Frame (3072 bytes)

```
sector 0..3   bytes    0..2047   show data
sector 4..5   bytes 2048..3071   constant = per-export mask byte (0x78 in reference)
```

The mask is **per export, not global**: observed `0x78`, `0x49`, `0x59`, `0xE3`
for the four `0x6000` samples. It is identical in every frame of a file.

Two arithmetic candidates turn that constant tail into zero, and both give a
byte-exact round-trip:

```
decoded = (raw - mask) mod 256   // "sub" (codec default)
decoded =  raw ^ mask            // "xor" (codec option)
```

Subtraction is **confirmed** by the known-content rainbow export: decoded bytes
are 8-bit RGB intensities in the range `0..255`, dominated by `0x00` and `0xFF`
because a saturated rainbow has one channel fully off and one fully on. The
first decoded bytes are `00 99 FF 00 EC FF 00 A0 FF 00 00 FF D0 00 FF ...`,
i.e. RGB triples `(0,153,255)`, `(0,236,255)`, `(0,160,255)`, `(0,0,255)`,
`(208,0,255)` — an unmistakable cyan → blue → magenta rainbow ramp. Under XOR
those triples become `(0,117,74)`, `(0,19,74)`, ... which is not a rainbow.
The `maskMath: "xor"` option is retained for source compatibility only.

### Pixel payload (confirmed)

The 2,048 data bytes are **interleaved 8-bit RGB**, three consecutive bytes per
pixel: `pixel[i] = (data[3i], data[3i+1], data[3i+2])`. Evidence from the rainbow
export:

- Interleaved RGB gives 65.8 % fully saturated pixels (min channel `0`, max
  channel `255`) and a mean adjacent hue step of `0.118`. A planar R/G/B
  interpretation gives 0.5 % saturated and a hue step of `0.38`, so it is wrong.
- The frame's useful region repeats **exactly every 240 bytes** (= 80 pixels)
  for the first 1,552 bytes: `data[i] == data[i+240]` for 1,563 of 1,568
  positions. The 30-byte sub-blocks also repeat exactly every 8 blocks.
  This is the effect's own 80-pixel rainbow cycle, not a container feature.
- For this export 600–603 pixels are used (1,800–1,809 bytes); all bytes past
  that are zero/mask. The container capacity is `floor(2048 / 3) = 682` pixels
  per frame.

The byte order within the triple is RGB in file order; whether that maps to
R/G/B or a swapped order on the physical IC is still unconfirmed. The physical
wiring order of the 600-odd pixels is also unknown (the stored order is not a
simple left-to-right / top-to-bottom scan).

### What is confirmed vs. assumed

- Confirmed: magic, header size, big-endian frame count, 6-sector frames,
  40-sector zero trailer, per-file mask, 2,048 data bytes + 1,024 constant pad
  bytes per frame, `decoded = raw - mask`, and interleaved 8-bit RGB pixels.
- Unknown: how the mask is derived from the header salt; the physical pixel ->
  port / LED wiring order and the channel order on the IC; the `_rec.bin`
  recording relation (best correlation found was only ~80 %, so it is not a
  simple one-to-one view); the `0xC000` double-width variant.

## 4. Writer recipe (byte-exact interop)

1. Start from a known-good 512-byte header with the right controller/capacity
   code and its matching mask byte.
2. Write the logical frame count big-endian at `0x0C`.
3. For each frame, emit 3,072 bytes: `raw[i] = (decoded[i] + mask) mod 256`
   (subtraction model; use `decoded[i] ^ mask` if the XOR model is chosen).
4. Append 20,480 zero bytes.
5. Set the physical frame count so that `fileSize === 512 + 3072N + 20480`.

For pixel-level authoring, skip step 3's raw frames and call
`encodeLedEdit2014FromPixels({ header, mask, frames: rgbFrames })` instead. Each
`rgbFrame` is a flat `Uint8Array` of `pixelCount * 3` interleaved RGB bytes; the
codec fills the remaining data bytes and the 1,024-byte tail with zeros, then
applies the mask. `decodeFrameRgb(frame)` returns the inverse view. Both are
byte-exact on the rainbow export.

`src/engine/codecs/ledEdit2014Codec.ts` implements all of the above, plus
`decodeLedEdit2014` and a strict round-trip check. Verification is in §5.

## 5. Verification

Run:

```powershell
node --experimental-strip-types scripts/verify-lededit2014.mts "D:\ashish\Led\Controller-1\00_program1.led"
```

Expected for the original 1,203-frame reference:

```
magic ok, header 512 B, frames 1203/1203, mask 0x78 (sub), size 3716608
all frames decode to 3072 B; trailing 1024 B all zero: yes
re-encoded bytes identical: yes (3716608/3716608); xor model: yes
RGB pixel round-trip identical: yes (3716608/3716608, 2046 RGB bytes/frame)
```

Expected for the 114-frame rainbow export at
`D:\ashish\Program_1\_T_1000_AC\00_1.led`:

```
magic ok, header 512 B, frames 114/114, mask 0xb5 (sub), size 371200
all frames decode to 3072 B; trailing 1024 B all zero: yes
re-encoded bytes identical: yes (371200/371200); xor model: yes
RGB pixel round-trip identical: yes (371200/371200, 2046 RGB bytes/frame)
```

The verifier checks: header magic, frame-count field vs. physical frame count,
file-size identity, mask consistency across frames, zero tail after decoding, a
byte-for-byte re-encode comparison, and a decode→RGB→encode round-trip.

## 9. Recovered LED byte map (2026-11-24)

A 600-frame probe at 60 fps (`cal_single_rgb3.avi`) lights one LED at a time with
`R=255, G=191, B=128`. Each exported frame contains exactly three decoded bytes,
which directly reveals that LED's R/G/B byte offsets. The 809-frame export
`D:\ashish\singal-rgb\Led\Controller-1\00_singal-rgb.led` (mask `0xC9`) yielded
**526 of 600 LEDs**; the other 74 frames were dropped by LedEdit during real-time
recording and currently reuse the first recovered LEDs.

`src/engine/codecs/ledByteMap.ts` stores the 600 offsets, the 512-byte header and
mask `0xC9` from that export. `createRecoveredByteMapModel()` writes colour directly
to those offsets. The transfer from source RGB to decoded byte is identity and is
**approximate**: the probed LED decoded to `(255, 233, 82)` for a source of
`(255, 191, 129)`, so a mixed-colour sweep is still needed to pin the curve.
