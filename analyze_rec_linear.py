import cv2, numpy as np
cap=cv2.VideoCapture(r'D:\TOHRAN PROJECT\test_blocks_30x20.avi'); ok,fr=cap.read(); cap.release()
blk=fr.reshape(20,8,30,8,3).mean(axis=(1,3))
src=np.array([[blk[y,x,2],blk[y,x,1],blk[y,x,0]] for y in range(20) for x in range(30)],dtype=int)  # RGB, row-major
rec=np.frombuffer(open(r'D:\ashish\Program_1\_rec.bin','rb').read()[:1800],dtype=np.uint8).reshape(600,3).astype(int)
# For each row-major source pixel, find rec pixel with min squared distance under a,b linear per channel
bestsum=0
for perm in [(0,1,2),(2,1,0),(1,2,0),(0,2,1),(1,0,2),(2,0,1)]:
    S=src[:,perm]
    # try a in 0.5..2 step 0.05, b in -50..50 step 5
    for a in np.arange(0.5,2.01,0.05):
        for b in range(-60,61,4):
            P=np.clip(np.round(a*S+b),0,255).astype(int)
            d=np.abs(rec[:,None,:]-P[None,:,:]).sum(axis=2)
            mind=d.min(axis=1).sum()
            if mind<bestsum or bestsum==0:
                bestsum=mind; best=(perm,a,b,d.argmin(axis=1))
print('best sum',bestsum,'perm',best[0],'a',best[1],'b',best[2])
perm,a,b,assign=best
# check permutation is bijective
print('unique assign',len(set(assign.tolist())))
# check if assign matches Lxb
import collections
bd=open(r'D:\ashish\12345678n.Lxb','rb').read(); key=collections.Counter(bd).most_common(1)[0][0]
dd=bytes((x-key)&0xff for x in bd); start=521
layout=sorted([(dd[start+i*16]*256+dd[start+i*16+5], dd[start+i*16+3], dd[start+i*16+9]) for i in range(600)])
# layout: for each idx, (x,y). row-major n=y*30+x -> idx
xy_to_idx={(x,y):idx for idx,x,y in layout}
matches=sum(1 for n in range(600) if assign[n]==xy_to_idx.get((n%30,n//30),-999))
print('Lxb matches',matches,'/600')
