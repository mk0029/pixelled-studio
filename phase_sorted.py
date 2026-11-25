import collections, json
import numpy as np

p = r'D:\ashish\celibration\Led\Led\Controller-1\00_t-3.led'
d = open(p, 'rb').read()
def dec(k):
    f = np.frombuffer(d[512+k*3072:512+(k+1)*3072], dtype=np.uint8).astype(int)
    mask = collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
    return (f - mask) & 0xff
meta = json.load(open(r'D:\TOHRAN PROJECT\cal_channel_map.json'))['decoded']
for c in range(3):
    a = dec(c)
    av = np.sort(a[a!=0])
    sv = np.sort(np.array([px[c] for px in meta[c]]))
    sv = sv[sv!=0]
    n = min(len(av), len(sv))
    print('phase',c,'sizes',len(av),len(sv),'corr',round(float(np.corrcoef(av[:n],sv[:n])[0,1]),4))
    print('  a deciles',[int(np.percentile(av,q)) for q in [0,25,50,75,100]])
    print('  s deciles',[int(np.percentile(sv,q)) for q in [0,25,50,75,100]])
