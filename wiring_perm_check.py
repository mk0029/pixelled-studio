import collections
import numpy as np

base = r'D:\ashish\celibration\Led\Controller-1'
def dec(name):
    b = open(f'{base}\\{name}.led', 'rb').read()
    f = np.frombuffer(b[512:512 + 3072], dtype=np.uint8).astype(int)
    mask = collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
    return (f - mask) & 0xff
pos = {n: np.array([i for i, v in enumerate(dec(n)) if v != 0]) for n in ['red', 'green', 'blue']}
root = r'D:\$RECYCLE.BIN\S-1-5-21-1788527993-1725293482-2949566873-1001'
d = open(root + r'\$RFZPO9I\_T_1000_AC\00_1.led', 'rb').read()
f = np.frombuffer(d[512:512 + 3072], dtype=np.uint8).astype(int)
mask = collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
rain = ((f - mask) & 0xff)
for ch in ['red', 'green', 'blue']:
    vals = rain[pos[ch]]
    c = collections.Counter(vals.tolist())
    print(ch, 'zero', c[0], '255', c[255], 'other', 600 - c[0] - c[255], 'top', c.most_common(5))
