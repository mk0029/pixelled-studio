import collections, json
import numpy as np

p = r'D:\ashish\celibration\Led\Led\Controller-1\00_t-3.led'
d = open(p, 'rb').read()
def dec(k):
    f = np.frombuffer(d[512+k*3072:512+(k+1)*3072], dtype=np.uint8).astype(int)
    mask = collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
    return (f - mask) & 0xff

meta = json.load(open(r'D:\TOHRAN PROJECT\cal_channel_map.json'))['decoded']
src = [np.array([px[c] for px in meta[c]]) for c in range(3)]

for c in range(3):
    a = dec(c)
    pc, sc = collections.Counter(a.tolist()), collections.Counter(src[c].tolist())
    bad = [(v, pc[v], sc[v]) for v in range(256) if pc[v] != sc[v]]
    print('phase', c, 'value-count mismatches', len(bad), 'first', bad[:12])

# For phase 0, list first 30 LEDs' source values and candidate positions
a0, a1, a2 = dec(0), dec(1), dec(2)
pos_by_val = collections.defaultdict(list)
for i,v in enumerate(a0): pos_by_val[int(v)].append(i)
print('\nLED k : srcR : candidate R positions (first 30)')
for k in range(30):
    v = int(src[0][k])
    print(k, v, pos_by_val[v][:8], '...' if len(pos_by_val[v])>8 else '')
