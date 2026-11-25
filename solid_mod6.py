import collections
import numpy as np
base = r'D:\ashish\celibration\Led\Controller-1'
for name, mask in [('black',0x48),('red',0xAA),('green',0x1A),('blue',0x6C)]:
    d = open(f'{base}\\{name}.led','rb').read()
    f = np.frombuffer(d[512:512+3072], dtype=np.uint8).astype(int)
    dec = (f - mask) & 0xFF
    pos = np.where(dec == 255)[0]
    print(name, 'count', len(pos), 'mod6', collections.Counter((pos % 6).tolist()),
          'first', pos[:18].tolist())
