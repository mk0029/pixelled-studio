import collections, json
import numpy as np

single = r'D:\ashish\singal-60\Led\Controller-1\00_singal-60.led'
bucket = r'D:\ashish\buket\Led\Controller-1\00_buket.led'

d = open(single, 'rb').read()
def dec_single(k):
    f = np.frombuffer(d[512+k*3072:512+(k+1)*3072], dtype=np.uint8).astype(int)
    return (f-0x50)&0xff
b = open(bucket, 'rb').read()
def dec_bucket(k):
    f = np.frombuffer(b[512+k*3072:512+(k+1)*3072], dtype=np.uint8).astype(int)
    return (f-0xfe)&0xff
uniq={}
for k in range((len(b)-20992)//3072): uniq.setdefault(b[512+k*3072:512+(k+1)*3072],[]).append(k)
G=sorted(uniq.items(),key=lambda kv:kv[1][0]); A=[dec_bucket(ids[0]) for _,ids in G]
pairs=[('R',5,0),('G',1,2),('B',3,4)]  # low group, high group

meta=json.load(open(r'D:\TOHRAN PROJECT\cal_bucket.json'))['decoded']
for k in [0,1,2,3,10,50,96]:
    a=dec_single(k); pos=np.where(a!=0)[0]
    print('LED',k,'positions',pos.tolist())
    for p in pos:
        scores=[]
        for name,gl,gh in pairs:
            hv=int(A[gh][p]); lv=int(A[gl][p])
            exp_h=meta[2*['R','G','B'].index(name)][k][['R','G','B'].index(name)]
            exp_l=meta[2*['R','G','B'].index(name)+1][k][['R','G','B'].index(name)]
            scores.append((abs(hv-exp_h)+abs(lv-exp_l), name, hv, lv, exp_h, exp_l))
        print('  pos',int(p),'best',min(scores))
