import collections, cv2, itertools, numpy as np

rec = open(r'D:\ashish\Program_1\_rec.bin','rb').read()[:24576]
cap=cv2.VideoCapture(r'D:\TOHRAN PROJECT\test_blocks_30x20.avi'); ok,fr=cap.read(); cap.release()
blk=fr.reshape(20,8,30,8,3).mean(axis=(1,3))
exp=[tuple(int(round(v)) for v in blk[by,bx]) for by in range(20) for bx in range(30)]  # RGB
expset=set(exp)
# lookup with tolerance
def near(q,tol=2):
    return any((q[0]-e[0])**2+(q[1]-e[1])**2+(q[2]-e[2])**2 <= tol*tol*3 for e in expset)

# expected per-channel histograms (RGB)
eh=[collections.Counter([e[c] for e in exp]) for c in range(3)]

best=[]
for off in range(256):
    data=np.frombuffer(bytes((b-off)&0xff for b in rec),dtype=np.uint8)
    for bitpos in range(8):
        # 24 packets x 1024 LEDs -> bits
        bits=((data.reshape(24,1024)>>bitpos)&1).astype(np.uint8)
        for rev in (False,True):
            order=list(range(7,-1,-1)) if rev else list(range(8))
            for perm in itertools.permutations(range(3)):
                chans=[]
                for c in perm:
                    vals=bits[c*8+order[0]:c*8+order[0]+8] if False else None
                    # assemble LSB-first by default; order selects within each byte group
                    gb=bits[c*8:(c+1)*8]
                    v=np.zeros(1024,dtype=np.int32)
                    for j,idx in enumerate(order):
                        v |= gb[idx].astype(np.int32) << j
                    chans.append(v)
                colors=list(zip(chans[0].tolist(),chans[1].tolist(),chans[2].tolist()))
                hit=sum(1 for q in colors[:600] if near(q,2))
                if hit>200:
                    best.append((hit,off,bitpos,rev,perm,colors[:8]))
best.sort(reverse=True)
print('candidates',len(best))
for x in best[:15]:
    print('hit',x[0],'off',hex(x[1]),'bit',x[2],'rev',x[3],'perm',x[4],'head',x[5])
