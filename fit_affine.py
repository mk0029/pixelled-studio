import itertools
import numpy as np

LXB = r'D:\ashish\celibration.Lxb'
LED = r'D:\ashish\calxy\Led\Controller-1\00_calxy.led'
b = open(LXB, 'rb').read()
coord = []
for i in range(600):
    r = b[512+i*16:512+(i+1)*16]
    y = r[3] - 0xCD
    idx = (r[15] - 0xCD) & 0xFF
    for w in range(3):
        v = idx + 256*w
        if v >= y and (v - y) % 20 == 0:
            x = (v - y)//20
            if 0 <= x < 30:
                coord.append((x, y)); break
coord = np.array(coord)

d = open(LED, 'rb').read()
def dec(k):
    f = np.frombuffer(d[512+k*3072:512+(k+1)*3072], dtype=np.uint8).astype(int)
    return (f - 0x59) & 0xff
A = {k: dec(k) for k in [0,1,2,3,5,6]}
pairs = [(6,0),(1,2),(3,5)]
pts = []
for gx,gy in pairs:
    x,y = A[gx],A[gy]
    for i in np.where((x!=0)&(y!=0))[0]:
        pts.append((int(round(x[i]/8)), int(round(y[i]/8))))
pts = np.array(pts)
print('points',len(pts))

best=[]
for fx in [1,-1]:
  for fy in [1,-1]:
    for ox in range(0,3):
      for oy in range(0,13):
        for sx in [30/32,29/31,1.0,32/30,31/29]:
          for sy in [20/32,19/31,1.0,32/20,31/19]:
            xs = np.round((fx==1 and coord[:,0] or 29-coord[:,0])*sx+ox).astype(int)
            ys = np.round((fy==1 and coord[:,1] or 19-coord[:,1])*sy+oy).astype(int)
            key = dict(zip(zip(xs.tolist(),ys.tolist()), range(600)))
            hits = sum(1 for p in pts if tuple(p) in key)
            uniq = len({key[tuple(p)] for p in pts if tuple(p) in key})
            best.append((hits,uniq,fx,fy,ox,oy,round(sx,3),round(sy,3)))
for row in sorted(best,reverse=True)[:15]: print(row)
