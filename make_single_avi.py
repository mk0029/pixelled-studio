"""Definitive probe: 600 frames, LED k white in frame k, everything else black.

One LedEdit export gives the exact R/G/B byte positions of every LED.
"""
import io, json, os, struct
import numpy as np
from PIL import Image, ImageDraw

W, H, BW, BH, COLS, ROWS = 240, 160, 8, 8, 30, 20
N, FPS = 600, 15
OUT = r'D:\TOHRAN PROJECT'

def make_jpg(k):
    im = Image.new('RGB', (W, H), (0, 0, 0))
    d = ImageDraw.Draw(im)
    row, col = divmod(k, COLS)
    d.rectangle([col*BW, row*BH, (col+1)*BW-1, (row+1)*BH-1], fill=(255, 255, 255))
    b = io.BytesIO()
    im.save(b, format='JPEG', quality=100, subsampling=0)
    return b.getvalue()

jpgs = [make_jpg(k) for k in range(N)]

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
strh = (b'vids' + b'MJPG' + struct.pack('<IHHIIIIIIII', 0,0,0,0,1,FPS,0,N,jl,0xFFFFFFFF,0)
        + struct.pack('<HHHH', 0,0,W,H))
strf = struct.pack('<IiiHH4sIiiII', 40, W, H, 1, 24, b'MJPG', jl, 0,0,0,0)
body = lst(b'hdrl', chunk(b'avih', avih) + lst(b'strl', chunk(b'strh', strh) + chunk(b'strf', strf)))
movi, offs, sizes = b'', [], []
for i, j in enumerate(jpgs):
    offs.append(4+len(movi)); sizes.append(len(j))
    movi += chunk(b'00dc', j)
idx = b''.join(b'00dc' + struct.pack('<III', 0x10, o, s) for o,s in zip(offs, sizes))
body += lst(b'movi', movi) + chunk(b'idx1', idx)
avi = b'RIFF' + (len(body)+4).to_bytes(4,'little') + b'AVI ' + body
path = os.path.join(OUT, 'cal_single.avi')
with open(path, 'wb') as fh: fh.write(avi)
json.dump({'cols':COLS,'rows':ROWS,'frames':N,'fps':FPS},
          open(os.path.join(OUT,'cal_single.json'),'w'))
print(path, len(avi), 'bytes,', N, 'frames')
