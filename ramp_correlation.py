import collections, json
import numpy as np

def dec(path):
    d = open(path, 'rb').read()
    f = np.frombuffer(d[512:512+3072], dtype=np.uint8).astype(int)
    mask = collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
    return (f - mask) & 0xff, f, mask

base = r'D:\ashish\celibration\Led\Controller-1'
Rs, Rraw, Rm = dec(base + r'\red.led')
Gs, Graw, Gm = dec(base + r'\green.led')
Bs, Braw, Bm = dec(base + r'\blue.led')
print('masks', hex(Rm), hex(Gm), hex(Bm))
rpos = np.array([i for i,v in enumerate(Rs) if v != 0])
gpos = np.array([i for i,v in enumerate(Gs) if v != 0])
bpos = np.array([i for i,v in enumerate(Bs) if v != 0])
print('active counts', len(rpos), len(gpos), len(bpos))
print('raw at red active  ', [Rraw[i] for i in rpos[:10]])
print('raw at green active', [Graw[i] for i in gpos[:10]])
print('raw at blue active ', [Braw[i] for i in bpos[:10]])

root = r'D:\ashish\blue.v2\Led\Controller-1'
GR, GRraw, GRm = dec(root + r'\02_gray-v2.led')
RR, RRraw, RRm = dec(root + r'\00_red-v2.led')
BB, BBraw, BBm = dec(root + r'\01_blue.v2.led')
print('v2 masks', hex(GRm), hex(RRm), hex(BBm))

meta = json.load(open(r'D:\TOHRAN PROJECT\cal_ramp_grey.json'))['decoded']
src = np.array([p[0] for p in meta])
for label, arr, pos in [('grey@R', GR, rpos), ('grey@G', GR, gpos), ('grey@B', GR, bpos)]:
    vals = arr[pos]
    print(label, 'corr', round(float(np.corrcoef(vals, src)[0,1]), 4),
          'first20', vals[:20].tolist(), 'src', src[:20].tolist())
