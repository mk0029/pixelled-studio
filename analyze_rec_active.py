import numpy as np
rec=np.frombuffer(open(r'D:\ashish\Program_1\_rec.bin','rb').read()[:3072],dtype=np.uint8)
# active = not all 3 bytes are A3 (163)
active=[]
for p in range(1024):
    tri=rec[p*3:p*3+3]
    if not np.all(tri==163): active.append(p)
print('active pixels',len(active),'range',min(active),max(active))
print('first active',active[:20],'last active',active[-20:])
gaps=[]; prev=-1
for p in active:
    if p>prev+1: gaps.append((prev+1,p-1))
    prev=p
print('gaps',gaps[:20])
