import collections
rec=open(r'D:\ashish\Program_1\_rec.bin','rb').read()
print('len',len(rec),'frames',len(rec)//24576)
f=rec[:24576]
for s in range(8):
    sl=f[s*3072:(s+1)*3072]
    h=collections.Counter(sl)
    print('slice',s,'distinct',len(h),'top',[(f'{k:02X}',v) for k,v in h.most_common(6)])
# compare slices
for s in range(1,8):
    eq=sum(1 for i in range(3072) if f[i]==f[s*3072+i])
    print('slice0 vs',s,'equal',eq)
