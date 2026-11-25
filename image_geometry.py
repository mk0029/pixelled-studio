import collections, json
import numpy as np
from PIL import Image

d = open(r'D:\ashish\blue.v2\Led\Controller-1\02_gray-v2.led','rb').read()
f = np.frombuffer(d[512:512+3072], dtype=np.uint8).astype(int)
mask = collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
dec = ((f - mask) & 0xff).reshape(32,32,3)
src = np.array([p[0] for p in json.load(open(r'D:\TOHRAN PROJECT\cal_ramp_grey.json'))['decoded']]).reshape(20,30)

ref = np.flipud(np.array(Image.fromarray(src.astype(np.uint8)).resize((32,32), Image.BILINEAR)).astype(float))
print('per-channel corr with flipped ref:')
for c,n in enumerate('RGB'):
    print(' ', n, round(float(np.corrcoef(dec[:,:,c].ravel(), ref.ravel())[0,1]),3))
print('mean3', round(float(np.corrcoef(dec.mean(axis=2).ravel(), ref.ravel())[0,1]),3))

# Try exact 20x30 subregion inside 32x32 with offsets
for dy in range(13):
    for dx in range(3):
        arr = dec[dy:dy+20, dx:dx+30].mean(axis=2)
        c = np.corrcoef(arr.ravel(), src.ravel())[0,1]
        if c > 0.5:
            print('crop dy',dy,'dx',dx,'corr',round(float(c),3))
