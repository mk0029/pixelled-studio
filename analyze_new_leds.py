import collections, hashlib
paths=[r'D:\BACKUP TORHAN SHOWS\Led\Controller-1\00_program1.led',r'D:\Program_1\_T_1000_AC\00_1.led']
for p in paths:
    b=open(p,'rb').read()
    n=(len(b)-20992)//3072
    print('\n',p)
    print(' size',len(b),'frames',n,'sha',hashlib.sha256(b).hexdigest()[:16])
    print(' head32',' '.join(f'{x:02X}' for x in b[:32]))
    uniq=set()
    for i in range(n):
        uniq.add(b[512+i*3072:512+(i+1)*3072])
    print(' unique frames',len(uniq))
    for k,f in enumerate(list(uniq)[:6]):
        c=collections.Counter(f)
        print('  frame',k,'top',c.most_common(5),'distinct',len(c))
