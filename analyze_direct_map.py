import collections, cv2, numpy as np
b=open(r'D:\ashish\12345678n.Lxb','rb').read(); key=collections.Counter(b).most_common(1)[0][0]
d=bytes((x-key)&0xff for x in b); start=521
layout=sorted([(d[start+i*16]*256+d[start+i*16+5], d[start+i*16+3], d[start+i*16+9]) for i in range(600)])
cap=cv2.VideoCapture(r'D:\TOHRAN PROJECT\test_blocks_30x20.avi'); ok,fr=cap.read(); cap.release()
blk=fr.reshape(20,8,30,8,3).mean(axis=(1,3))
led=np.frombuffer(open(r'D:\ashish\n2\Led\Controller-1\00_program1.led','rb').read()[512:512+3072],dtype=np.uint8).astype(int)
tail=led[2048]
dec=(led-tail)&0xff
# for each LED index, source color and decoded RGB triple
data=[]
for idx,x,y in layout:
    src=(int(round(blk[y,x,2])),int(round(blk[y,x,1])),int(round(blk[y,x,0])))  # R,G,B
    tri=tuple(int(v) for v in dec[idx*3:idx*3+3])
    data.append((src,tri))
# group by source R (mostly 0 or 1), G, B
m=collections.defaultdict(list)
for s,t in data: m[s].append(t)
print('unique source colors',len(m))
for s in sorted(m)[:10]:
    arr=np.array(m[s])
    print('src',s,'n',len(arr),'LED tri top',collections.Counter(map(tuple,arr.tolist())).most_common(3))
# check if any single LED channel is a function of any single source channel
for sc in range(3):
    for lc in range(3):
        mm=collections.defaultdict(set)
        for s,t in data: mm[s[sc]].add(t[lc])
        consistent=sum(1 for k,v in mm.items() if len(v)==1)
        print('src ch',sc,'-> LED ch',lc,'consistent',consistent,'/',len(mm))
