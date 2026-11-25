import collections, json
import numpy as np

p = r'D:\ashish\cal-fine\Led\Controller-1\00_cal-fine.led'
d = open(p, 'rb').read()
def dec(k):
    f = np.frombuffer(d[512+k*3072:512+(k+1)*3072], dtype=np.uint8).astype(int)
    mask = collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
    return (f - mask) & 0xff

uniq = {}
for k in range(175):
    uniq.setdefault(d[512+k*3072:512+(k+1)*3072], []).append(k)
groups = sorted(uniq.items(), key=lambda kv: kv[1][0])
frames = [dec(ids[0]) for raw, ids in groups]
print('group first ids', [ids[0] for raw, ids in groups])
meta = json.load(open(r'D:\TOHRAN PROJECT\cal_fine_map.json'))['decoded']
coarse = [round(k*255/599) for k in range(600)]
fine = [k % 256 for k in range(600)]

# positions that are nonzero only in exactly 2 of the 6 groups
nz = np.array([[a[i] != 0 for a in frames] for i in range(3072)])
print('nonzero count distribution', collections.Counter(nz.sum(axis=1).tolist()))
for i in [0, 5, 6, 11, 12, 100]:
    print('pos',i,'vals',[int(a[i]) for a in frames], 'nz mask',nz[i].tolist())
