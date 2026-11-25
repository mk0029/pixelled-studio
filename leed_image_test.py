import collections, json
import numpy as np
from PIL import Image

root = r'D:\ashish\blue.v2\Led\Controller-1'
def dec(fn):
    d = open(root + '\\' + fn, 'rb').read()
    f = np.frombuffer(d[512:512+3072], dtype=np.uint8).astype(int)
    mask = collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
    return ((f - mask) & 0xff).reshape(32,32,3)

src = np.array([p[0] for p in json.load(open(r'D:\TOHRAN PROJECT\cal_ramp_grey.json'))['decoded']]).reshape(20,30).astype(float)
ref = src.copy()

for name, fn in [('grey','02_gray-v2.led'),('red','00_red-v2.led'),('blue','01_blue.v2.led')]:
    a = dec(fn)
    print('\n===', name)
    for mode, arr in [('mean3', a.mean(axis=2)), ('R', a[:,:,0].astype(float)), ('G', a[:,:,1].astype(float)), ('B', a[:,:,2].astype(float))]:
        best = None
        for k in range(8):
            t = ref
            if k & 1: t = np.fliplr(t)
            if k & 2: t = np.flipud(t)
            if k & 4: t = t.T
            a2 = arr[:20,:30] if k < 4 else arr[:20,:30]
            c = np.corrcoef(a2.ravel(), t.ravel())[0,1]
            if best is None or abs(c) > abs(best[1]): best = (k, c)
        print(' ', mode, 'best orient', best[0], 'corr', round(float(best[1]),3))
