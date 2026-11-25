import struct, collections
for path,key,start in [(r'D:\ashish\1234567.Lxb',0x6c,512),(r'D:\ashish\234.Lxb',0x4e,512)]:
    b=open(path,'rb').read(); d=bytes((x-key)&0xff for x in b)
    print('\n===',path)
    recs=[d[start+i*16:start+(i+1)*16] for i in range(600)]
    for i,r in enumerate(recs[:12]):
        u=struct.unpack('<8H',r)
        print(i,r.hex(' '),'u16',u)
    # field value ranges
    for f in range(8):
        vals=[struct.unpack('<8H',r)[f] for r in recs]
        print('field',f,'min',min(vals),'max',max(vals),'distinct',len(set(vals)),'top',collections.Counter(vals).most_common(5))
