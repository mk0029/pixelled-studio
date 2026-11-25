import collections
rec=open(r'D:\ashish\Program_1\_rec.bin','rb').read()[:3072]
led=open(r'D:\ashish\n2\Led\Controller-1\00_program1.led','rb').read()
tail=led[512+2048]
dec=[(b-tail-2)&0xff for b in led[512:512+3072]]
m=collections.defaultdict(collections.Counter)
for i in range(3072): m[dec[i]][rec[i]]+=1
for k in [0x50,0x90,0xD0,0xFE,0xBE,0x1C,0x46,0x56]:
    v=m.get(k,{})
    print(f'LED {k:02X} n={sum(v.values())} -> REC {[(f"{a:02X}",b) for a,b in v.most_common(8)]}')
