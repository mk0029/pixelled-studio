import collections
import numpy as np

d = open(r'D:\ashish\calxy\Led\Controller-1\00_calxy.led', 'rb').read()
def dec(k):
    f = np.frombuffer(d[512+k*3072:512+(k+1)*3072], dtype=np.uint8).astype(int)
    return (f - 0x59) & 0xff
A = [dec(k) for k in range(6)]
pairs = {'R': (1, 2), 'G': (3, 4), 'B': (5, 0)}
for name, (gx, gy) in pairs.items():
    x = A[gx]; y = A[gy]
    active = (x != 0) | (y != 0)
    sx = np.round(x[active] / 8).astype(int)
    sy = np.round(y[active] / 8).astype(int)
    print(name, 'active', int(active.sum()), 'sx range', sx.min(), sx.max(), 'sy range', sy.min(), sy.max())
    print('  sx vals', sorted(set(sx.tolist()))[:8], '...', sorted(set(sx.tolist()))[-8:])
    print('  sy vals', sorted(set(sy.tolist()))[:8], '...', sorted(set(sy.tolist()))[-8:])
    inrange = (sx < 30) & (sy < 20)
    print('  in 30x20', int(inrange.sum()), 'out', int((~inrange).sum()))
