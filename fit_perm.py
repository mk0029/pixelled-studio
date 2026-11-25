import collections
import numpy as np

L = r'D:\ashish\singal-rgb\Led\Controller-1\00_singal-rgb.led'
d = open(L, 'rb').read()
def dec(k):
    f = np.frombuffer(d[512+k*3072:512+(k+1)*3072], dtype=np.uint8).astype(int)
    mask = collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
    return (f-mask)&0xff
trip=[]
for k in range(809):
    a=dec(k); nz=np.where(a!=0)[0]; v=a[nz].tolist()
    trip.append((int(nz[v.index(255)]), int(nz[v.index(233)]), int(nz[v.index(82)])))

# first 160 frames unique in order -> LED k
for k in range(160):
    pass

# Try linear permutation: Rpos // 3 == (a*x + b*y + c) mod 600
pts = [(k%30, k//30, trip[k][0]) for k in range(160)]
best=[]
for a in range(600):
    for b in range(600):
        # solve c from first point assuming i0 = r//3
        i0 = pts[0][2]//3
        c = (i0 - a*pts[0][0] - b*pts[0][1]) % 600
        ok = 0
        for x,y,r in pts[:8]:
            if (a*x+b*y+c)%600 == r//3: ok+=1
        if ok == 8: best.append((a,b,c))
print('exact linear fits', best[:10], 'count', len(best))
