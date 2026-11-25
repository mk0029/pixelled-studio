import collections, json, os
import numpy as np

p = r'D:\ashish\calxy\Led\Controller-1\00_calxy.led'
d = open(p, 'rb').read()
n = (len(d) - 20992) // 3072
print('size', len(d), 'frames', n)

def dec(k):
    f = np.frombuffer(d[512+k*3072:512+(k+1)*3072], dtype=np.uint8).astype(int)
    mask = collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
    return (f - mask) & 0xff, mask

uniq = {}
for k in range(n):
    uniq.setdefault(d[512+k*3072:512+(k+1)*3072], []).append(k)
print('unique frames', len(uniq))
groups = sorted(uniq.items(), key=lambda kv: kv[1][0])
for i, (raw, ids) in enumerate(groups[:10]):
    a, mask = dec(ids[0])
    nz = a[a != 0]
    print('group', i, 'ids', ids[:6], 'count', len(ids), 'mask', hex(mask),
          'nonzero', len(nz), 'unique', len(set(nz.tolist())),
          'sample', [(int(j), int(a[j])) for j in np.where(a != 0)[0][:8]])
