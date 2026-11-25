import glob, os, re

for p in glob.glob(r'D:\ashish\*.pxb'):
    b = open(p, 'rb').read()
    try:
        t = b.decode('utf-16-le', errors='ignore')
    except Exception:
        continue
    t = ''.join(ch if ch.isprintable() or ch in '\r\n\t' else ' ' for ch in t)
    t = re.sub(r' +', ' ', t)
    print('\n===', os.path.basename(p), 'bytes', len(b), 'chars', len(t))
    print(t[:1200])
