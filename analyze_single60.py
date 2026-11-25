import collections
import numpy as np

p = r'D:\ashish\singal-60\Led\Controller-1\00_singal-60.led'
d = open(p, 'rb').read()
n = (len(d)-20992)//3072
print('size', len(d), 'frames', n)

def dec(k):
    f = np.frombuffer(d[512+k*3072:512+(k+1)*3072], dtype=np.uint8).astype(int)
    mask = collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
    return (f-mask)&0xff, mask, f

for k in [0,1,2,3,4,5,96,97,599,600,607,900]:
    a,mask,f = dec(k)
    nz = np.where(a!=0)[0]
    print('frame',k,'mask',hex(mask),'nz',len(nz),
          [(int(i), int(a[i]), int(f[i])) for i in nz])
