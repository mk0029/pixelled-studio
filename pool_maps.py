import collections
import numpy as np

def active_positions(path, mask_arg=None):
    d = open(path, 'rb').read()
    f = np.frombuffer(d[512:512+3072], dtype=np.uint8).astype(int)
    mask = collections.Counter(np.frombuffer(d[512+2048:512+3072], dtype=np.uint8).tolist()).most_common(1)[0][0] if mask_arg is None else mask_arg
    a = (f-mask)&0xff
    return set(np.where(a!=0)[0].tolist()), mask

paths = [
 r'D:\ashish\cal-rgb\Led\Controller-1\00_cal-rgb.led',
 r'D:\ashish\cal-rgb-2\Led\Controller-1\00_cal-rgb-2.led',
]
for p in paths:
    try:
        s,m = active_positions(p)
        print(p.split('\\')[-3], 'mask',hex(m),'active',len(s),'min',min(s),'max',max(s))
        print('  first 30', sorted(s)[:30])
    except FileNotFoundError:
        print('missing',p)

# check whether the 3 groups in cal-rgb differ
p = r'D:\ashish\cal-rgb\Led\Controller-1\00_cal-rgb.led'
d = open(p, 'rb').read()
uniq={}
for k in range((len(d)-20992)//3072): uniq.setdefault(d[512+k*3072:512+(k+1)*3072],[]).append(k)
G=sorted(uniq.items(),key=lambda kv:kv[1][0])[:3]
sets=[]
for raw,ids in G:
    f=np.frombuffer(raw,dtype=np.uint8).astype(int)
    mask=collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
    sets.append(set(np.where(((f-mask)&0xff)!=0)[0].tolist()))
print('group sets equal?', sets[0]==sets[1]==sets[2])
for i in range(3):
    for j in range(i+1,3):
        print(' overlap',i,j,len(sets[i]&sets[j]),'symdiff',len(sets[i]^sets[j]))
