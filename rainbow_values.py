import collections
import numpy as np

p = r'D:\ashish\Led\Controller-1\00_program1.led'
d = open(p, 'rb').read()
n = (len(d) - 20992) // 3072
vals = collections.Counter()
for k in range(n):
    f = np.frombuffer(d[512 + k * 3072:512 + (k + 1) * 3072], dtype=np.uint8).astype(int)
    mask = collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
    vals.update(((f[:1800] - mask) & 0xff).tolist())
print('unique decoded values in 600 pixels:', sorted(vals.keys()))
print('top', vals.most_common(12))
