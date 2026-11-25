import collections
import numpy as np

for name, p in [
    ('n2', r'D:\ashish\n2\Led\Controller-1\00_program1.led'),
    ('nnn', r'D:\ashish\nnn\Led\Controller-1\00_program1.led'),
]:
    d = open(p,'rb').read()
    f = np.frombuffer(d[512:512+3072], dtype=np.uint8).astype(int)
    mask = collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
    dec = (f - mask) & 0xff
    c = collections.Counter(dec.tolist())
    print(name, 'frames', (len(d)-20992)//3072, 'mask', hex(mask), 'unique', len(c), 'top', c.most_common(15))
