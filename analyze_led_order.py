import collections, numpy as np
b=open(r'D:\ashish\12345678n.Lxb','rb').read(); key=collections.Counter(b).most_common(1)[0][0]
d=bytes((x-key)&0xff for x in b); start=521
layout=sorted([(d[start+i*16]*256+d[start+i*16+5], d[start+i*16+3], d[start+i*16+9]) for i in range(600)])
rec=np.frombuffer(open(r'D:\ashish\Program_1\_rec.bin','rb').read()[:1800],dtype=np.uint8).astype(int)
led=np.frombuffer(open(r'D:\ashish\n2\Led\Controller-1\00_program1.led','rb').read()[512:512+1800],dtype=np.uint8).astype(int)
tail=0x3d
dec=(led-tail)&0xff
# LED in row-major (x,y): pixel n = (x=n%30, y=n//30)
# layout maps rec index -> (x,y), so LED row-major pixel should come from rec index where layout has that (x,y)
xy_to_idx={}
for idx,x,y in layout: xy_to_idx[(x,y)]=idx
m=0
for n in range(600):
    x,y=n%30,n//30
    ri=xy_to_idx.get((x,y))
    if ri is None: continue
    if np.array_equal(rec[ri*3:ri*3+3],dec[n*3:n*3+3]): m+=1
print('row-major match',m)
# try with offset 154
for off in [154,93,61,107]:
    m=0
    for n in range(600):
        x,y=n%30,n//30
        ri=xy_to_idx.get((x,y))
        if ri is None: continue
        if np.array_equal((rec[ri*3:ri*3+3]+off)&0xff,dec[n*3:n*3+3]): m+=1
    print('row-major off',off,'match',m)
# try rec order -> led row-major
m=0
for idx,x,y in layout:
    n=y*30+x
    if np.array_equal(rec[idx*3:idx*3+3],dec[n*3:n*3+3]): m+=1
print('rec->rowmajor match',m)
