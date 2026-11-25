import numpy as np, collections
led=np.frombuffer(open(r'D:\ashish\n2\Led\Controller-1\00_program1.led','rb').read()[512:512+3072],dtype=np.uint8)
tail=0x3d
dec=(led-tail)&0xff
# active = not all 3 bytes are tail in each pixel triple
active=[]
for p in range(1024):
    tri=dec[p*3:p*3+3]
    if not np.all(tri==0): active.append(p)
print('active pixels',len(active),'range',min(active),max(active))
print('first active',active[:20],'last active',active[-20:])
# gaps in active
gaps=[]
prev=-1
for p in active:
    if p>prev+1: gaps.append((prev+1,p-1))
    prev=p
print('gaps',gaps[:20])
