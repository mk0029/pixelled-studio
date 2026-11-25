import collections
import numpy as np

p = r'D:\ashish\celibration\Led\Led\Controller-1\00_t-3.led'
d = open(p, 'rb').read()
def dec(k):
    f = np.frombuffer(d[512+k*3072:512+(k+1)*3072], dtype=np.uint8).astype(int)
    mask = collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
    return (f - mask) & 0xff
a = [dec(k) for k in range(3)]
print('pos : R  G  B')
for i in range(40):
    print(f'{i:3d} : {a[0][i]:3d} {a[1][i]:3d} {a[2][i]:3d}')
