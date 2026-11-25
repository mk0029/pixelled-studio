"""32x32 LED-position probe: one export recovers every byte position.

Six-frame cycle (15 fps):
  R: x ramp, then y ramp
  G: x ramp, then y ramp
  B: x ramp, then y ramp
Value = coordinate * 8 (x,y in 0..31), so each pixel has a unique (x,y) pair.
"""
import io, json, os, struct
import cv2
import numpy as np
from PIL import Image

W = H = 32
N, FPS = 96, 15
OUT = r'D:\TOHRAN PROJECT'

def make_jpg(phase):
    channel, kind = divmod(phase, 2)
    arr = np.zeros((H, W, 3), dtype=np.uint8)
    vals = np.arange(32, dtype=np.uint8) * 8
    if kind == 0:
        arr[:, :, channel] = vals[None, :]
    else:
        arr[:, :, channel] = vals[:, None]
    b = io.BytesIO()
    Image.fromarray(arr).save(b, format='JPEG', quality=100, subsampling=0)
    return b.getvalue()

jpgs = [make_jpg(p) for p in range(6)]

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
    j = jpgs[i % 6]
    offs.append(4 + len(movi)); sizes.append(len(j))
    movi += chunk(b'00dc', j)
idx = b''.join(b'00dc' + struct.pack('<III', 0x10, o, s) for o, s in zip(offs, sizes))
body += lst(b'movi', movi) + chunk(b'idx1', idx)
avi = b'RIFF' + (len(body)+4).to_bytes(4, 'little') + b'AVI ' + body
path = os.path.join(OUT, 'cal_xy_map.avi')
with open(path, 'wb') as fh: fh.write(avi)

cap = cv2.VideoCapture(path)
decoded = []
while True:
    ok, fr = cap.read()
    if not ok: break
    fr = cv2.cvtColor(fr, cv2.COLOR_BGR2RGB)
    decoded.append(np.array([[int(x) for x in px] for px in fr.reshape(-1, 3)]).tolist())
cap.release()
with open(os.path.join(OUT, 'cal_xy_map.json'), 'w') as fh:
    json.dump({'w': W, 'h': H, 'frames': N, 'fps': FPS, 'decoded': decoded}, fh)
print(path, len(avi), 'bytes,', N, 'frames')
print('phase 0 first row:', decoded[0][:8])
print('phase 1 first col:', [decoded[1][y*W][0] for y in range(8)])
