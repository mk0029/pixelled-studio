import collections
import numpy as np

d = open(r'D:\ashish\calxy\Led\Controller-1\00_calxy.led', 'rb').read()
def dec(k):
    f = np.frombuffer(d[512+k*3072:512+(k+1)*3072], dtype=np.uint8).astype(int)
    return (f - 0x59) & 0xff
A = [dec(k) for k in range(6)]
nz = np.array([[a[i] != 0 for a in A] for i in range(3072)])
print('nonzero count distribution', collections.Counter(nz.sum(axis=1).tolist()))
for i in [0, 1, 2, 3, 4, 5, 10, 100, 105, 1000]:
    print(i, nz[i].tolist(), [int(a[i]) for a in A])
# pair masks
for p in [(0,1),(1,2),(2,3),(3,4),(4,5),(5,0)]:
    both = int((nz[:,p[0]] & nz[:,p[1]]).sum())
    print('pair',p,'both',both)
