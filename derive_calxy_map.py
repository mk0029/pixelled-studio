import json
import numpy as np

LXB = r'D:\ashish\celibration.Lxb'
LED = r'D:\ashish\cal-xy\Led\Controller-1\00_cal-xy.led'

b = open(LXB, 'rb').read()
coord = {}
for i in range(600):
    r = b[512+i*16:512+(i+1)*16]
    y = r[3] - 0xCD
    idx = (r[15] - 0xCD) & 0xFF
    for w in range(3):
        v = idx + 256*w
        if v >= y and (v - y) % 20 == 0:
            x = (v - y)//20
            if 0 <= x < 30:
                coord[i] = (x, y); break
by_xy = {v: i for i, v in coord.items()}

d = open(LED, 'rb').read()
def dec(k):
    return np.frombuffer(d[512+k*3072:512+(k+1)*3072], dtype=np.uint8).astype(int)
uniq = {}
for k in range((len(d)-20992)//3072):
    uniq.setdefault(d[512+k*3072:512+(k+1)*3072], []).append(k)
groups = sorted(uniq.items(), key=lambda kv: kv[1][0])
A = [dec(ids[0]) for _, ids in groups]
pairs = [(0,1),(2,3),(4,5)]  # R,G,B

maps=[]
for ci,(gx,gy) in enumerate(pairs):
    x,y=A[gx],A[gy]
    both=(x!=0)&(y!=0)
    posmap={}
    for i in np.where(both)[0]:
        sx=int(round(x[i]/8)); sy=int(round(y[i]/8))
        led=by_xy.get((sx,sy))
        if led is not None: posmap[int(i)]=led
    inv={}
    for p,l in posmap.items(): inv.setdefault(l,[]).append(p)
    maps.append(inv)
    errs=[abs(x[p]-coord[l][0]*8)+abs(y[p]-coord[l][1]*8) for p,l in posmap.items()]
    print('ch',ci,'active',int(both.sum()),'exact',len(posmap),'LEDs',len(inv),
          'multi',sum(len(v)>1 for v in inv.values()),
          'err median',int(np.median(errs)),'<=4',sum(e<=4 for e in errs))

out=[]
for inv in maps:
    arr=[None]*600
    for led,ps in inv.items():
        k=coord[led][1]*30+coord[led][0]
        arr[k]=ps[0]
    out.append(arr)
json.dump(out,open(r'D:\TOHRAN PROJECT\led_byte_map.json','w'))
print('missing',[sum(v is None for v in a) for a in out])
