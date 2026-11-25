"""One AVI with three channel ramps; a single LedEdit export reveals every LED byte position.

Frame pattern repeats every 3 frames:
  0: R = round(k*255/599), G=0, B=0
  1: G = round(k*255/599), R=0, B=0
  2: B = round(k*255/599), R=0, G=0
LED k = row*30+col, row-major, 8x8 px per LED (240x160).
"""
import io, json, os, struct
import cv2, numpy as np
from PIL import Image, ImageDraw

W, H, BW, BH, COLS, ROWS = 240, 160, 8, 8, 30, 20
N, FPS = 96, 15
OUT = r'D:\TOHRAN PROJECT'

ramp = [round(k * 255 / (COLS * ROWS - 1)) for k in range(COLS * ROWS)]

def make_frame(phase):
    im = Image.new('RGB', (W, H))
    d = ImageDraw.Draw(im)
    for k in range(COLS * ROWS):
        row, col = divmod(k, COLS)
        rgb = (ramp[k], 0, 0) if phase == 0 else ((0, ramp[k], 0) if phase == 1 else (0, 0, ramp[k]))
        d.rectangle([col*BW, row*BH, (col+1)*BW-1, (row+1)*BH-1], fill=rgb)
    b = io.BytesIO()
    im.save(b, format='JPEG', quality=100, subsampling=0)
    return b.getvalue()

jpgs = [make_frame(p) for p in range(3)]

def chunk(cid, data):
    out = cid + len(data).to_bytes(4, 'little') + data
    return out + (b'\0' if len(data) % 2 else b'')

def lst(typ, data):
    body = typ + data
    out = b'LIST' + len(body).to_bytes(4, 'little') + body
    return out + (b'\0' if len(body) % 2 else b'')

us = 1000000 // FPS
jl = max(len(j) for j in jpgs)
avih = struct.pack('<14I', us, jl*FPS, 0, 0x10, N, 0, 1, jl, W, H, 0, 0, 0, 0)
strh = (b'vids' + b'MJPG'
        + struct.pack('<IHHIIIIIIII', 0, 0, 0, 0, 1, FPS, 0, N, jl, 0xFFFFFFFF, 0)
        + struct.pack('<HHHH', 0, 0, W, H))
strf = struct.pack('<IiiHH4sIiiII', 40, W, H, 1, 24, b'MJPG', jl, 0, 0, 0, 0)
body = lst(b'hdrl', chunk(b'avih', avih) + lst(b'strl', chunk(b'strh', strh) + chunk(b'strf', strf)))
movi, offs, sizes = b'', [], []
for i in range(N):
    jpg = jpgs[i % 3]
    offs.append(4 + len(movi)); sizes.append(len(jpg))
    movi += chunk(b'00dc', jpg)
idx = b''.join(b'00dc' + struct.pack('<III', 0x10, o, s) for o, s in zip(offs, sizes))
body += lst(b'movi', movi) + chunk(b'idx1', idx)
avi = b'RIFF' + (len(body)+4).to_bytes(4, 'little') + b'AVI ' + body
path = os.path.join(OUT, 'cal_channel_map.avi')
with open(path, 'wb') as fh: fh.write(avi)

# decoded exact LED values per phase after JPEG
cap = cv2.VideoCapture(path)
decoded = []
while True:
    ok, fr = cap.read()
    if not ok: break
    fr = cv2.cvtColor(fr, cv2.COLOR_BGR2RGB)
    vals = []
    for k in range(COLS * ROWS):
        row, col = divmod(k, COLS)
        patch = fr[row*BH:(row+1)*BH, col*BW:(col+1)*BW]
        vals.append([int(x) for x in np.median(patch.reshape(-1, 3), axis=0)])
    decoded.append(vals)
cap.release()
meta = {'cols': COLS, 'rows': ROWS, 'frames': N, 'fps': FPS, 'decoded': decoded}
with open(os.path.join(OUT, 'cal_channel_map.json'), 'w') as fh: json.dump(meta, fh)
print(path, len(avi), 'bytes,', N, 'frames')
print('phase decoded first/last LED:', decoded[0][0], decoded[0][-1], decoded[1][0], decoded[2][0])
