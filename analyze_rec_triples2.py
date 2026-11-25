import collections, numpy as np
rec=np.frombuffer(open(r'D:\ashish\Program_1\_rec.bin','rb').read()[:1800],dtype=np.uint8)
tri=rec.reshape(600,3)
for c in range(3):
    col=tri[:,c]
    print('REC triple byte',c,'top',collections.Counter(col.tolist()).most_common(12))
    print('  distinct',len(set(col.tolist())),'min',col.min(),'max',col.max())
# look at unique triples
u=collections.Counter(map(tuple,tri.tolist()))
print('unique triples',len(u))
for t,n in u.most_common(20): print(t,n)
# differences between consecutive triples
d=np.diff(tri.astype(int),axis=0)
print('diff top',collections.Counter(map(tuple,d.tolist())).most_common(10))
