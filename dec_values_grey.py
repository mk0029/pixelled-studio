import collections
import numpy as np
root = r'D:\ashish\blue.v2\Led\Controller-1'
d = open(root + r'\02_gray-v2.led', 'rb').read()
f = np.frombuffer(d[512:512 + 3072], dtype=np.uint8).astype(int)
mask = collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
dec = ((f - mask) & 0xff)
c = collections.Counter(dec.tolist())
print('unique', len(c))
print(sorted(c.keys()))
