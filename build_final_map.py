import collections, json
import numpy as np

single = r'D:\ashish\singal-60\Led\Controller-1\00_singal-60.led'
rgb = r'D:\ashish\cal-rgb\Led\Controller-1\00_cal-rgb.led'

# positions per LED from single-white export
pos_by_led = json.load(open(r'D:\TOHRAN PROJECT\led_positions.json'))

d = open(rgb, 'rb').read()
def dec(k):
    f = np.frombuffer(d[512+k*3072:512+(k+1)*3072], dtype=np.uint8).astype(int)
    return (f-0x41)&0xff
uniq={}
for k in range((len(d)-20992)//3072): uniq.setdefault(d[512+k*3072:512+(k+1)*3072],[]).append(k)
G=sorted(uniq.items(),key=lambda kv:kv[1][0])
solid=[dec(ids[0]) for _,ids in G[:3]]  # assumed R,G,B

# verify partition
allpos=[p for ps in pos_by_led for p in ps]
print('positions', len(allpos), 'unique', len(set(allpos)))
for c in range(3):
    active=set(np.where(solid[c]!=0)[0].tolist())
    print('solid',c,'active',len(active),'overlap with LED positions',len(active & set(allpos)))
    perled=collections.Counter(sum(1 for p in ps if p in active) for ps in pos_by_led)
    print('  per LED counts', dict(perled))

# assign channels
out=[]
conflicts=0
for k,ps in enumerate(pos_by_led):
    row=[None]*3
    for p in ps:
        hits=[c for c in range(3) if solid[c][p]!=0]
        if len(hits)!=1: conflicts+=1
        else: row[hits[0]]=p
    out.append(row)
print('conflicts',conflicts,'missing',sum(1 for r in out if any(p is None for p in r)))
print('first 5',out[:5])
json.dump(out,open(r'D:\TOHRAN PROJECT\led_byte_map.json','w'))
print('saved led_byte_map.json')
