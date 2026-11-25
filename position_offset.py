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
    d = pos[b] - pos[a]
    print(a, b, 'diff top', collections.Counter(d.tolist()).most_common(10), 'unique', len(set(d.tolist())))
