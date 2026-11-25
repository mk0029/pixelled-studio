import json
import numpy as np

pos_by_led = json.load(open(r'D:\TOHRAN PROJECT\led_positions.json'))
rgb = r'D:\ashish\cal-rgb\Led\Controller-1\00_cal-rgb.led'
d = open(rgb, 'rb').read()
def dec(k):
    f = np.frombuffer(d[512+k*3072:512+(k+1)*3072], dtype=np.uint8).astype(int)
    return (f-0x41)&0xff
uniq={}
for k in range((len(d)-20992)//3072): uniq.setdefault(d[512+k*3072:512+(k+1)*3072],[]).append(k)
G=sorted(uniq.items(),key=lambda kv:kv[1][0]); solid=[dec(ids[0]) for _,ids in G[:3]]
redpos=np.where(solid[0]!=0)[0]; greenpos=np.where(solid[1]!=0)[0]; bluepos=np.where(solid[2]!=0)[0]
green_set=set(greenpos.tolist())

out=[]
dists=[]
for k,ps in enumerate(pos_by_led):
    g=[p for p in ps if p in green_set]
    if len(g)!=1:
        out.append(None); continue
    gpos=g[0]
    r=int(redpos[np.argmin(np.abs(redpos-gpos))])
    b=int(bluepos[np.argmin(np.abs(bluepos-gpos))])
    out.append([r,gpos,b])
    dists += [abs(r-gpos), abs(b-gpos)]
print('mapped',sum(v is not None for v in out),'of 600')
print('distance median',int(np.median(dists)),'<=2',sum(d<=2 for d in dists),
      '<=4',sum(d<=4 for d in dists),'<=8',sum(d<=8 for d in dists),
      'max',max(dists))
print('unique red',len(set(r[0] for r in out if r)),'green',len(set(r[1] for r in out if r)),
      'blue',len(set(r[2] for r in out if r)))
print('first 8',out[:8])
json.dump(out,open(r'D:\TOHRAN PROJECT\led_byte_map.json','w'))
