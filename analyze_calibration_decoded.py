import os, collections
base=r'D:\ashish\celibration\Led\Controller-1'
for name in ['black','red','green','blue']:
    b=open(os.path.join(base,name+'.led'),'rb').read()
    n=(len(b)-20992)//3072
    raw=b[512:512+3072]
    mask=collections.Counter(raw[2048:]).most_common(1)[0][0]
    dec=bytes((x-mask)&0xff for x in raw)
    c=collections.Counter(dec)
    print(name,'mask',hex(mask),'decoded top',c.most_common(5),'distinct',len(c))
    for ch in range(3):
        vals=collections.Counter(dec[ch::3])
        print('  channel',ch,'top',vals.most_common(3))
    on=[i for i,x in enumerate(dec) if x!=0]
    print('  on positions first',on[:12],'last',on[-6:],'count',len(on))
