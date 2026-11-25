import collections, cv2, numpy as np
rec=open(r'D:\ashish\Program_1\_rec.bin','rb').read()[:3072]
cap=cv2.VideoCapture(r'D:\TOHRAN PROJECT\test_blocks_30x20.avi'); ok,fr=cap.read(); cap.release()
blk=fr.reshape(20,8,30,8,3).mean(axis=(1,3))
print('REC hist top',collections.Counter(rec).most_common(20))
for c,nm in [(2,'R'),(1,'G'),(0,'B')]:
    a=blk[:,:,c].astype(int).flatten()
    print('AVI',nm,'hist top',collections.Counter(a).most_common(12))
# check if REC values equal AVI values under scaling
for scale in [1,2,3,4,8]:
    hits=sum(1 for i in range(1024) if rec[i] in set(int(v*scale)&0xff for v in blk[:,:,2].flatten()))
    print('scale',scale,'REC in scaled-R set',hits)
