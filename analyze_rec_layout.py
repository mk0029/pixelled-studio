import collections, cv2, numpy as np
b=open(r'D:\ashish\12345678n.Lxb','rb').read(); key=collections.Counter(b).most_common(1)[0][0]
d=bytes((x-key)&0xff for x in b); start=521
layout=sorted([(d[start+i*16+0]*256+d[start+i*16+5], d[start+i*16+3], d[start+i*16+9]) for i in range(600)])
cap=cv2.VideoCapture(r'D:\TOHRAN PROJECT\test_blocks_30x20.avi'); ok,fr=cap.read(); cap.release()
blk=fr.reshape(20,8,30,8,3).mean(axis=(1,3))
rec=np.frombuffer(open(r'D:\ashish\Program_1\_rec.bin','rb').read()[:3072],dtype=np.uint8).astype(int)
pix=[tuple(rec[i*3:i*3+3]) for i in range(1024)]
rows=[]
for idx,x,y in layout:
    src=tuple(int(round(v)) for v in blk[y,x])
    rows.append((src,pix[idx]))
S=np.array([r[0] for r in rows]); L=np.array([r[1] for r in rows])
for si,nm in enumerate(['B','G','R']):
    print('src',nm,'corr rec ch0/1/2',[round(float(np.corrcoef(S[:,si],L[:,c])[0,1]),3) for c in range(3)])
for perm in [(0,1,2),(2,1,0),(1,2,0),(0,2,1),(1,0,2),(2,0,1)]:
    for tol in [0,1,2,3,5,10]:
        n=sum(1 for s,l in zip(S,L) if all(abs(l[perm[j]]-s[j])<=tol for j in range(3)))
        if n>50: print('perm',perm,'tol',tol,'matches',n)
print('samples',rows[:10])
