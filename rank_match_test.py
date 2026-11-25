import collections, json
import numpy as np

root = r'D:\ashish\blue.v2\Led\Controller-1'
d = open(root + r'\02_gray-v2.led','rb').read()
f = np.frombuffer(d[512:512+3072], dtype=np.uint8).astype(int)
mask = collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
dec = ((f - mask) & 0xff)
src = np.array([p[0] for p in json.load(open(r'D:\TOHRAN PROJECT\cal_ramp_grey.json'))['decoded']])

a = np.sort(dec[dec != 0])
b = np.sort(np.repeat(src, 3))
b = b[b != 0]
n = min(len(a), len(b))
print('sizes', len(a), len(b))
print('dec quantiles', [int(np.percentile(a,q)) for q in [0,10,25,50,75,90,100]])
print('src quantiles', [int(np.percentile(b,q)) for q in [0,10,25,50,75,90,100]])
print('corr sorted', round(float(np.corrcoef(a[:n], b[:n])[0,1]), 4))
# map by rank: for each decoded value, what source value?
print('first 30 pairs', [(int(x),int(y)) for x,y in zip(a[:30], b[:30])])
