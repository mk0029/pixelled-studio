import collections, json
import numpy as np

LED = r'D:\ashish\buket\Led\Controller-1\00_buket.led'
META = r'D:\TOHRAN PROJECT\cal_bucket.json'

d = open(LED, 'rb').read()
def dec(k):
    f = np.frombuffer(d[512+k*3072:512+(k+1)*3072], dtype=np.uint8).astype(int)
    mask = collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
    return (f - mask) & 0xff
uniq = {}
for k in range((len(d)-20992)//3072):
    uniq.setdefault(d[512+k*3072:512+(k+1)*3072], []).append(k)
G = sorted(uniq.items(), key=lambda kv: kv[1][0])
A = [dec(ids[0]) for _, ids in G]
print('groups', len(G), 'types', ['high' if i%2==0 else 'low' for i in range(len(G))])

meta = json.load(open(META))['decoded']
# sidecar[phase][k][channel]
high = [np.array([px[c] for px in meta[2*c]], dtype=int) for c in range(3)]
low  = [np.array([px[c] for px in meta[2*c+1]], dtype=int) for c in range(3)]

maps=[]
for c, (gl, gh) in enumerate([(5,0),(1,2),(3,4)]):
    hi, lo = A[gh], A[gl]
    both = (hi != 0) & (lo != 0)
    posmap = {}
    errors = []
    for p in np.where(both)[0]:
        hv, lv = int(hi[p]), int(lo[p])
        err = np.abs(high[c]-hv) + np.abs(low[c]-lv)
        k = int(np.argmin(err))
        errors.append(int(err[k]))
        posmap[int(p)] = k
    inv={}
    for p,k in posmap.items(): inv.setdefault(k,[]).append(p)
    maps.append(inv)
    print('ch',c,'active',int(both.sum()),'mapped',len(posmap),'LEDs',len(inv),
          'multi',sum(len(v)>1 for v in inv.values()),
          'err median',int(np.median(errors)),'<=5',sum(e<=5 for e in errors),
          '<=10',sum(e<=10 for e in errors))

out=[]
for inv in maps:
    arr=[None]*600
    for k,ps in inv.items(): arr[k]=ps[0]
    out.append(arr)
json.dump(out,open(r'D:\TOHRAN PROJECT\led_byte_map.json','w'))
print('missing',[sum(v is None for v in a) for a in out])
