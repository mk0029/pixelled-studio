import collections
import numpy as np

single = r'D:\ashish\singal-60\Led\Controller-1\00_singal-60.led'
three = r'D:\ashish\celibration\Led\Led\Controller-1\00_t-3.led'

d = open(single, 'rb').read()
def dec_single(k):
    f = np.frombuffer(d[512+k*3072:512+(k+1)*3072], dtype=np.uint8).astype(int)
    return (f-0x50)&0xff
t = open(three, 'rb').read()
def dec_t(k):
    f = np.frombuffer(t[512+k*3072:512+(k+1)*3072], dtype=np.uint8).astype(int)
    mask = collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
    return (f-mask)&0xff

for k in [0,1,2,3,10,50,96,200,400,599]:
    pos = np.where(dec_single(k)!=0)[0]
    print('LED',k,'pos',pos.tolist(),
          't3 R/G/B', [int(dec_t(c)[p]) for p in pos for c in range(3)])
