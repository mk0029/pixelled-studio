import collections
import numpy as np

rec = np.frombuffer(open(r'D:\ashish\gray-v2\_rec.bin','rb').read()[:3072], dtype=np.uint8).astype(int)
d = open(r'D:\ashish\blue.v2\Led\Controller-1\02_gray-v2.led','rb').read()
ledraw = np.frombuffer(d[512:512+3072], dtype=np.uint8).astype(int)
mask = collections.Counter(ledraw[2048:].tolist()).most_common(1)[0][0]
dec = (ledraw - mask) & 0xff

print('mask', mask)
m = collections.defaultdict(collections.Counter)
for a,b in zip(rec.tolist(), dec.tolist()): m[a][b] += 1
print('distinct rec', len(m))
for rv in sorted(m)[:20]:
    print(' rec', rv, '->', m[rv].most_common(5))
print('...')
for rv in sorted(m)[-10:]:
    print(' rec', rv, '->', m[rv].most_common(5))
print('single-valued inputs', sum(1 for c in m.values() if len(c)==1), '/', len(m))
