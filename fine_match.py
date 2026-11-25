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

stats = []
for c in range(3):
    pairs = []
    for pos in range(3072):
        vc, vf = fr[2*c][pos], fr[2*c+1][pos]
        if vc == 0 and vf == 0: continue
        best = sorted(range(600), key=lambda k: (abs(int(coarse[c][k])-vc) + abs(int(fine[c][k])-vf), abs(int(fine[c][k])-vf)))[:2]
        err = abs(int(coarse[c][best[0]])-vc) + abs(int(fine[c][best[0]])-vf)
        pairs.append((pos, vc, vf, best[0], best[1], err))
    errs = [x[5] for x in pairs]
    print('channel', c, 'positions', len(pairs), 'err median', int(np.median(errs)), 'max', max(errs),
          'err<=2', sum(1 for e in errs if e<=2), 'err<=5', sum(1 for e in errs if e<=5))
    print('  samples', [(x[0],x[1],x[2],x[3],x[4],x[5]) for x in pairs[:8]])
