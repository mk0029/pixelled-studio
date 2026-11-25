import collections
files=[(r'D:\ashish\1234567.Lxb',0x6c),(r'D:\ashish\234.Lxb',0x4e)]
decs=[]
for path,key in files:
    b=open(path,'rb').read(); d=bytes((x-key)&0xff for x in b); decs.append(d)
    print('\n===',path)
    for off in range(0,10240,512):
        blk=d[off:off+512]; c=collections.Counter(blk)
        nz=sum(v for k,v in c.items() if k)
        print(f'{off:5d} nz={nz:4d} distinct={len(c):3d} top={[(f"{k:02X}",v) for k,v in c.most_common(4)]}')
a,d=decs
print('\ndiff equal bytes',sum(1 for i in range(10240) if a[i]==d[i]))
# show decoded rows around 512-byte boundaries for file1
for off in [0,256,512,768,1024,2048,4096,8192,10000]:
    print('A',off,' '.join(f'{x:02X}' for x in a[off:off+48]))
    print('B',off,' '.join(f'{x:02X}' for x in d[off:off+48]))
