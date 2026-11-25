from PIL import Image, ImageDraw
import io
import struct
import cv2

W, H, N, FPS = 240, 160, 32, 15

# Each 32x32 cell gets a unique (R,G) so LedEdit output reveals where every pixel went.
imgs = []
for i in range(N):
    im = Image.new('RGB', (W, H))
    d = ImageDraw.Draw(im)
    for y in range(32):
        y0, y1 = y * 5, (y + 1) * 5
        for x in range(32):
            x0, x1 = round(x * 7.5), round((x + 1) * 7.5)
            d.rectangle([x0, y0, x1 - 1, y1 - 1], fill=(x * 8, y * 8, 128))
    b = io.BytesIO()
    im.save(b, format='JPEG', quality=100, subsampling=0)
    imgs.append(b.getvalue())

jl = len(imgs[0])
us = 1000000 // FPS

def chunk(cid, data):
    out = cid + struct.pack('<I', len(data)) + data
    return out + (b'\0' if len(data) % 2 else b'')

def lst(typ, data):
    body = typ + data
    out = b'LIST' + struct.pack('<I', len(body)) + body
    return out + (b'\0' if len(body) % 2 else b'')

avih = struct.pack('<14I', us, jl * FPS, 0, 0x10, N, 0, 1, jl, W, H, 0, 0, 0, 0)
strh = (b'vids' + b'MJPG'
        + struct.pack('<IHHIIIIIIII', 0, 0, 0, 0, 1, FPS, 0, N, jl, 0xFFFFFFFF, 0)
        + struct.pack('<HHHH', 0, 0, W, H))
strf = struct.pack('<IiiHH4sIiiII', 40, W, H, 1, 24, b'MJPG', jl, 0, 0, 0, 0)
body = lst(b'hdrl', chunk(b'avih', avih) + lst(b'strl', chunk(b'strh', strh) + chunk(b'strf', strf)))

movi = b''
offs = []
for j in imgs:
    offs.append(4 + len(movi))
    movi += chunk(b'00dc', j)

idx = b''
for o in offs:
    idx += b'00dc' + struct.pack('<III', 0x10, o, jl)

body += lst(b'movi', movi) + chunk(b'idx1', idx)
avi = b'RIFF' + struct.pack('<I', len(body) + 4) + b'AVI ' + body

path = r'D:\TOHRAN PROJECT\test_gradient_32x32.avi'
open(path, 'wb').write(avi)
print(f'wrote {path} bytes={len(avi)} frames={N} jpeg={jl}')

cap = cv2.VideoCapture(path)
ok, fr = cap.read()
if ok:
    small = cv2.resize(fr, (32, 32), interpolation=cv2.INTER_AREA)
    print('decoded', int(cap.get(cv2.CAP_PROP_FRAME_COUNT)), 'frames;')
    print('cell(0,0) BGR', small[0, 0], 'cell(31,31) BGR', small[31, 31], 'cell(16,16) BGR', small[16, 16])
cap.release()
