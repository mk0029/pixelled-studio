import numpy as np
rec=np.frombuffer(open(r'D:\ashish\Program_1\_rec.bin','rb').read()[:3072],dtype=np.uint8).astype(int)
raw=np.frombuffer(open(r'D:\ashish\nnn\Led\Controller-1\00_program1.led','rb').read()[512:512+3072],dtype=np.uint8).astype(int)
best=[]
for sh in range(-64,65):
    if sh>=0: a=rec[:3072-sh]; b=raw[sh:]
    else: a=rec[-sh:]; b=raw[:3072+sh]
    c=np.corrcoef(a,b)[0,1]
    best.append((abs(c),sh,c))
best.sort(reverse=True)
print('top shifts:',best[:10])
# also test byte-value maps: for each REC value, most common raw byte
import collections
m=collections.defaultdict(collections.Counter)
for i in range(3072): m[rec[i]][raw[i]]+=1
clean=sum(1 for v in m.values() if len(v)==1)
print('clean per-value maps:',clean,'/',len(m))
