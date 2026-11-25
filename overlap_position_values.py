import collections
import numpy as np

base = r'D:\ashish\celibration\Led\Controller-1'
root = r'D:\ashish\blue.v2\Led\Controller-1'
def dec(path):
    d = open(path, 'rb').read()
    f = np.frombuffer(d[512:512 + 3072], dtype=np.uint8).astype(int)
    mask = collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
    return (f - mask) & 0xff
R = dec(base + r'\red.led'); G = dec(base + r'\green.led'); B = dec(base + r'\blue.led')
GR = dec(root + r'\02_gray-v2.led'); RR = dec(root + r'\00_red-v2.led'); BB = dec(root + r'\01_blue.v2.led')
both = [i for i in range(3072) if R[i] and G[i]]
print('positions on in both red and green solids:', len(both), both[:20])
for i in both[:20]:
    print(i, 'R', R[i], 'G', G[i], 'B', B[i], '| ramp grey', GR[i], 'red', RR[i], 'blue', BB[i])
