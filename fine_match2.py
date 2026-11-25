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
coarse = [np.array([px[c] for px in meta[2*c]], dtype=int) for c in range(3)]
fine = [np.array([px[c] for px in meta[2*c+1]], dtype=int) for c in range(3)]

for c in range(3):
    cand_errs, final_errs, ambiguous = [], [], 0
    for pos in range(3072):
        vc, vf = fr[2*c][pos], fr[2*c+1][pos]
        if vc == 0 and vf == 0: continue
        cand = [k for k in range(600) if abs(int(fine[c][k])-vf) <= 3]
        if not cand: continue
        k = min(cand, key=lambda k: abs(int(coarse[c][k])-vc))
        cand_errs.append(min(abs(int(fine[c][k])-vf) for k in cand))
        final_errs.append(abs(int(coarse[c][k])-vc))
        if len(cand) > 3: ambiguous += 1
    print('ch', c, 'positions', len(final_errs), 'fine err<=1', sum(1 for e in cand_errs if e<=1),
          'coarse err median', int(np.median(final_errs)), '<=10', sum(1 for e in final_errs if e<=10),
          '>30', sum(1 for e in final_errs if e>30), 'wide cand', ambiguous)
