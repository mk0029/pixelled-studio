import collections
import numpy as np

p = r'D:\ashish\celibration\Led\Led\Controller-1\00_t-3.led'
d = open(p, 'rb').read()
def dec(k):
    f = np.frombuffer(d[512+k*3072:512+(k+1)*3072], dtype=np.uint8).astype(int)
    mask = collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
    return (f - mask) & 0xff
a0,a1,a2 = dec(0),dec(1),dec(2)

for x,y,xn,yn in [(a0,a1,'R','G'),(a0,a2,'R','B'),(a1,a2,'G','B')]:
    print('\n',xn,'->',yn)
    for off in range(-3,6):
        m = (x!=0)&(np.roll(y,-off)!=0)
        eq = (x[m]==np.roll(y,-off)[m]).sum()
        if eq or off in [1,2]:
            print(' off',off,'pairs',int(m.sum()),'equal',int(eq))
# direct check at +1 and +2 for R->G
for off in [1,2,-1,-2]:
    print('R[p] vs G[p+%d]'%off, [(int(a0[p]),int(a1[p+off])) for p in np.where(a0!=0)[0][:12] if 0<=p+off<3072])
