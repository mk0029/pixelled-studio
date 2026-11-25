import collections
import numpy as np

root = r'D:\$RECYCLE.BIN\S-1-5-21-1788527993-1725293482-2949566873-1001'
ledp = root + r'\$RFZPO9I\_T_1000_AC\00_1.led'
recp = root + r'\$RFZPO9I\_rec.bin'
d = open(ledp, 'rb').read()
r = open(recp, 'rb').read()
n = 114
m = collections.defaultdict(collections.Counter)
for k in range(n):
    sl = np.frombuffer(r[k * 24576:k * 24576 + 3072], dtype=np.uint8).astype(int)
    f = np.frombuffer(d[512 + k * 3072:512 + (k + 1) * 3072], dtype=np.uint8).astype(int)
    mask = collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
    dec = (f - mask) & 0xff
    for a, b in zip(sl.tolist(), dec.tolist()):
        m[a][b] += 1
print('distinct rec values', len(m))
for rv in sorted(m):
    c = m[rv]
    top = c.most_common(3)
    print(f' {rv:3d} -> {top} distinct={len(c)}')
