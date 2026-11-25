import collections
import numpy as np

p = r'D:\ashish\singal\Led\Controller-1\00_singal.led'
d = open(p, 'rb').read()
n = (len(d) - 20992) // 3072
print('size', len(d), 'frames', n)

def dec(k):
    f = np.frombuffer(d[512+k*3072:512+(k+1)*3072], dtype=np.uint8).astype(int)
    mask = collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
    return (f - mask) & 0xff
for k in [0, 1, 2, 3, 4, 5, 10, 50, n-1]:
    a = dec(k)
    nz = np.where(a != 0)[0]
    print('frame', k, 'mask', hex(collections.Counter(np.frombuffer(d[512+k*3072:512+(k+1)*3072],dtype=np.uint8).astype(int)[2048:].tolist()).most_common(1)[0][0]),
          'nz', len(nz), 'max', a.max(), 'top pos', nz[np.argsort(a[nz])[-6:]].tolist(), 'vals', a[nz[np.argsort(a[nz])[-6:]]].tolist())
