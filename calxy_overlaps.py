import itertools
import numpy as np

p = r'D:\ashish\cal-xy\Led\Controller-1\00_cal-xy.led'
d = open(p, 'rb').read()
def dec(k):
    return np.frombuffer(d[512+k*3072:512+(k+1)*3072], dtype=np.uint8).astype(int)
uniq = {}
for k in range((len(d)-20992)//3072):
    uniq.setdefault(d[512+k*3072:512+(k+1)*3072], []).append(k)
groups = sorted(uniq.items(), key=lambda kv: kv[1][0])
A = [dec(ids[0]) for _, ids in groups]
print('types', [('x' if len(set(a[a!=0].tolist()))>25 else 'y') for a in A])
for i,j in itertools.combinations(range(len(A)),2):
    ov = int(((A[i]!=0)&(A[j]!=0)).sum())
    if ov>100: print('pair',i,j,'overlap',ov)
