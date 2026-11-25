import numpy as np

d = open(r'D:\ashish\calxy\Led\Controller-1\00_calxy.led', 'rb').read()
def dec(k):
    f = np.frombuffer(d[512+k*3072:512+(k+1)*3072], dtype=np.uint8).astype(int)
    return (f - 0x59) & 0xff
A = {k: dec(k) for k in [0, 1, 2, 3, 5, 6, 141, 389]}
pairs = {'R': (6, 0), 'G': (1, 2), 'B': (3, 5)}
for name, (gx, gy) in pairs.items():
    x, y = A[gx], A[gy]
    both = (x != 0) & (y != 0)
    sx = np.round(x[both] / 8).astype(int)
    sy = np.round(y[both] / 8).astype(int)
    print(name, 'both', int(both.sum()), 'sx', sx.min(), sx.max(), 'sy', sy.min(), sy.max())
    print('  sx common', sorted(set(sx.tolist()))[:6], sorted(set(sx.tolist()))[-6:])
    print('  sy common', sorted(set(sy.tolist()))[:6], sorted(set(sy.tolist()))[-6:])
    inr = (sx < 30) & (sy < 20)
    print('  in 30x20', int(inr.sum()))
