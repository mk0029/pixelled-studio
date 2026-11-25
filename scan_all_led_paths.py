import os
roots = [r'D:\ashish', r'D:\Program_1', r'D:\BACKUP TORHAN SHOWS', r'D:\TOHRAN PROJECT']
seen = set()
for root in roots:
    for dp, dn, fn in os.walk(root):
        for name in fn:
            if name.lower().endswith('.led'):
                p = os.path.join(dp, name)
                if p not in seen:
                    seen.add(p)
                    print(p, os.path.getsize(p))
