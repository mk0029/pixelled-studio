import collections, cv2, numpy as np
led=open(r'D:\ashish\n2\Led\Controller-1\00_program1.led','rb').read()
raw=np.frombuffer(led[512:512+3072],dtype=np.uint8).astype(int)
cap=cv2.VideoCapture(r'D:\TOHRAN PROJECT\test_blocks_30x20.avi'); ok,fr=cap.read(); cap.release()
blk=fr.reshape(20,8,30,8,3).mean(axis=(1,3))
# exact expected colours from generator
expected={( (bx*8)&0xff, (by*12)&0xff, 128):(bx,by) for by in range(20) for bx in range(30)}
print('expected colours',len(expected))

for off in [61,62,63,64]:
    dec=(raw-off)&0xff
    pix=[tuple(dec[i*3:i*3+3]) for i in range(1024)]
    perms=[(0,1,2),(0,2,1),(1,0,2),(1,2,0),(2,0,1),(2,1,0)]
    exact=0; samples=[]
    for i,p in enumerate(pix[:600]):
        for perm in perms:
            k=tuple(p[perm[j]] for j in range(3))
            if k in expected:
                exact+=1
                if len(samples)<8: samples.append((i,p,perm,expected[k]))
                break
    print('off',off,'exact matches',exact,'/',600)
    if samples: print('  samples',samples[:5])
