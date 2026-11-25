import collections, cv2, itertools, numpy as np
b=open(r'D:\ashish\12345678n.Lxb','rb').read(); key=collections.Counter(b).most_common(1)[0][0]
d=bytes((x-key)&0xff for x in b); start=521
layout=sorted([(d[start+i*16]*256+d[start+i*16+5], d[start+i*16+3], d[start+i*16+9]) for i in range(600)])
cap=cv2.VideoCapture(r'D:\TOHRAN PROJECT\test_blocks_30x20.avi'); ok,fr=cap.read(); cap.release()
blk=fr.reshape(20,8,30,8,3).mean(axis=(1,3))
src=np.array([[int(round(blk[y,x,2])),int(round(blk[y,x,1])),int(round(blk[y,x,0]))] for _,x,y in layout],dtype=int)
led=np.frombuffer(open(r'D:\ashish\n2\Led\Controller-1\00_program1.led','rb').read()[512:512+3072],dtype=np.uint8)
planes=led.reshape(24,128)
# extract bits per pixel: bit b of byte = (byte>>b)&1
bitorder=[7,6,5,4,3,2,1,0]
bits=np.zeros((24,1024),dtype=np.uint8)
for p in range(24):
    for i in range(1024):
        bits[p,i]=(planes[p,i>>3]>>bitorder[i&7])&1
orders={
 'rgb':list(range(24)),
 'bgr':list(range(23,-1,-1)),
 'revgrp':list(range(7,-1,-1))+list(range(15,7,-1))+list(range(23,15,-1)),
 'interleave':[i+8*c for i in range(8) for c in range(3)],
}
for nm,order in orders.items():
    ob=bits[order]
    for msbfirst in (True,False):
        sh=list(range(7,-1,-1)) if msbfirst else list(range(8))
        cols=np.zeros((1024,3),dtype=int)
        for c in range(3):
            for k in range(8):
                cols[:,c] |= ob[c*8+k].astype(int)<<sh[k]
        # compare to src via exact/near
        hit=sum(1 for s,q in zip(src,cols[:600]) if np.all(np.abs(s-q)<=3))
        print(nm,'msb',msbfirst,'hit',hit,'sample',cols[:5].tolist())
