import os, datetime

root = r'D:\ashish'
cutoff = datetime.datetime.now() - datetime.timedelta(days=2)
for dp, dn, fn in os.walk(root):
    for name in fn:
        p = os.path.join(dp, name)
        try:
            st = os.stat(p)
        except Exception:
            continue
        t = datetime.datetime.fromtimestamp(st.st_mtime)
        if t > cutoff:
            print(t.strftime('%Y-%m-%d %H:%M:%S'), f'{st.st_size:10d}', p)
