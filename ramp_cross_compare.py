import collections
import numpy as np

root = r'D:\ashish\blue.v2\Led\Controller-1'
def dec(fn):
    d = open(root + '\\' + fn, 'rb').read()
    f = np.frombuffer(d[512:512 + 3072], dtype=np.uint8).astype(int)
    mask = collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
    return (f - mask) & 0xff
R, B, G = dec('00_red-v2.led'), dec('01_blue.v2.led'), dec('02_gray-v2.led')
for a, an, b, bn in [(R,'red',G,'grey'), (B,'blue',G,'grey'), (R,'red',B,'blue')]:
    m = (a != 0) & (b != 0)
    print(an, bn, 'shared nonzero', m.sum(), 'equal values', (a[m] == b[m]).sum(), 'corr', round(np.corrcoef(a[m], b[m])[0,1],3))
    print('  samples', [(int(x), int(y)) for x, y in zip(a[m][:15], b[m][:15])])
