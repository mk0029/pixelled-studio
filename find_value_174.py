import os, collections
import numpy as np

roots = [r'D:\ashish', r'D:\Program_1', r'D:\BACKUP TORHAN SHOWS', r'D:\$RECYCLE.BIN']
seen = set()
for root in roots:
    for dp, dn, fn in os.walk(root):
        for name in fn:
            if not name.lower().endswith('.led'):
                continue
            p = os.path.join(dp, name)
            if p in seen or os.path.getsize(p) <= 20992:
                continue
            seen.add(p)
            d = open(p, 'rb').read()
            n = (len(d) - 20992) // 3072
            vals = collections.Counter()
            for k in range(min(n, 20)):
                f = np.frombuffer(d[512 + k * 3072:512 + (k + 1) * 3072], dtype=np.uint8).astype(int)
                mask = collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
                vals.update(((f[:1800] - mask) & 0xff).tolist())
            hits = {v: vals[v] for v in [174, 173, 175, 191, 128, 82] if vals[v]}
            if hits:
                print(os.path.relpath(p, root), 'frames', n, 'hits', hits)
