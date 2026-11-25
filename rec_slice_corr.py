import json
import numpy as np

src = np.array([p[0] for p in json.load(open(r'D:\TOHRAN PROJECT\cal_ramp_grey.json'))['decoded']]).reshape(20,30)
rec = open(r'D:\ashish\gray-v2\_rec.bin', 'rb').read()
for s in range(8):
    sl = np.frombuffer(rec[s*3072:(s+1)*3072], dtype=np.uint8)
    for mode in ['mean3', 'b_only']:
        arr = sl.reshape(32,32,3).astype(float)
        v = arr[:20,:30].mean(axis=2) if mode == 'mean3' else arr[:20,:30,2]
        c = np.corrcoef(v.ravel(), src.ravel())[0,1]
        print('slice', s, mode, 'corr', round(float(c),3), 'range', int(v.min()), int(v.max()))
