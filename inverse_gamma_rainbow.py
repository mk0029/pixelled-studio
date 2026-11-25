import collections
import numpy as np

root = r'D:\$RECYCLE.BIN\S-1-5-21-1788527993-1725293482-2949566873-1001'
ledp = root + r'\$RFZPO9I\_T_1000_AC\00_1.led'
d = open(ledp, 'rb').read()
f = np.frombuffer(d[512:512 + 3072], dtype=np.uint8).astype(int)
mask = collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
dec = ((f - mask) & 0xff)[:1800]
for gamma in [1.8, 2.2, 2.4]:
    src = np.clip(np.round(255 * (dec / 255) ** gamma), 0, 255).astype(int)
    c = collections.Counter(src.tolist())
    print('gamma', gamma, 'top source values', c.most_common(12))
    print('  first 12 triples', [tuple(src[i:i+3]) for i in range(0, 36, 3)])
