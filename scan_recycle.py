import os
root = r'D:\$RECYCLE.BIN'
for dp, dn, fn in os.walk(root):
    for name in fn:
        p = os.path.join(dp, name)
        try:
            sz = os.path.getsize(p)
        except Exception:
            continue
        if name.lower().endswith(('.led', '.bin', '.pxb', '.gmm', '.bmp', '.avi')):
            print(p, sz)
