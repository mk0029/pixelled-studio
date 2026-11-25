import collections
import numpy as np

d = open(r'D:\ashish\calxy\Led\Controller-1\00_calxy.led', 'rb').read()
def dec(k):
    f = np.frombuffer(d[512+k*3072:512+(k+1)*3072], dtype=np.uint8).astype(int)
    return (f - 0x59) & 0xff
A = {k: dec(k) for k in [0, 1, 2, 3, 5, 6]}
pairs = {'R': (6, 0), 'G': (1, 2), 'B': (3, 5)}
points = {}
for name, (gx, gy) in pairs.items():
    x, y = A[gx], A[gy]
    both = (x != 0) & (y != 0)
    for i in np.where(both)[0]:
        sx = int(round(x[i]/8)); sy = int(round(y[i]/8))
        sx = max(0, min(31, sx)); sy = max(0, min(31, sy))
        points.setdefault((sx, sy), []).append((name, int(i)))
xs = sorted(set(p[0] for p in points))
ys = sorted(set(p[1] for p in points))
print('unique points', len(points), 'x range', min(xs), max(xs), 'y range', min(ys), max(ys))
print('x set', xs)
print('y set', ys)
print('points per channel', collections.Counter(n for v in points.values() for n, _ in v))
# print rows
for sy in range(32):
    row = [('R' if any(n=='R' for n,_ in points.get((sx,sy),[])) else '.') +
           ('G' if any(n=='G' for n,_ in points.get((sx,sy),[])) else '.') +
           ('B' if any(n=='B' for n,_ in points.get((sx,sy),[])) else '.') if (sx,sy) in points else '   '
           for sx in range(32)]
    if ''.join(row).strip(' .'):
        print(f'{sy:02d}', ''.join(row))
