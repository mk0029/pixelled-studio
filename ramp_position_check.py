import collections, json, os
import numpy as np

base = r'D:\ashish\celibration\Led\Controller-1'
def dec(path):
    d = open(path, 'rb').read()
    f = np.frombuffer(d[512:512 + 3072], dtype=np.uint8).astype(int)
    mask = collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
    return (f - mask) & 0xff
pos = {n: set(i for i, v in enumerate(dec(f'{base}\\{n}.led')) if v != 0) for n in ['red', 'green', 'blue']}

root = r'D:\ashish\blue.v2\Led\Controller-1'
for name, fn, ch in [('red', '00_red-v2.led', 'red'), ('blue', '01_blue.v2.led', 'blue'), ('grey', '02_gray-v2.led', None)]:
    f = dec(os.path.join(root, fn))
    nz = set(i for i, v in enumerate(f) if v != 0)
    print('\n', name, 'nonzero', len(nz))
    if ch:
        print('  subset of solid', ch, len(nz & pos[ch]), '/', len(nz))
        for other in pos:
            if other != ch:
                print('  overlap with', other, len(nz & pos[other]))
    else:
        for c in pos:
            print('  overlap with', c, len(nz & pos[c]))
