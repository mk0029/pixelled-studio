import numpy as np, collections
rec=np.frombuffer(open(r'D:\ashish\Program_1\_rec.bin','rb').read()[:24576],dtype=np.uint8)
led=np.frombuffer(open(r'D:\ashish\n2\Led\Controller-1\00_program1.led','rb').read()[512:512+3072],dtype=np.uint8)
for s in range(8):
    sl=rec[s*3072:(s+1)*3072]
    d=(led.astype(int)-sl.astype(int))&0xff
    c=collections.Counter(d.tolist())
    print('slice',s,'top diff',c.most_common(5),'exact',(d==0).sum())
