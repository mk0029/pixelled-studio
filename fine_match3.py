import collections, json
import numpy as np

p = r'D:\ashish\cal-fine\Led\Controller-1\00_cal-fine.led'
d = open(p, 'rb').read()
def dec(k):
    f = np.frombuffer(d[512+k*3072:512+(k+1)*3072], dtype=np.uint8).astype(int)
    mask = collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
    return (f - mask) & 0xff
fr = [dec(k) for k in range(6)]
meta = json.load(open(r'D:\TOHRAN PROJECT\cal_fine_map.json'))['decoded']
fine = [np.array([px[c] for px in meta[2*c+1]], dtype=int) for c in range(3)]

for c in range(3):
    P = [i for i in range(3072) if fr[2*c][i] or fr[2*c+1][i]]
    order = sorted(P, key=lambda i: fr[2*c][i])
    rank = {pos: r for r, pos in enumerate(order)}
    errs = []
    for pos in P:
        vf = fr[2*c+1][pos]
        r = rank[pos]
        k_est = r * 600 / len(P)
        cand = [k for k in range(600) if abs(int(fine[c][k])-vf) <= 2]
        if not cand: continue
        k = min(cand, key=lambda k: abs(k - k_est))
        errs.append(abs(k - k_est))
    print('ch',c,'positions',len(P),'k_est err median',round(float(np.median(errs)),1),
          '<=5',sum(1 for e in errs if e<=5),'<=15',sum(1 for e in errs if e<=15))
