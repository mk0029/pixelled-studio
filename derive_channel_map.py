import collections, json
import numpy as np

p = r'D:\ashish\celibration\Led\Led\Controller-1\00_t-3.led'
d = open(p, 'rb').read()
def dec(k):
    f = np.frombuffer(d[512+k*3072:512+(k+1)*3072], dtype=np.uint8).astype(int)
    mask = collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
    return (f - mask) & 0xff

meta = json.load(open(r'D:\TOHRAN PROJECT\cal_channel_map.json'))['decoded']
src = [np.array([px[c] for px in meta[c]]) for c in range(3)]  # src[c][k]

pos = []
for c in range(3):
    a = dec(c)
    print('phase', c, 'nonzero', int((a!=0).sum()), 'src nonzero', int((src[c]!=0).sum()))
    P = np.where(a != 0)[0]
    order_pos = P[np.argsort(a[P], kind='stable')]
    order_led = np.argsort(src[c], kind='stable')
    m = np.full(600, -1, dtype=int)
    n = min(len(order_pos), len(order_led))
    m[order_led[:n]] = order_pos[:n]
    pos.append(m)

ok = (pos[0]>=0)&(pos[1]>=0)&(pos[2]>=0)
print('LEDs with all 3', ok.sum())
print('first 12 positions (R,G,B):', [(int(pos[0][k]), int(pos[1][k]), int(pos[2][k])) for k in range(12)])
print('pixel index match (P//3 equal):', int(((pos[0]//3)==(pos[1]//3)).sum()), int(((pos[0]//3)==(pos[2]//3)).sum()))
print('remainders R', sorted(set((pos[0][ok]%3).tolist())), 'G', sorted(set((pos[1][ok]%3).tolist())), 'B', sorted(set((pos[2][ok]%3).tolist())))

# validate reconstruction of all 3 exported frames
for c in range(3):
    a = dec(c)
    out = np.zeros(3072, dtype=int)
    for k in range(600):
        if pos[c][k] >= 0: out[pos[c][k]] = src[c][k]
    eq = int((out == a).sum())
    print('phase', c, 'reconstruction exact', eq, '/3072', 'mad', round(float(np.abs(out-a).mean()),2))
