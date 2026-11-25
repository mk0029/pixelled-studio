import collections, json
import numpy as np

meta = json.load(open(r'D:\TOHRAN PROJECT\cal_ramp_grey.json'))['decoded']
src = np.array([p[0] for p in meta])
d = open(r'D:\ashish\blue.v2\Led\Controller-1\02_gray-v2.led', 'rb').read()
f = np.frombuffer(d[512:512 + 3072], dtype=np.uint8).astype(int)
mask = collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
dec = (f - mask) & 0xff
print('src unique', len(set(src.tolist())), 'top', collections.Counter(src.tolist()).most_common(10))
print('dec unique', len(set(dec.tolist())), 'top', collections.Counter(dec.tolist()).most_common(15))
print('src multiples of 16', sum(1 for v in src if v % 16 == 0), '/600')
print('dec multiples of 16', sum(1 for v in dec if v % 16 == 0), '/3072')
# check mapping f(v)=? by sorting
for v in [0, 32, 64, 96, 128, 160, 192, 224, 255]:
    print('src', v, 'count', int((src == v).sum()))
