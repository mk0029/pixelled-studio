import collections, json, os
import numpy as np

p = r'D:\ashish\cal-fine\Led\Controller-1\00_cal-fine.led'
d = open(p, 'rb').read()
n = (len(d) - 20992) // 3072
print('size', len(d), 'frames', n)

def dec(k):
    f = np.frombuffer(d[512+k*3072:512+(k+1)*3072], dtype=np.uint8).astype(int)
    mask = collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
    return (f - mask) & 0xff, mask

uniq = {}
for k in range(n):
    raw = d[512+k*3072:512+(k+1)*3072]
    uniq.setdefault(raw, []).append(k)
print('unique frames', len(uniq))

meta = json.load(open(r'D:\TOHRAN PROJECT\cal_fine_map.json'))['decoded']
sigs = []
for ph in range(6):
    ch, kind = divmod(ph, 2)
    arr = np.array([px[ch] for px in meta[ph]])
    sigs.append(np.sort(arr[arr != 0]))

for i, (raw, ids) in enumerate(sorted(uniq.items(), key=lambda kv: -len(kv[1]))):
    a, mask = dec(ids[0])
    nz = np.sort(a[a != 0])
    scores = []
    for ph in range(6):
        m = min(len(nz), len(sigs[ph]))
        scores.append(round(float(np.abs(nz[:m] - sigs[ph][:m]).mean()), 1))
    print('group', i, 'ids', ids[:6], 'count', len(ids), 'mask', hex(mask),
          'nonzero', int((a!=0).sum()), 'scores', scores, 'phase', int(np.argmin(scores)))
