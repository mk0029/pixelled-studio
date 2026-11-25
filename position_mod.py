import collections
import numpy as np

p = r'D:\ashish\celibration\Led\Led\Controller-1\00_t-3.led'
d = open(p, 'rb').read()
def dec(k):
    f = np.frombuffer(d[512+k*3072:512+(k+1)*3072], dtype=np.uint8).astype(int)
    mask = collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
    return (f - mask) & 0xff
arr = [dec(k) for k in range(3)]
for c,a in enumerate(arr):
    P = np.where(a!=0)[0]
    print('\nphase',c,'count',len(P))
    for mod in [2,3,4,5,6,8]:
        print(' mod',mod,collections.Counter((P%mod).tolist()).most_common())
    print(' first 30',P[:30].tolist())
