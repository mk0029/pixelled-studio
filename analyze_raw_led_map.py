import collections, cv2, numpy as np
b=open(r'D:\ashish\12345678n.Lxb','rb').read(); key=collections.Counter(b).most_common(1)[0][0]
d=bytes((x-key)&0xff for x in b); start=521
layout=sorted([(d[start+i*16]*256+d[start+i*16+5], d[start+i*16+3], d[start+i*16+9]) for i in range(600)])
cap=cv2.VideoCapture(r'D:\TOHRAN PROJECT\test_blocks_30x20.avi'); ok,fr=cap.read(); cap.release()
blk=fr.reshape(20,8,30,8,3).mean(axis=(1,3))
led=np.frombuffer(open(r'D:\ashish\n2\Led\Controller-1\00_program1.led','rb').read()[512:512+1800],dtype=np.uint8).astype(int)
data=[]
for idx,x,y in layout:
    src=(int(round(blk[y,x,2])),int(round(blk[y,x,1])),int(round(blk[y,x,0])))  # RGB
    raw=tuple(int(v) for v in led[idx*3:idx*3+3])
    data.append((src,raw))
# for each source channel -> raw LED channel, find best affine fit
for sc in range(3):
    for lc in range(3):
        pairs=np.array([(s[sc],t[lc]) for s,t in data])
        A=np.polyfit(pairs[:,0],pairs[:,1],1)
        resid=np.abs(pairs[:,1]-(A[0]*pairs[:,0]+A[1]))
        print('src',sc,'rawLED',lc,'fit',np.round(A,3),'meanres',round(resid.mean(),1))
# check if raw LED byte is a function of source byte (any channel) with low variance
for sc in range(3):
    for lc in range(3):
        mm=collections.defaultdict(list)
        for s,t in data: mm[s[sc]].append(t[lc])
        consistent=sum(1 for k,v in mm.items() if len(set(v))<=2)
        print('src',sc,'-> rawLED',lc,'consistent<=2',consistent,'/',len(mm))
