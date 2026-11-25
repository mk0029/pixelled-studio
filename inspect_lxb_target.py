import collections
path=r'D:\ashish\12345678n.Lxb'
b=open(path,'rb').read(); key=collections.Counter(b).most_common(1)[0][0]
d=bytes((x-key)&0xff for x in b)
start=521
recs=[d[start+i*16:start+(i+1)*16] for i in range(600)]
print('key',hex(key),'raw head',b[:32].hex(' '))
print('dec head',d[:64].hex(' '))
for b_ in range(16):
    vals=[r[b_] for r in recs]
    print('byte',b_,'distinct',len(set(vals)),'min',min(vals),'max',max(vals),'top',collections.Counter(vals).most_common(5))
for i,r in enumerate(recs[:12]): print(i,' '.join(f'{x:02X}' for x in r))
