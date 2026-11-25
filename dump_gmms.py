import glob, os
for p in glob.glob(r'D:\ashish\*.gmm'):
    b = open(p, 'rb').read()
    try:
        t = b.decode('utf-16-le')
    except Exception:
        t = b.decode('utf-8', errors='ignore')
    print('\n===', os.path.basename(p), repr(t[:120]))
