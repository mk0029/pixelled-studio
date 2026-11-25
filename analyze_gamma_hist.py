import collections, cv2, numpy as np
led=np.frombuffer(open(r'D:\ashish\n2\Led\Controller-1\00_program1.led','rb').read()[512:512+1800],dtype=np.uint8).astype(int)
dec=(led-61)&0xff
cap=cv2.VideoCapture(r'D:\TOHRAN PROJECT\test_blocks_30x20.avi'); ok,fr=cap.read(); cap.release()
blk=fr.reshape(20,8,30,8,3).mean(axis=(1,3))
R=np.array([blk[by,bx,2] for by in range(20) for bx in range(30)],dtype=float)
G=np.array([blk[by,bx,1] for by in range(20) for bx in range(30)],dtype=float)
B=np.array([blk[by,bx,0] for by in range(20) for bx in range(30)],dtype=float)
src=np.concatenate([R,G,B])
print('LED hist top',collections.Counter(dec.tolist()).most_common(15))
for gam in [1.0,1.8,2.2,0.5556,1/1.8,1/2.2]:
    for form in ['pow','inv']:
        if form=='pow': v=255*np.power(src/255,gam)
        else: v=255*np.power(src/255,1/gam)
        q=np.clip(np.round(v),0,255).astype(int)
        h=collections.Counter(q.tolist())
        print('gam',gam,form,'top',h.most_common(8),'distinct',len(h))
