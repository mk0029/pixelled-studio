import glob, os, struct

root = r'D:\$RECYCLE.BIN\S-1-5-21-1788527993-1725293482-2949566873-1001'
for p in glob.glob(root + r'\$I*'):
    b = open(p, 'rb').read()
    ver = struct.unpack_from('<Q', b, 0)[0]
    size = struct.unpack_from('<Q', b, 8)[0]
    dt = struct.unpack_from('<Q', b, 16)[0]
    try:
        path = b[28:].decode('utf-16-le').rstrip('\x00')
    except Exception:
        path = '?'
    print(os.path.basename(p), 'ver', ver, 'size', size, 'path', path)
