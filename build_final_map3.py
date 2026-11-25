import collections, json
import numpy as np

pos_by_led = json.load(open(r'D:\TOHRAN PROJECT\led_positions.json'))
p = r'D:\ashish\cal-rgb-2\Led\Controller-1\00_cal-rgb-2.led'
d = open(p, 'rb').read()
f = np.frombuffer(d[512:512+3072], dtype=np.uint8).astype(int)
mask = collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
active = set(np.where(((f-mask)&0xff)!=0)[0].tolist())
print('active', len(active), 'mask', hex(mask))

counts=collections.Counter()
index_by_mod={0:collections.Counter(),1:collections.Counter(),2:collections.Counter()}
for k,ps in enumerate(pos_by_led):
    hits=[i for i,x in enumerate(ps) if x in active]
    counts[len(hits)]+=1
    if len(hits)==1:
        index_by_mod[k%3][hits[0]]+=1
print('hits per LED',dict(counts))
for m in range(3): print('mod',m,'sorted-index distribution',dict(index_by_mod[m]))

# map: assume channel order R,G,B = sorted position order
out=[]
for ps in pos_by_led:
    s=sorted(ps)
    out.append(s)
print('first 8',out[:8])
json.dump(out,open(r'D:\TOHRAN PROJECT\led_byte_map.json','w'))
print('saved led_byte_map.json')
