import numpy as np
rec=np.frombuffer(open(r'D:\ashish\Program_1\_rec.bin','rb').read()[:3072],dtype=np.uint8).astype(int)
led=np.frombuffer(open(r'D:\ashish\n2\Led\Controller-1\00_program1.led','rb').read()[512:512+3072],dtype=np.uint8).astype(int)
d=(led-rec)&0xff
# for each position where diff != 154, mark
neq=np.where(d!=154)[0]
print('first neq',neq[:20],'last neq',neq[-20:])
# find largest contiguous run of 154
mask=d==154
best=(0,0); cur=0; st=0
for i,m in enumerate(mask):
    if m:
        if cur==0: st=i
        cur+=1
        if cur>best[0]: best=(cur,st)
    else: cur=0
print('longest run',best)
# cumulative count of 154 by position
for p in range(0,3072,128):
    print(p, mask[p:p+128].sum(),'/128')
