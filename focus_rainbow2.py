import collections
import numpy as np

p = r'D:\ashish\Led\Controller-1\00_program1.led'
d = open(p, 'rb').read()
n = (len(d) - 20992) // 3072
for k in [0, 1, 2, 30, 60, 90, 115]:
    f = np.frombuffer(d[512 + k * 3072:512 + (k + 1) * 3072], dtype=np.uint8).astype(int)
    mask = collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
    dec = (f - mask) & 0xff
    print('\nframe', k, 'mask', hex(mask), 'top', collections.Counter(dec.tolist()).most_common(6))
    print(' first triples', [tuple(dec[i:i+3]) for i in range(0, 30, 3)])
    print(' triples 600..', [tuple(dec[i:i+3]) for i in range(600 * 3, 600 * 3 + 12, 3)])
