import collections, cv2, itertools, numpy as np
b=open(r'D:\ashish\12345678n.Lxb','rb').read(); key=collections.Counter(b).most_common(1)[0][0]
d=bytes((x-key)&0xff for x in b); start=521
layout=sorted([(d[start+i*16]*256+d[start+i*16+5], d[start+i*16+3], d[start+i*16+9]) for i in range(600)])
cap=cv2.VideoCapture(r'D:\TOHRAN PROJECT\test_blocks_30x20.avi'); ok,fr=cap.read(); cap.release()
blk=fr.reshape(20,8,30,8,3).mean(axis=(1,3))
src=np.array([[blk[y,x,2],blk[y,x,1],blk[y,x,0]] for _,x,y in layout],dtype=int)[:600]  # RGB
rec=np.frombuffer(open(r'D:\ashish\Program_1\_rec.bin','rb').read()[:1800],dtype=np.uint8).reshape(600,3).astype(int)
# test each source channel -> each rec channel with gamma encode/decode and additive offset
def fit(s,r,gamma):
    # r = 255*(s/255)^gamma + off  OR  r = 255*(s/255)^(1/gamma) + off
    pred=255*(s/255.0)**gamma
    offs=np.round(r-pred).astype(int)
    # score: fraction where |r-pred-off| <= 2 for the modal off
    if len(offs)==0: return 0,None
    mode=collections.Counter(offs.tolist()).most_common(1)[0]
    score=sum(1 for o in offs if abs(o-mode[0])<=2)/len(offs)
    return score,mode
for gamma in [1.0,1.8,1/1.8,2.2,1/2.2,0.5]:
    for sc in range(3):
        for rc in range(3):
            s1,o1=fit(src[:,sc],rec[:,rc],gamma)
            s2,o2=fit(src[:,sc],rec[:,rc],1/gamma)
            if max(s1,s2)>0.5: print('g',round(gamma,3),'src',sc,'rec',rc,'pow',round(s1,3),o1,'inv',round(s2,3),o2)
