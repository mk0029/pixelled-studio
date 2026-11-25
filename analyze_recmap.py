import collections
rec=open(r'D:\ashish\Program_1\_rec.bin','rb').read()[:3072]
led=open(r'D:\ashish\n2\Led\Controller-1\00_program1.led','rb').read()
tail=led[512+2048]
dec=[(b-tail-2)&0xff for b in led[512:512+3072]]
m=collections.defaultdict(collections.Counter)
for i in range(3072):
    m[rec[i]][dec[i]]+=1
print('REC distinct',len(m),'clean maps',sum(1 for v in m.values() if len(v)==1))
for k in sorted(m):
    v=m[k]
    if sum(v.values())>=5:
        print(f'REC {k:02X} n={sum(v.values()):4d} -> LED {[(f"{a:02X}",b) for a,b in v.most_common(5)]}')
