import collections
import numpy as np

p = r'D:\ashish\celibration\Led\Led\Controller-1\00_t-3.led'
d = open(p, 'rb').read()
def dec(k):
    f = np.frombuffer(d[512+k*3072:512+(k+1)*3072], dtype=np.uint8).astype(int)
    mask = collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
    return (f - mask) & 0xff
a = [dec(k) for k in range(3)]
s = ''.join('R' if a[0][i] else 'G' if a[1][i] else 'B' if a[2][i] else '.' for i in range(180))
for j in range(0,180,60): print(j, s[j:j+60])
# find period
for period in range(1,25):
    ok = all(s[i]==s[i+period] for i in range(len(s)-period))
    if ok: print('period',period); break
