import os, collections
import numpy as np

root = r'D:\$RECYCLE.BIN\S-1-5-21-1788527993-1725293482-2949566873-1001'
files = []
for dp, dn, fn in os.walk(root):
    for name in fn:
        if name.lower().endswith('.led'):
            p = os.path.join(dp, name)
            if os.path.getsize(p) > 20992:
                files.append(p)
for p in sorted(files):
    d = open(p, 'rb').read()
    n = (len(d) - 20992) // 3072
    vals = collections.Counter()
    for k in range(min(n, 6)):
        f = np.frombuffer(d[512 + k * 3072:512 + (k + 1) * 3072], dtype=np.uint8).astype(int)
        mask = collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
        vals.update(((f[:1800] - mask) & 0xff).tolist())
    print(os.path.relpath(p, root), 'frames', n, 'mask', hex(mask), 'unique', len(vals), 'top', vals.most_common(8))
