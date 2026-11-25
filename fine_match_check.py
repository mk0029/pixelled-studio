import collections, json
import numpy as np

meta = json.load(open(r'D:\TOHRAN PROJECT\cal_fine_map.json'))['decoded']
for ph in range(6):
    ch, kind = divmod(ph, 2)
    vals = [px[ch] for px in meta[ph]]
    print('phase', ph, 'channel', ch, 'kind', 'coarse' if kind==0 else 'fine',
          'first 8', vals[:8], 'vals at 151,329,407', [vals[k] for k in [151,329,407]])
