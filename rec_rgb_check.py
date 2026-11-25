import collections
import numpy as np

root = r'D:\$RECYCLE.BIN\S-1-5-21-1788527993-1725293482-2949566873-1001'
r = open(root + r'\$RFZPO9I\_rec.bin', 'rb').read()
d = open(root + r'\$RFZPO9I\_T_1000_AC\00_1.led', 'rb').read()
for k in [0, 1, 50, 113]:
    sl = np.frombuffer(r[k * 24576:k * 24576 + 3072], dtype=np.uint8).astype(int)
    led = np.frombuffer(d[512 + k * 3072:512 + (k + 1) * 3072], dtype=np.uint8).astype(int)
    mask = collections.Counter(led[2048:].tolist()).most_common(1)[0][0]
    dec = ((led - mask) & 0xff)[:1800]
    print('\nframe', k)
    print(' REC  first triples', [tuple(sl[i:i+3]) for i in range(0, 36, 3)])
    print(' LED  first triples', [tuple(dec[i:i+3]) for i in range(0, 36, 3)])
