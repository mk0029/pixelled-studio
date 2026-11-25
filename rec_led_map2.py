import collections
import numpy as np

recp = r'D:\ashish\Program_1\_rec.bin'
ledp = r'D:\ashish\n2\Led\Controller-1\00_program1.led'
r = open(recp, 'rb').read()
d = open(ledp, 'rb').read()
pairs = collections.defaultdict(collections.Counter)
for k in range(51):
    slab = np.frombuffer(r[k * 24576:(k + 1) * 24576], dtype=np.uint8).astype(int)
    led = np.frombuffer(d[512 + k * 3072:512 + (k + 1) * 3072], dtype=np.uint8).astype(int)
    mask = collections.Counter(led[2048:].tolist()).most_common(1)[0][0]
    dec = (led - mask) & 0xff
    sl = slab[:3072]
    for rv, dv in zip(sl.tolist(), dec.tolist()):
        pairs[rv][dv] += 1
print('distinct rec values', len(pairs))
allp = sorted(((v, c.most_common(1)[0][0], sum(c.values()), len(c)) for v, c in pairs.items()), key=lambda x: -x[2])[:30]
print('rec -> decoded (top by count):')
for rv, dv, n, nd in allp:
    print(f'  {rv:3d} -> {dv:3d} n={n} distinctOut={nd} top={pairs[rv].most_common(3)}')
single = {v: c.most_common(1)[0][0] for v, c in pairs.items() if len(c) == 1}
print('single-valued rec values', len(single))
print(' sorted sample', sorted(single.items())[:60])
