import glob, os
for p in glob.glob(r'D:\ashish\**\_rec.bin', recursive=True) + glob.glob(r'D:\**\_rec.bin', recursive=True):
    try:
        sz = os.path.getsize(p)
        print(p, sz, 'frames@24576', sz / 24576)
    except Exception:
        pass
