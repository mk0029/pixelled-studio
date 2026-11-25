import os, collections
import numpy as np

roots = [r'D:\ashish', r'D:\Program_1', r'D:\BACKUP TORHAN SHOWS', r'D:\TOHRAN PROJECT']
seen = set()
for root in roots:
    for dp, dn, fn in os.walk(root):
        for name in fn:
            if not name.lower().endswith('.led'):
                continue
            p = os.path.join(dp, name)
            if p in seen:
                continue
            seen.add(p)
            d = open(p, 'rb').read()
            if len(d) < 20992 + 3072:
                continue
            n = (len(d) - 20992) // 3072
            vals = collections.Counter()
            for k in range(min(n, 8)):
                f = np.frombuffer(d[512 + k * 3072:512 + (k + 1) * 3072], dtype=np.uint8).astype(int)
                mask = collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
                vals.update(((f[:1800] - mask) & 0xff).tolist())
            top = vals.most_common(6)
            print(os.path.relpath(p, root), 'frames', n, 'top', top)
