import collections
import numpy as np

p = r'D:\ashish\nnn\Led\Controller-1\00_program1.led'
d = open(p, 'rb').read()
n = (len(d) - 20992) // 3072
print('frames', n)
for k in [0, 1, 20, 50, n - 1]:
    f = np.frombuffer(d[512 + k * 3072:512 + (k + 1) * 3072], dtype=np.uint8).astype(int)
    mask = collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
    dec = (f - mask) & 0xff
    print('\nframe', k, 'mask', hex(mask), 'top', collections.Counter(dec.tolist()).most_common(6))
    print(' first triples', [tuple(dec[i:i+3]) for i in range(0, 36, 3)])
