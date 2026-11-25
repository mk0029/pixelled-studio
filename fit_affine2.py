import itertools
import numpy as np

LXB = r'D:\ashish\celibration.Lxb'
LED = r'D:\ashish\cal-xy\Led\Controller-1\00_cal-xy.led'

b = open(LXB, 'rb').read()
coord=[]
for i in range(600):
    r=b[512+i*16:512+(i+1)*16]
    y=r[3]-0xCD; idx=(r[15]-0xCD)&255
    for w in range(3):
        v=idx+256*w
        if v>=y and (v-y)%20==0:
            x=(v-y)//20
            if 0<=x<30: coord.append((x,y)); break
coord=np.array(coord)

d=open(LED,'rb').read()
def dec(k): return np.frombuffer(d[512+k*3072:512+(k+1)*3072],dtype=np.uint8).astype(int)
uniq={}
for k in range((len(d)-20992)//3072): uniq.setdefault(d[512+k*3072:512+(k+1)*3072],[]).append(k)
G=sorted(uniq.items(),key=lambda kv:kv[1][0]); A=[dec(ids[0]) for _,ids in G]
pts=[]
for gx,gy in [(0,1),(2,3),(4,5)]:
    x,y=A[gx],A[gy]
    for i in np.where((x!=0)&(y!=0))[0]:
        pts.append((int(round(x[i]/8)),int(round(y[i]/8))))
pts=np.array(pts)
print('pts',len(pts),'unique',len(set(map(tuple,pts))))

best=[]
for fx in [0,1]:
  for fy in [0,1]:
    xb = coord[:,0] if fx==0 else 29-coord[:,0]
    yb = coord[:,1] if fy==0 else 19-coord[:,1]
    for ax in [30/32,31/31,32/30,1.0,30/31,31/30]:
      for ay in [20/32,19/31,32/20,1.0,20/31,19/20]:
        for ox in range(0,3):
          for oy in range(0,3):
            xs=np.round(xb*ax+ox).astype(int); ys=np.round(yb*ay+oy).astype(int)
            key={}
            for i,(a,bv) in enumerate(zip(xs.tolist(),ys.tolist())): key.setdefault((a,bv),i)
            hits=sum(1 for p in pts if tuple(p) in key)
            uniqled=len({key[tuple(p)] for p in pts if tuple(p) in key})
            best.append((hits,uniqled,fx,fy,round(ax,3),round(ay,3),ox,oy))
for row in sorted(best,reverse=True)[:20]: print(row)
