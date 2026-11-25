import collections, json
import numpy as np

for name, folder in [('grey','gray-v2'), ('red','red-v2'), ('blue','blue.v2')]:
    rec = open(f'D:\\ashish\\{folder}\\_rec.bin', 'rb').read()
    nframes = len(rec) // 24576
    sl = np.frombuffer(rec[:3072], dtype=np.uint8).reshape(32, 32, 3).astype(int)
    lum = sl.mean(axis=2)
    print('\n===', name, 'rec frames', nframes, 'lum min/max', lum.min(), lum.max())
    # coarse 8x8 downsample of 32x32
    coarse = lum.reshape(8,4,8,4).mean(axis=(1,3))
    for row in coarse:
        print(' '.join(f'{int(v):3d}' for v in row))
    print(' row means', [int(v) for v in lum.mean(axis=1)])
    print(' col means', [int(v) for v in lum.mean(axis=0)])
