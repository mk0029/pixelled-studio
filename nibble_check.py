import collections
import numpy as np

root = r'D:\ashish\blue.v2\Led\Controller-1'
def dec(fn):
    d = open(root + '\\' + fn, 'rb').read()
    f = np.frombuffer(d[512:512 + 3072], dtype=np.uint8).astype(int)
    mask = collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
    return (f - mask) & 0xff
for fn in ['02_gray-v2.led', '00_red-v2.led', '01_blue.v2.led']:
    d = dec(fn)
    nz = d[d != 0]
    hi, lo = nz >> 4, nz & 15
    print(fn, 'nonzero', len(nz), 'hi==lo', (hi == lo).sum(), 'hi==0', (hi == 0).sum(), 'lo==0', (lo == 0).sum())
    print('  top', collections.Counter(nz.tolist()).most_common(12))
