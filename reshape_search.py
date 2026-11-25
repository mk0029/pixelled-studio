import collections, json
import numpy as np
from PIL import Image

d = open(r'D:\ashish\blue.v2\Led\Controller-1\02_gray-v2.led','rb').read()
f = np.frombuffer(d[512:512+3072], dtype=np.uint8).astype(int)
mask = collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
dec = ((f - mask) & 0xff)
src = np.array([p[0] for p in json.load(open(r'D:\TOHRAN PROJECT\cal_ramp_grey.json'))['decoded']]).reshape(20,30)

plain = [(h, 3072//h) for h in [16,24,32,48,64,96,128,192]]
rgb = [(h, 1024//h) for h in [8,16,32,64,128]]
best = []
for mode, dims in [('plain', plain), ('rgb', rgb)]:
    for h,w in dims:
        if mode == 'plain':
            arr = dec.reshape(h,w).astype(float)
        else:
            arr = dec.reshape(h,w,3).mean(axis=2)
        ref = np.array(Image.fromarray(src.astype(np.uint8)).resize((w,h), Image.BILINEAR)).astype(float)
        for flip in range(4):
            t = ref
            if flip & 1: t = np.fliplr(t)
            if flip & 2: t = np.flipud(t)
            c = np.corrcoef(arr.ravel(), t.ravel())[0,1]
            best.append((abs(c), c, mode, h, w, flip))
best.sort(reverse=True)
for row in best[:12]:
    print(row)
