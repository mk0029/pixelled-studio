import collections, numpy as np
rec=np.frombuffer(open(r'D:\ashish\Program_1\_rec.bin','rb').read()[:1800],dtype=np.uint8).astype(int)
led=np.frombuffer(open(r'D:\ashish\n2\Led\Controller-1\00_program1.led','rb').read()[512:512+1800],dtype=np.uint8).astype(int)
d=(led-rec)&0xff
# What offset would make REC pixel i match LED pixel i?
offs=[]
for p in range(600):
    tri_d=d[p*3:p*3+3].tolist()
    # if all 3 bytes same offset
    if tri_d[0]==tri_d[1]==tri_d[2]: offs.append(tri_d[0])
print('pixels with constant offset',len(offs),'top',collections.Counter(offs).most_common(10))
# more general: what if rec pixel i maps to led pixel j?
# For each rec pixel, find led pixels that differ by constant offset in all 3 channels
best=[]
for i in range(600):
    r=rec[i*3:i*3+3]
    for j in range(600):
        l=led[j*3:j*3+3]
        dd=(l-r)&0xff
        if dd[0]==dd[1]==dd[2]:
            best.append((i,j,dd[0]))
print('constant-offset pairs',len(best))
print('sample',best[:20])
print('offset dist',collections.Counter(x[2] for x in best).most_common(10))
