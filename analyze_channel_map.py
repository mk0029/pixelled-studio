import collections, json, os
import numpy as np

p = r'D:\ashish\celibration\Led\Led\Controller-1\00_t-3.led'
d = open(p, 'rb').read()
n = (len(d) - 20992) // 3072
print('size', len(d), 'frames', n)

def dec(k):
    f = np.frombuffer(d[512 + k*3072:512 + (k+1)*3072], dtype=np.uint8).astype(int)
    mask = collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
    return (f - mask) & 0xff, mask

# unique frames by raw bytes
uniq = {}
for k in range(n):
    raw = d[512+k*3072:512+(k+1)*3072]
    uniq.setdefault(raw, []).append(k)
print('unique frames', len(uniq))
for i, (raw, ids) in enumerate(sorted(uniq.items(), key=lambda kv: -len(kv[1]))[:12]):
    a, mask = dec(ids[0])
    c = collections.Counter(a.tolist())
    print(' group', i, 'count', len(ids), 'ids', ids[:6], 'mask', hex(mask),
          'nonzero', int((a!=0).sum()), 'distinct', len(c), 'top', c.most_common(6))

meta = json.load(open(r'D:\TOHRAN PROJECT\cal_channel_map.json'))['decoded']
sigs = [np.sort(np.array([px[ph] for px in meta[ph]])) for ph in range(3)]
for raw, ids in sorted(uniq.items(), key=lambda kv: -len(kv[1]))[:12]:
    a, _ = dec(ids[0])
    nz = np.sort(a[a != 0])
    scores = []
    for ph in range(3):
        m = min(len(nz), len(sigs[ph]))
        scores.append(round(float(np.abs(nz[:m] - sigs[ph][:m]).mean()), 1))
    print(' group ids', ids[:3], 'phase scores', scores)
