import collections
import numpy as np

p = r'D:\ashish\celibration\Led\Led\Controller-1\00_t-3.led'
d = open(p, 'rb').read()
def dec(k):
    f = np.frombuffer(d[512+k*3072:512+(k+1)*3072], dtype=np.uint8).astype(int)
    mask = collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
    return (f - mask) & 0xff
a = [dec(k) for k in range(3)]
print('k : R(5k) : B(5k+1,5k+2) : G(5k+3,5k+4)')
for k in range(30):
    print(k, int(a[0][5*k]), (int(a[2][5*k+1]), int(a[2][5*k+2])), (int(a[1][5*k+3]), int(a[1][5*k+4])))
b1,b2 = a[2][1::5][:600], a[2][2::5][:600]
g1,g2 = a[1][3::5][:600], a[1][4::5][:600]
print('\nB pairs equal', int((b1==b2).sum()), '/600')
print('G pairs equal', int((g1==g2).sum()), '/600')
