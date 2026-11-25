"""One 3-frame AVI: LED k is R if k%3==0, G if k%3==1, B if k%3==2.
Labels one channel byte per LED; the other two are the neighbouring solid bytes.
"""
import io, os, struct
from PIL import Image, ImageDraw

W, H, BW, BH, COLS, ROWS = 240, 160, 8, 8, 30, 20
N, FPS = 3, 1
OUT = r'D:\TOHRAN PROJECT'

def make_jpg():
    im = Image.new('RGB', (W, H), (0, 0, 0))
    d = ImageDraw.Draw(im)
    for k in range(COLS*ROWS):
        row, col = divmod(k, COLS)
        rgb = [(255,0,0), (0,255,0), (0,0,255)][k % 3]
        d.rectangle([col*BW, row*BH, (col+1)*BW-1, (row+1)*BH-1], fill=rgb)
    b = io.BytesIO()
    im.save(b, format='JPEG', quality=100, subsampling=0)
    return b.getvalue()

jpg = make_jpg(); jpgs = [jpg]*N

def chunk(cid, data):
    out = cid + len(data).to_bytes(4,'little') + data
    return out + (b'\0' if len(data)%2 else b'')

def lst(typ, data):
    body = typ + data
    out = b'LIST' + len(body).to_bytes(4,'little') + body
    return out + (b'\0' if len(body)%2 else b'')

us = 1000000//FPS
jl = len(jpg)
avih = struct.pack('<14I', us, jl*FPS, 0, 0x10, N, 0, 1, jl, W, H, 0,0,0,0)
strh = (b'vids'+b'MJPG'+struct.pack('<IHHIIIIIIII',0,0,0,0,1,FPS,0,N,jl,0xFFFFFFFF,0)
        +struct.pack('<HHHH',0,0,W,H))
strf = struct.pack('<IiiHH4sIiiII',40,W,H,1,24,b'MJPG',jl,0,0,0,0)
body = lst(b'hdrl', chunk(b'avih',avih)+lst(b'strl',chunk(b'strh',strh)+chunk(b'strf',strf)))
movi, offs, sizes = b'', [], []
for j in jpgs:
    offs.append(4+len(movi)); sizes.append(len(j)); movi += chunk(b'00dc', j)
idx = b''.join(b'00dc'+struct.pack('<III',0x10,o,s) for o,s in zip(offs,sizes))
body += lst(b'movi', movi)+chunk(b'idx1', idx)
avi = b'RIFF'+(len(body)+4).to_bytes(4,'little')+b'AVI '+body
path = os.path.join(OUT,'cal_rgb_mod3.avi')
open(path,'wb').write(avi)
print(path, len(avi), 'bytes')
