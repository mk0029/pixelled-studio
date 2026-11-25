import collections
import json
import numpy as np

LXB = r'D:\ashish\celibration.Lxb'
LED = r'D:\ashish\singal-rgb\Led\Controller-1\00_singal-rgb.led'

b = open(LXB, 'rb').read()
coord = {}
for i in range(600):
    r = b[512+i*16:512+(i+1)*16]
    y = r[3]-0xCD
    idx = (r[15]-0xCD)&255
    for w in range(3):
        v = idx+256*w
        if v >= y and (v-y)%20 == 0:
            x = (v-y)//20
            if 0 <= x < 30:
                coord[i] = (x,y); break
by_xy = {v:k for k,v in coord.items()}
print('lxb coords', len(coord), 'unique xy', len(by_xy))

d = open(LED, 'rb').read()
def dec(k):
    f = np.frombuffer(d[512+k*3072:512+(k+1)*3072], dtype=np.uint8).astype(int)
    mask = collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
    return (f-mask)&0xff

trip=[]
for k in range(809):
    a=dec(k); nz=np.where(a!=0)[0]; vals=a[nz].tolist()
    trip.append((int(nz[vals.index(255)]), int(nz[vals.index(233)]), int(nz[vals.index(82)])))

# first 160 frames are LED k (unique in order) - verify formula pos = 3*i + c
for k in range(160):
    x,y = k%30, k//30
    i = by_xy[(x,y)]
    pred = 3*i
    obs = trip[k][0]
    if k < 12: print('k',k,'xy',(x,y),'lxb i',i,'3i',pred,'obs',obs,'diff',obs-pred)

diffs = [trip[k][0] - 3*by_xy[(k%30,k//30)] for k in range(160)]
print('diff distribution', collections.Counter(diffs))
