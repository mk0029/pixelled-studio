import collections, cv2, numpy as np
b=open(r'D:\ashish\12345678n.Lxb','rb').read(); key=collections.Counter(b).most_common(1)[0][0]
d=bytes((x-key)&0xff for x in b); start=521
layout=sorted([(d[start+i*16]*256+d[start+i*16+5], d[start+i*16+3], d[start+i*16+9]) for i in range(600)])
cap=cv2.VideoCapture(r'D:\TOHRAN PROJECT\test_blocks_30x20.avi'); ok,fr=cap.read(); cap.release()
blk=fr.reshape(20,8,30,8,3).mean(axis=(1,3))
rec=np.frombuffer(open(r'D:\ashish\Program_1\_rec.bin','rb').read()[:1800],dtype=np.uint8).astype(int)
# REC pixel i corresponds to source (x,y) from layout? build LUT
for mode in ['index','record']:
    print('\nMODE',mode)
    for perm in [(0,1,2),(2,1,0),(1,2,0),(0,2,1),(1,0,2),(2,0,1)]:
        lut=[collections.defaultdict(list) for _ in range(3)]
        for i,(idx,x,y) in enumerate(layout):
            src=(int(round(blk[y,x,2])),int(round(blk[y,x,1])),int(round(blk[y,x,0])))  # RGB
            rp=rec[idx*3:idx*3+3] if mode=='index' else rec[i*3:i*3+3]
            for c in range(3): lut[c][src[perm[c]]].append(rp[c])
        # score consistency
        scores=[]
        for c in range(3):
            consistent=sum(1 for k,v in lut[c].items() if len(set(v))<=2)
            scores.append((consistent,len(lut[c])))
        if sum(s[0] for s in scores)>50: print('perm',perm,'scores',scores)
