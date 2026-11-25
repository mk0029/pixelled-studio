import collections, cv2, numpy as np
led=open(r'D:\ashish\n2\Led\Controller-1\00_program1.led','rb').read()
raw=np.frombuffer(led[512:512+3072],dtype=np.uint8).astype(int)
tail=raw[2048]
print('tail',hex(tail))
for off in [tail, tail+1, tail+2, tail+3]:
    dec=(raw-off)&0xff
    vals=dec[:1800]
    c=collections.Counter(vals)
    print('off',off,'dec tail',(tail-off)&0xff,'top',c.most_common(10))
    print('  mult8',sum(n for v,n in c.items() if v%8==0),'mult12',sum(n for v,n in c.items() if v%12==0),'val128',c.get(128,0))
