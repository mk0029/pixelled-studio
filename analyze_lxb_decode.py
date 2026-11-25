import collections
for path in [r'D:\ashish\1234567.Lxb', r'D:\ashish\234.Lxb']:
    b=open(path,'rb').read(); key=b[-1]
    d=bytes((x-key)&0xff for x in b)
    print('\n===',path,'key',hex(key),'len',len(d))
    print('head',' '.join(f'{x:02X}' for x in d[:120]))
    c=collections.Counter(d)
    print('top',[(f'{k:02X}',v) for k,v in c.most_common(15)])
    # nonzero runs
    runs=[]; s=None
    for i,x in enumerate(d):
        if x and s is None: s=i
        if not x and s is not None: runs.append((s,i-s)); s=None
    if s is not None: runs.append((s,len(d)-s))
    print('nonzero runs',len(runs),'first',runs[:20],'last',runs[-5:])
    print('tail',' '.join(f'{x:02X}' for x in d[-32:]))
