import collections, cv2, numpy as np
b=open(r'D:\ashish\12345678n.Lxb','rb').read(); key=collections.Counter(b).most_common(1)[0][0]
d=bytes((x-key)&0xff for x in b); start=521
layout=[(d[start+i*16+0]*256+d[start+i*16+5], d[start+i*16+3], d[start+i*16+9]) for i in range(600)]
cap=cv2.VideoCapture(r'D:\TOHRAN PROJECT\test_blocks_30x20.avi'); ok,fr=cap.read(); cap.release()
blk=fr.reshape(20,8,30,8,3).mean(axis=(1,3))
rec=np.frombuffer(open(r'D:\ashish\Program_1\_rec.bin','rb').read()[:3072],dtype=np.uint8).astype(int)
# try mapping by record order and by index sort
for mode in ['record','index']:
    lay=sorted(layout) if mode=='index' else layout
    print('\nMODE',mode)
    data=[]
    for p,(idx,x,y) in enumerate(lay):
        src=(int(round(blk[y,x,2])),int(round(blk[y,x,1])),int(round(blk[y,x,0])))  # R,G,B
        rp=tuple(rec[idx*3:idx*3+3])
        data.append((src,rp))
    for si,nm in enumerate(['R','G','B']):
        m=collections.defaultdict(list)
        for s,r in data: m[s[si]].append(r)
        print('src',nm)
        for k in sorted(m)[:12]:
            arr=np.array(m[k])
            print(' ',k,'n',len(arr),'means',np.round(arr.mean(axis=0),1).astype(int).tolist(),'top0',collections.Counter(arr[:,0].tolist()).most_common(3))
