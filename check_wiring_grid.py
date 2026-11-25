import collections
import numpy as np

base = r'D:\ashish\celibration\Led\Controller-1'
def dec(name):
    b = open(f'{base}\\{name}.led', 'rb').read()
    f = np.frombuffer(b[512:512 + 3072], dtype=np.uint8).astype(int)
    mask = collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
    return (f - mask) & 0xff
pos = {n: [i for i, v in enumerate(dec(n)) if v != 0] for n in ['red', 'green', 'blue']}
d = open(r'D:\ashish\Led\Controller-1\00_program1.led', 'rb').read()
f = np.frombuffer(d[512:512 + 3072], dtype=np.uint8).astype(int)
mask = collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
rain = ((f - mask) & 0xff)
tri = np.array([(rain[pos['red'][k]], rain[pos['green'][k]], rain[pos['blue'][k]]) for k in range(600)])
for c, name in enumerate('RGB'):
    g = tri[:, c].reshape(20, 30)
    print('\n', name, 'grid 20x30 (F=255, .=191):')
    for row in g:
        print(''.join('F' if v == 255 else '.' if v == 191 else '?' for v in row))
