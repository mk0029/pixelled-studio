import os, datetime

for root in [r'D:\ashish', r'D:\TOHRAN PROJECT']:
    print('===', root)
    for dp, dn, fn in os.walk(root):
        for name in fn:
            if name.lower().endswith(('.avi','.mp4','.mov','.wmv')):
                p = os.path.join(dp, name)
                st = os.stat(p)
                t = datetime.datetime.fromtimestamp(st.st_mtime)
                print(t.strftime('%Y-%m-%d %H:%M'), f'{st.st_size:9d}', p)
