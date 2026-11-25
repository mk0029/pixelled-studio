import collections, json, os
import numpy as np

base = r'D:\ashish\blue.v2\Led\Controller-1'
files = {'red': '00_red-v2.led', 'blue': '01_blue.v2.led', 'grey': '02_gray-v2.led'}
meta = {}
for name in files:
    p = os.path.join(r'D:\TOHRAN PROJECT', f'cal_ramp_{name}.json')
    meta[name] = json.load(open(p))['decoded']

for name, fn in files.items():
    p = os.path.join(base, fn)
    d = open(p, 'rb').read()
    n = (len(d) - 20992) // 3072
    print('\n===', name, fn, 'frames', n, 'size', len(d))
    print(' head32', ' '.join(f'{x:02X}' for x in d[:32]))
    uniq = []
    for k in range(n):
        f = d[512 + k * 3072:512 + (k + 1) * 3072]
        if f not in uniq:
            uniq.append(f)
    print(' unique frames', len(uniq))
    for k in [0, 1, n // 2, n - 1]:
        f = np.frombuffer(d[512 + k * 3072:512 + (k + 1) * 3072], dtype=np.uint8).astype(int)
        mask = collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
        dec = ((f - mask) & 0xff)
        c = collections.Counter(dec.tolist())
        print('  frame', k, 'mask', hex(mask), 'distinct', len(c), 'top', c.most_common(8))
        print('   first triples', [tuple(dec[i:i+3]) for i in range(0, 24, 3)])
