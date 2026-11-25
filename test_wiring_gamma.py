import collections
import numpy as np

base = r'D:\ashish\celibration\Led\Controller-1'
def dec(name):
    b = open(f'{base}\\{name}.led', 'rb').read()
    f = np.frombuffer(b[512:512 + 3072], dtype=np.uint8).astype(int)
    mask = collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
    return (f - mask) & 0xff
pos = {n: [i for i, v in enumerate(dec(n)) if v != 0] for n in ['red', 'green', 'blue']}

# block export
p = r'D:\ashish\n2\Led\Controller-1\00_program1.led'
d = open(p, 'rb').read()
f = np.frombuffer(d[512:512 + 3072], dtype=np.uint8).astype(int)
mask = collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
actual = ((f - mask) & 0xff)

for gamma in [1.0, 1.8, 2.2, 2.4]:
    out = np.zeros(3072, dtype=int)
    for by in range(20):
        for bx in range(30):
            k = by * 30 + bx
            for c, ch in enumerate(['red', 'green', 'blue']):
                v = (bx * 8, by * 12, 128)[c]
                out[pos[ch][k]] = round(255 * (v / 255) ** (1 / gamma))
    eq = (out == actual).sum()
    mad = np.abs(out - actual).mean()
    print('gamma', gamma, 'exact', eq, '/3072', 'mad', round(mad, 2), 'first16', out[:16].tolist(), 'actual', actual[:16].tolist())
