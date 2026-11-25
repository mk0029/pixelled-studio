import collections
import numpy as np

base = r'D:\ashish\celibration\Led\Controller-1'
def dec(name):
    b = open(f'{base}\\{name}.led', 'rb').read()
    f = np.frombuffer(b[512:512 + 3072], dtype=np.uint8).astype(int)
    mask = collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
    return (f - mask) & 0xff
pos = {n: np.array([i for i, v in enumerate(dec(n)) if v != 0]) for n in ['red', 'green', 'blue']}
for a, b in [('red','green'),('red','blue'),('green','blue')]:
    sa, sb = set(pos[a].tolist()), set(pos[b].tolist())
    print(a, b, 'set intersection', len(sa & sb))
for k in range(600):
    if pos['red'][k] == pos['green'][k] or pos['red'][k] == pos['blue'][k] or pos['green'][k] == pos['blue'][k]:
        print('collision at k', k, pos['red'][k], pos['green'][k], pos['blue'][k])
        if k > 30: break
