import os, collections
import numpy as np

root = r'D:\BACKUP TORHAN SHOWS\orignal'
p = root + r'\00_program1 (69).led'
d = open(p, 'rb').read()
n = (len(d) - 20992) // 3072
vals = collections.Counter()
for k in range(n):
    f = np.frombuffer(d[512 + k * 3072:512 + (k + 1) * 3072], dtype=np.uint8).astype(int)
    mask = collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
    vals.update(((f[:1800] - mask) & 0xff).tolist())
print('frames', n, 'unique', len(vals))
for v in [128, 151, 174, 191, 82, 152, 153]:
    print(v, vals[v])
print('top', vals.most_common(20))
