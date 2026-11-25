import collections, cv2, numpy as np
# layout
path=r'D:\ashish\12345678n.Lxb'
b=open(path,'rb').read(); key=collections.Counter(b).most_common(1)[0][0]
d=bytes((x-key)&0xff for x in b)
start=521
recs=[d[start+i*16:start+(i+1)*16] for i in range(600)]
layout=[(r[0]*256+r[5], r[3], r[9]) for r in recs]
layout.sort()
print('layout first',layout[:12],'unique idx',len(set(i for i,_,_ in layout)))
# source AVI block colours
cap=cv2.VideoCapture(r'D:\TOHRAN PROJECT\test_blocks_30x20.avi'); ok,fr=cap.read(); cap.release()
blk=fr.reshape(20,8,30,8,3).mean(axis=(1,3))
# decoded LED
led=np.frombuffer(open(r'D:\ashish\n2\Led\Controller-1\00_program1.led','rb').read()[512:512+3072],dtype=np.uint8).astype(int)
tail=led[2048]
dec=(led-tail)&0xff
pix=[tuple(dec[i*3:i*3+3]) for i in range(1024)]
# map physical stream position p -> source block
rows=[]
for p,(idx,x,y) in enumerate(layout):
    src=tuple(int(round(v)) for v in blk[y,x])  # BGR from cv2
    rows.append((idx,p,x,y,src,pix[idx]))
print('sample rows (p,idx,x,y,srcBGR,led):')
for r in rows[:15]: print(r)
# correlations between LED channels and source channels
S=np.array([r[4] for r in rows])
L=np.array([r[5] for r in rows])
for si,nm in enumerate(['B','G','R']):
    print('src',nm,'corr led ch0/1/2',[round(float(np.corrcoef(S[:,si],L[:,c])[0,1]),3) for c in range(3)])
# exact/near matches under channel permutations
for perm in [(0,1,2),(2,1,0),(1,2,0),(0,2,1),(1,0,2),(2,0,1)]:
    for tol in [0,1,2,3,5,10]:
        n=sum(1 for s,l in zip(S,L) if all(abs(l[perm[j]]-s[j])<=tol for j in range(3)))
        if n>50: print('perm',perm,'tol',tol,'matches',n,'/600')
