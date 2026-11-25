import collections
import numpy as np

root = r'D:\$RECYCLE.BIN\S-1-5-21-1788527993-1725293482-2949566873-1001'
r = open(root + r'\$RFZPO9I\_rec.bin', 'rb').read()
d = open(root + r'\$RFZPO9I\_T_1000_AC\00_1.led', 'rb').read()
m = collections.defaultdict(collections.Counter)
for k in range(114):
    sl = np.frombuffer(r[k * 24576:k * 24576 + 3072], dtype=np.uint8).astype(int)
    led = np.frombuffer(d[512 + k * 3072:512 + (k + 1) * 3072], dtype=np.uint8).astype(int)
    for a, b in zip(sl.tolist(), led.tolist()):
        m[a][b] += 1
single = {v: c.most_common(1)[0][0] for v, c in m.items() if len(c) == 1}
print('distinct rec', len(m), 'single-valued', len(single))
print('sample', sorted(single.items())[:40])
print('top by count:')
for rv in sorted(m, key=lambda v: -sum(m[v].values()))[:15]:
    print(' ', rv, m[rv].most_common(4), 'distinct', len(m[rv]))
