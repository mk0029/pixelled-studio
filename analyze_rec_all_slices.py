import numpy as np, collections
rec=np.frombuffer(open(r'D:\ashish\Program_1\_rec.bin','rb').read()[:24576],dtype=np.uint8)
for s in range(8):
    sl=rec[s*3072:(s+1)*3072]
    c=collections.Counter(sl.tolist())
    nz=sum(1 for x in sl if x!=163)
    print('slice',s,'distinct',len(c),'nonA3',nz,'top',c.most_common(5))
