import collections
import numpy as np

p = r'D:\ashish\singal-rgb\Led\Controller-1\00_singal-rgb.led'
d = open(p, 'rb').read()
n = (len(d) - 20992) // 3072
print('frames', n)

def dec(k):
    f = np.frombuffer(d[512+k*3072:512+(k+1)*3072], dtype=np.uint8).astype(int)
    mask = collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
    return (f-mask)&0xff

trip = []
for k in range(n):
    a = dec(k)
    nz = np.where(a != 0)[0]
    vals = a[nz].tolist()
    if len(nz) == 3 and sorted(vals) == [82,233,255]:
        trip.append((int(nz[vals.index(255)]), int(nz[vals.index(233)]), int(nz[vals.index(82)])))
    else:
        trip.append(None)
print('valid frames', sum(t is not None for t in trip), 'invalid', sum(t is None for t in trip))

uniq = []
seen = {}
for k,t in enumerate(trip):
    if t is None: continue
    if t not in seen:
        seen[t] = len(uniq); uniq.append(t)
print('unique triplets', len(uniq))
print('first 20 unique', uniq[:20])
print('last 20 unique', uniq[-20:])

# per-frame unique index sequence first 120
seq = [seen[t] if t is not None else -1 for t in trip]
print('seq first 120', seq[:120])
print('seq around 590-620', seq[590:620])

# duplicates: frames whose triplet already seen before
dup_first = [k for k in range(n) if trip[k] is not None and seq[k] < k]
print('duplicate frames', len(dup_first), 'first 20', dup_first[:20])

# compare with earlier white export positions
import json
old = json.load(open(r'D:\TOHRAN PROJECT\led_positions.json'))
newset = set(p for t in uniq for p in t)
oldset = set(p for r in old for p in r)
print('new unique positions', len(newset), 'old', len(oldset), 'overlap', len(newset & oldset))
