import collections
for p in [r'D:\ashish\Led\Controller-1\00_program1.led', r'D:\ashish\nnn\Led\Controller-1\00_program1.led']:
    b=open(p,'rb').read()
    f=b[512:512+3072]
    print(p)
    for c in range(0,3072,512):
        h=collections.Counter(f[c:c+512])
        print(' sector',c//512,'distinct',len(h),'top',[(f'{k:02X}',v) for k,v in h.most_common(4)])
