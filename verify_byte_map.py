import base64, re
import numpy as np

src = open(r'D:\TOHRAN PROJECT\src\engine\codecs\ledByteMap.ts').read()
body = src.split('LED_BYTE_MAP: ReadonlyArray<readonly [number, number, number]> = [', 1)[1].split('];', 1)[0]
pos = [tuple(map(int, m)) for m in re.findall(r'\[(\d+), (\d+), (\d+)\]', body)]
print('LEDs', len(pos), 'unique positions', len(set(p for t in pos for p in t)))
header_b64 = re.search(r'LED_TEMPLATE_HEADER =\s*\n\s*"([^"]+)"', src).group(1)
header = base64.b64decode(header_b64)
print('header', len(header), 'magic', header[:8].hex(), 'declared frames', (header[0x0c] << 8) | header[0x0d])

MASK = 0xc9
FRAME = 3072
frame = np.full(FRAME, MASK, dtype=int)
rgb = (255, 191, 128)
for r, g, b in pos:
    frame[r] = (rgb[0] + MASK) & 255
    frame[g] = (rgb[1] + MASK) & 255
    frame[b] = (rgb[2] + MASK) & 255
dec = (frame - MASK) & 255
print('red', sum(1 for r, g, b in pos if dec[r] == 255),
      'green', sum(1 for r, g, b in pos if dec[g] == 191),
      'blue', sum(1 for r, g, b in pos if dec[b] == 128),
      'tailmask', int((frame[2048:] == MASK).sum()))

real = open(r'D:\ashish\singal-rgb\Led\Controller-1\00_singal-rgb.led', 'rb').read()
real_dec = (np.frombuffer(real[512:512+FRAME], dtype=np.uint8).astype(int) - MASK) & 255
print('real frame0 active', int((real_dec != 0).sum()), 'our active', int((dec != 0).sum()))
realpos = np.where(real_dec != 0)[0]
print('real positions match LED0 map?', realpos.tolist() == sorted(pos[0]))
print('real decoded at LED0 positions', [int(real_dec[p]) for p in pos[0]])
