import collections, numpy as np
b=open(r'D:\ashish\12345678n.Lxb','rb').read(); key=collections.Counter(b).most_common(1)[0][0]
d=bytes((x-key)&0xff for x in b); start=521
layout=sorted([(d[start+i*16]*256+d[start+i*16+5], d[start+i*16+3], d[start+i*16+9]) for i in range(600)])
rec=np.frombuffer(open(r'D:\ashish\Program_1\_rec.bin','rb').read()[:1800],dtype=np.uint8).astype(int)
led=np.frombuffer(open(r'D:\ashish\n2\Led\Controller-1\00_program1.led','rb').read()[512:512+1800],dtype=np.uint8).astype(int)
tail=0x3d
dec=(led-tail)&0xff
# rec in layout order: pixel i (i=0..599) -> led pixel at index layout[i][0]
match=0
for i,(idx,x,y) in enumerate(layout):
    r=rec[i*3:i*3+3]
    l=dec[idx*3:idx*3+3]
    if np.array_equal(r,l): match+=1
print('exact match',match,'/600')
# try offset 154
for off in [154]:
    m=0
    for i,(idx,x,y) in enumerate(layout):
        r=(rec[i*3:i*3+3]+off)&0xff
        l=dec[idx*3:idx*3+3]
        if np.array_equal(r,l): m+=1
    print('off',off,'match',m)
# reverse: rec pixel at index i -> led pixel at layout-order position i
# (i.e., led pixel idx -> rec pixel at position of layout entry with that idx)
m=0
for i,(idx,x,y) in enumerate(layout):
    r=rec[idx*3:idx*3+3]
    l=dec[i*3:i*3+3]
    if np.array_equal(r,l): m+=1
print('reverse match',m)
