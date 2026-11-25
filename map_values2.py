import collections, json
import numpy as np

p = r'D:\ashish\celibration\Led\Led\Controller-1\00_t-3.led'
d = open(p, 'rb').read()
def dec(k):
    f = np.frombuffer(d[512+k*3072:512+(k+1)*3072], dtype=np.uint8).astype(int)
    mask = collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
    return (f - mask) & 0xff

meta = json.load(open(r'D:\TOHRAN PROJECT\cal_channel_map.json'))['decoded']
src = [np.array([px[c] for px in meta[c]]) for c in range(3)]

for c in range(3):
    a = dec(c)
    pc = collections.Counter(a[a!=0].tolist())
    sc = collections.Counter(src[c][src[c]!=0].tolist())
    bad = [(v, pc[v], sc[v]) for v in sorted(set(pc)|set(sc)) if pc[v]!=sc[v]]
    print('phase',c,'nonzero mismatch',len(bad),'/',len(set(pc)|set(sc)),'first',bad[:15])
    print('  export nonzero',sum(pc.values()),'src nonzero',sum(sc.values()))
