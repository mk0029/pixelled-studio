import collections
for path,key in [(r'D:\ashish\1234567.Lxb',0x6C),(r'D:\ashish\234.Lxb',0x4E)]:
    b=open(path,'rb').read()
    print('\n',path,'len',len(b),'tail',hex(b[-1]))
    for op,name in [(lambda x:(x-key)&0xff,'sub'),(lambda x:x^key,'xor')]:
        d=[op(x) for x in b[11:]]
        c=collections.Counter(d)
        print(name,'top',[(f'{k:02X}',v) for k,v in c.most_common(10)],'zeros',c.get(0,0),'distinct',len(c))
        # show first 64 decoded
        print(' head',' '.join(f'{x:02X}' for x in d[:64]))
