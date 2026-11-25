import os, collections, hashlib
base=r'D:\ashish\celibration\Led\Controller-1'
for name in ['black','red','green','blue']:
    p=os.path.join(base,name+'.led')
    b=open(p,'rb').read()
    n=(len(b)-20992)//3072
    frames=[b[512+i*3072:512+(i+1)*3072] for i in range(n)]
    uniq=len(set(frames))
    c=collections.Counter(frames[0])
    print(name,'size',len(b),'frames',n,'unique',uniq,'sha',hashlib.sha256(b).hexdigest()[:12])
    print('  head32',' '.join(f'{x:02X}' for x in b[:32]))
    print('  frame0 top',c.most_common(6),'distinct',len(c))
    print('  first12',' '.join(f'{x:02X}' for x in frames[0][:12]))
