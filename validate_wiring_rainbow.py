import collections
import numpy as np

base = r'D:\ashish\celibration\Led\Controller-1'
def dec(name):
    b = open(f'{base}\\{name}.led', 'rb').read()
    f = np.frombuffer(b[512:512 + 3072], dtype=np.uint8).astype(int)
    mask = collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
    return (f - mask) & 0xff
pos = {n: [i for i, v in enumerate(dec(n)) if v != 0] for n in ['red', 'green', 'blue']}

root = r'D:\$RECYCLE.BIN\S-1-5-21-1788527993-1725293482-2949566873-1001'
d = open(root + r'\$RFZPO9I\_T_1000_AC\00_1.led', 'rb').read()
for k in [0, 1, 50, 113]:
    f = np.frombuffer(d[512 + k * 3072:512 + (k + 1) * 3072], dtype=np.uint8).astype(int)
    mask = collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
    rain = ((f - mask) & 0xff)
    tri = np.array([(rain[pos['red'][j]], rain[pos['green'][j]], rain[pos['blue'][j]]) for j in range(600)])
    sat = sum(1 for t in tri if 0 in t and 255 in t)
    print('frame', k, 'saturated', sat, '/600', 'distinct', len(set(map(tuple, tri.tolist()))))
    print('  first', [tuple(t) for t in tri[:10]])
