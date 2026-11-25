import collections, os
for path in [r'D:\ashish\12345678n.pxb', r'D:\ashish\1234567.pxb', r'D:\ashish\234.pxb']:
    b=open(path,'rb').read()
    print('\n===',os.path.basename(path),'len',len(b))
    print('head',' '.join(f'{x:02X}' for x in b[:64]))
    print('tail',' '.join(f'{x:02X}' for x in b[-32:]))
    c=collections.Counter(b)
    print('top',[(f'{k:02X}',v) for k,v in c.most_common(12)])
    # try tail-key decode
    key=c.most_common(1)[0][0]
    d=bytes((x-key)&0xff for x in b)
    print('key',hex(key),'decoded head',' '.join(f'{x:02X}' for x in d[:64]))
    print('decoded top',[(f'{k:02X}',v) for k,v in collections.Counter(d).most_common(8)])
