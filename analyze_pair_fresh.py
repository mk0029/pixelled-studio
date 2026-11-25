import numpy as np, collections
REC=r'D:\ashish\Program_1\_rec.bin'
LED=r'D:\ashish\n2\Led\Controller-1\00_program1.led'
rec=np.frombuffer(open(REC,'rb').read(),dtype=np.uint8).reshape(-1,24576)
led=np.frombuffer(open(LED,'rb').read(),dtype=np.uint8)[512:]
led=led[:len(rec)*3072].reshape(-1,3072)
print('rec frames',len(rec),'led frames',len(led))
# are frames identical?
print('rec slice0 unique frames', len(set(rec[:, :3072].tobytes()[i*3072:(i+1)*3072] for i in range(len(rec)))))
print('led unique frames', len(set(led.tobytes()[i*3072:(i+1)*3072] for i in range(len(led)))))
r=rec[0,:3072].astype(int); l=led[0].astype(int)
# global value map
m=collections.defaultdict(collections.Counter)
for a,b in zip(r,l): m[a][b]+=1
amb=[(k,v.most_common(3)) for k,v in m.items() if len(v)>1]
print('rec values',len(m),'ambiguous source values',len(amb))
print('sample ambiguous',amb[:10])
# consistency if we take majority map
lut={k:v.most_common(1)[0][0] for k,v in m.items()}
pred=np.array([lut.get(int(x),x) for x in r])
print('majority-lut exact matches', (pred==l).sum(), '/', len(r))
