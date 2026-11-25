import collections, hashlib, json
import numpy as np

root = r'D:\ashish\blue.v2\Led\Controller-1'
def dec(path):
    d = open(path, 'rb').read()
    f = np.frombuffer(d[512:512+3072], dtype=np.uint8).astype(int)
    mask = collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
    return (f - mask) & 0xff, f, mask

pairs = [
    (root + r'\00_red-v2.led', r'D:\ashish\red-v2\_T_1000_AC\00_1.led'),
    (root + r'\01_blue.v2.led', r'D:\ashish\blue.v2\_T_1000_AC\00_1.led'),
    (root + r'\02_gray-v2.led', r'D:\ashish\gray-v2\_T_1000_AC\00_1.led'),
]
for a, b in pairs:
    ha = hashlib.md5(open(a,'rb').read()).hexdigest()
    hb = hashlib.md5(open(b,'rb').read()).hexdigest()
    print('same' if ha == hb else 'DIFF', a, b)

for name, fn in [('red','00_red-v2.led'),('blue','01_blue.v2.led'),('grey','02_gray-v2.led')]:
    d, raw, mask = dec(root + '\\' + fn)
    nz = d[d != 0]
    u = sorted(set(nz.tolist()))
    print('\n', name, 'mask', hex(mask), 'nonzero', len(nz), 'distinct', len(u))
    print(' sorted unique', u[:40], '...', u[-20:])
    print(' deciles', [int(np.percentile(nz, q)) for q in [0,10,25,50,75,90,100]])
