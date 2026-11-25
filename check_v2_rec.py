import collections, json
import numpy as np

for name, folder in [('red', 'red-v2'), ('blue', 'blue.v2'), ('grey', 'gray-v2')]:
    rec = open(f'D:\\ashish\\{folder}\\_rec.bin', 'rb').read()
    sl = np.frombuffer(rec[:3072], dtype=np.uint8)
    meta = json.load(open(f'D:\\TOHRAN PROJECT\\cal_ramp_{name}.json'))['decoded']
    src = np.array([p[0 if name=='red' else 2] for p in meta])
    print('\n', name, 'rec frames', len(rec) // 24576, 'slice0 top', collections.Counter(sl.tolist()).most_common(6), 'min', sl.min(), 'max', sl.max())
    print('  src top', collections.Counter(src.tolist()).most_common(6))
    print('  rec head', sl[:18].tolist(), 'src head', src[:6].tolist())
