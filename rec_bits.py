import collections
import numpy as np

recp = r'D:\ashish\Program_1\_rec.bin'
ledp = r'D:\ashish\n2\Led\Controller-1\00_program1.led'
r = open(recp, 'rb').read()
d = open(ledp, 'rb').read()
for s in range(8):
    sl = np.frombuffer(r[s * 3072:(s + 1) * 3072], dtype=np.uint8)
    print('slice', s, 'top', collections.Counter(sl.tolist()).most_common(5), 'min', sl.min(), 'max', sl.max())
