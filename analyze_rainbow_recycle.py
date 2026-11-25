import collections
import numpy as np

root = r'D:\$RECYCLE.BIN\S-1-5-21-1788527993-1725293482-2949566873-1001'
ledp = root + r'\$RFZPO9I\_T_1000_AC\00_1.led'
recp = root + r'\$RFZPO9I\_rec.bin'
d = open(ledp, 'rb').read()
r = open(recp, 'rb').read()
n = (len(d) - 20992) // 3072
print('LED frames', n, 'REC frames', len(r) // 24576)
vals = collections.Counter()
for k in range(n):
    f = np.frombuffer(d[512 + k * 3072:512 + (k + 1) * 3072], dtype=np.uint8).astype(int)
    mask = collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
    vals.update(((f[:1800] - mask) & 0xff).tolist())
print('unique decoded values', len(vals))
print('sorted values', sorted(vals.keys()))
for s in range(8):
    sl = np.frombuffer(r[s * 3072:(s + 1) * 3072], dtype=np.uint8)
    print('REC slice', s, 'top', collections.Counter(sl.tolist()).most_common(5), 'min', sl.min(), 'max', sl.max())
