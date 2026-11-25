import collections, os
import numpy as np

recp = r'D:\ashish\Program_1\_rec.bin'
ledp = r'D:\ashish\n2\Led\Controller-1\00_program1.led'
r = open(recp, 'rb').read()
d = open(ledp, 'rb').read()
print('rec size', len(r), 'frames', len(r) // 24576)
print('led size', len(d), 'frames', (len(d) - 20992) // 3072)
print('rec head', ' '.join(f'{x:02X}' for x in r[:32]))
print('rec pad count', collections.Counter(r[:24576]).most_common(4))

pairs = collections.defaultdict(collections.Counter)
for k in range(51):
    slab = r[k * 24576:(k + 1) * 24576]
    led = d[512 + k * 3072:512 + (k + 1) * 3072]
    mask = collections.Counter(led[2048:].tolist()).most_common(1)[0][0]
    dec = (led.astype(int) - mask) & 0xff
    # find active slice: slice with most non-pad
    for s in range(8):
        sl = slab[s * 3072:(s + 1) * 3072]
        if s == 0:
            for rv, dv in zip(sl.tolist(), dec.tolist()):
                pairs[rv][dv] += 1
print('distinct rec values', len(pairs))
print('rec -> most common decoded (top 25 by count):')
allp = sorted(((v, c.most_common(1)[0][0], sum(c.values())) for v, c in pairs.items()), key=lambda x: -x[2])[:25]
for rv, dv, n in allp:
    print(f'  {rv:3d} -> {dv:3d} (n={n})')
# single-valued mappings only
single = {v: c.most_common(1)[0][0] for v, c in pairs.items() if len(c) == 1}
print('single-valued rec values', len(single))
print(' sample', sorted(single.items())[:40])
