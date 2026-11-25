import collections
import numpy as np

p = r'D:\ashish\cal-rgb\Led\Controller-1\00_cal-rgb.led'
d = open(p, 'rb').read()
n = (len(d)-20992)//3072
print('size', len(d), 'frames', n)

def dec(k):
    f = np.frombuffer(d[512+k*3072:512+(k+1)*3072], dtype=np.uint8).astype(int)
    mask = collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
    return (f-mask)&0xff, mask

uniq={}
for k in range(n): uniq.setdefault(d[512+k*3072:512+(k+1)*3072],[]).append(k)
G=sorted(uniq.items(),key=lambda kv:kv[1][0])
print('unique', len(G))
for i,(raw,ids) in enumerate(G[:10]):
    a,mask=dec(ids[0]); nz=np.where(a!=0)[0]
    print('g',i,'ids',ids[:6],'count',len(ids),'mask',hex(mask),'nz',len(nz),
          'top',collections.Counter(a.tolist()).most_common(5),
          'firstpos',nz[:12].tolist())
