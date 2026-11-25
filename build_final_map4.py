import collections, json
import numpy as np

p = r'D:\ashish\singal-rgb\Led\Controller-1\00_singal-rgb.led'
d = open(p, 'rb').read()
assert (len(d)-20992)%3072 == 0

def dec(k):
    f = np.frombuffer(d[512+k*3072:512+(k+1)*3072], dtype=np.uint8).astype(int)
    mask = collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
    return (f-mask)&0xff

out=[]
bad=[]
for k in range(600):
    a=dec(k); nz=np.where(a!=0)[0]
    if len(nz)!=3:
        bad.append((k,'count',len(nz))); out.append(None); continue
    vals=a[nz].tolist()
    if sorted(vals) != [82,233,255]:
        bad.append((k,'vals',vals)); out.append(None); continue
    posR=int(nz[vals.index(255)])
    posG=int(nz[vals.index(233)])
    posB=int(nz[vals.index(82)])
    out.append([posR,posG,posB])
print('bad',len(bad),bad[:5])
print('unique R/G/B',len(set(r[0] for r in out if r)),len(set(r[1] for r in out if r)),len(set(r[2] for r in out if r)))
print('first 8',out[:8],'last 3',out[-3:])
json.dump(out,open(r'D:\TOHRAN PROJECT\led_byte_map.json','w'))
print('saved led_byte_map.json')
