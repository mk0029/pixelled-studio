import cv2, numpy as np
rec = open(r'D:\ashish\Program_1\_rec.bin','rb').read()[:24576]
cap=cv2.VideoCapture(r'D:\TOHRAN PROJECT\test_blocks_30x20.avi'); ok,fr=cap.read(); cap.release()
blk=fr.reshape(20,8,30,8,3).mean(axis=(1,3))
exp=np.array([[blk[by,bx,2],blk[by,bx,1],blk[by,bx,0]] for by in range(20) for bx in range(30)],dtype=int)[:600]
data0=np.frombuffer(rec[:3072],dtype=np.uint8)
bits=np.zeros((24,1024),dtype=np.uint8)
for p in range(24):
    for i in range(1024):
        bits[p,i]=(data0[p*128+(i>>3)]>>(7-(i&7)))&1
for ordername,order in [('msb',list(range(7,-1,-1))),('lsb',list(range(8)))]:
    for cperm in [(0,1,2),(2,1,0)]:
        chans=[]
        for c in cperm:
            gb=bits[c*8:(c+1)*8]
            v=np.zeros(1024,dtype=np.int32)
            for j,idx in enumerate(order):
                v |= gb[idx].astype(np.int32)<<j
            chans.append(v)
        cols=np.stack(chans,axis=1)[:600]
        d=np.abs(cols[:,None,:]-exp[None,:,:])
        near=np.any(np.all(d<=3,axis=2),axis=1).sum()
        print(ordername,'perm',cperm,'near',near,'sample',cols[:5].tolist())
