import collections
import numpy as np

p = r'D:\ashish\celibration\Led\Led\Controller-1\00_t-3.led'
d = open(p, 'rb').read()
def dec(k):
    f = np.frombuffer(d[512+k*3072:512+(k+1)*3072], dtype=np.uint8).astype(int)
    mask = collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
    return (f - mask) & 0xff
a0,a1,a2 = dec(0),dec(1),dec(2)

for off in range(-4,5):
    m = (a0!=0)&(np.roll(a2,-off)!=0)
    eq = (a0[m]==np.roll(a2,-off)[m]).sum()
    print('offset',off,'matched nonzero pairs',int(m.sum()),'equal',int(eq))

# positions by value for a0/a2, check alignment
nz0 = np.where(a0!=0)[0]; nz2 = np.where(a2!=0)[0]
print('nz0 count',len(nz0),'nz2 count',len(nz2))
print('offset distribution a2-a0 for nearest:', collections.Counter((nz2[np.searchsorted(nz2,nz0)] - nz0).tolist()).most_common(10))
