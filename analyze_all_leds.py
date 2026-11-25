import os, hashlib, collections
paths=[r'D:\ashish\Program_1\00.led',r'D:\ashish\Program_1\_T_1000_AC\00_1.led',r'D:\ashish\n2\Led\Controller-1\00_program1.led',r'D:\ashish\nnn\Led\Controller-1\00_program1.led',r'D:\ashish\Led\Controller-1\00_program1.led']
for p in paths:
    b=open(p,'rb').read()
    n=(len(b)-20992)//3072
    frames=[b[512+i*3072:512+(i+1)*3072] for i in range(min(n,200))]
    uniq=len(set(frames))
    c=collections.Counter(frames[0]) if frames else collections.Counter()
    top=c.most_common(4)
    active=sum(1 for x in frames[0] if x!=top[0][0]) if frames else 0
    print(os.path.basename(os.path.dirname(p))+'/'+os.path.basename(p))
    print('  size',len(b),'frames',n,'uniqueFrames',uniq,'sha',hashlib.sha256(b).hexdigest()[:12])
    print('  head32',' '.join(f'{x:02X}' for x in b[:32]))
    print('  frame0 top',top,'nonpad',active)
