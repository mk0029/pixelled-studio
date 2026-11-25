import base64, json

uniq = json.load(open(r'D:\TOHRAN PROJECT\led_byte_map_full.json'))
known = len(uniq)
# Fill the 74 LEDs whose frames were dropped by using the nearest recovered LED.
positions = []
for k in range(600):
    src = uniq[k] if k < known else uniq[(k % known)]
    positions.append(src)

d = open(r'D:\ashish\singal-rgb\Led\Controller-1\00_singal-rgb.led', 'rb').read()
header_b64 = base64.b64encode(d[:512]).decode()

lines = [
    "/**",
    " * Byte positions recovered from LedEdit 2014 single-LED exports.",
    " *",
    f" * {known} of 600 LEDs were captured directly (each lit with R255 G191 B128);",
    " * the remaining slots reuse the first recovered LEDs because their frames",
    " * were dropped during real-time recording. Re-probe with",
    " * cal_single_rgb3.avi to replace them.",
    " *",
    " * Values are [R, G, B] byte offsets inside the 2,048-byte data sector.",
    " * Decoded byte 0 = off (raw = mask), 255 = full (raw = mask-1).",
    " */",
    "export const LED_MASK = 0xc9;",
    "",
    "/** Template header from the calibrated export; frame count is patched on write. */",
    f'export const LED_TEMPLATE_HEADER =\n  "{header_b64}";',
    "",
    f"export const RECOVERED_LED_COUNT = {known};",
    "",
    "export const LED_BYTE_MAP: ReadonlyArray<readonly [number, number, number]> = [",
]
for i, (r, g, b) in enumerate(positions):
    lines.append(f"  [{r}, {g}, {b}], // LED {i}")
lines.append("];")
lines.append("")
open(r'D:\TOHRAN PROJECT\src\engine\codecs\ledByteMap.ts', 'w').write("\n".join(lines) + "\n")
print('wrote ledByteMap.ts', len(positions), 'LEDs, recovered', known)
