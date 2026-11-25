import collections, cv2, numpy as np
p=r'D:\ashish\n2\Led\Controller-1\00_program1.led'
led=open(p,'rb').read()
f=led[512:512+3072]
for c in range(0,3072,512):
    h=collections.Counter(f[c:c+512])
    print('sector',c//512,'distinct',len(h),'top',[(f'{k:02X}',v) for k,v in h.most_common(6)])
print()
sigs=collections.defaultdict(list)
fc=led[12]*256+led[13]
for i in range(fc): sigs[led[512+i*3072:512+(i+1)*3072]].append(i)
print('distinct frames',len(sigs),'sizes',sorted([len(v) for v in sigs.values()],reverse=True)[:8])
