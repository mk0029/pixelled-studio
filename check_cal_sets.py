import os, collections
base=r'D:\ashish\celibration\Led\Controller-1'
sets={}
for name in ['red','green','blue']:
    b=open(os.path.join(base,name+'.led'),'rb').read()
    raw=b[512:512+3072]
    mask=collections.Counter(raw[2048:]).most_common(1)[0][0]
    dec=bytes((x-mask)&0xff for x in raw)
    sets[name]={i for i,x in enumerate(dec) if x!=0}
for a in sets:
    for b in sets:
        if a<b: print(a,b,'intersection',len(sets[a]&sets[b]))
u=sets['red']|sets['green']|sets['blue']
print('union size',len(u),'max',max(u))
# histogram of gap within each set sorted
for name,s in sets.items():
    v=sorted(s)
    gaps=collections.Counter(v[i+1]-v[i] for i in range(len(v)-1))
    print(name,'gap hist',gaps.most_common(8))
