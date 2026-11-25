import collections
rec=open(r'D:\ashish\Program_1\_rec.bin','rb').read()[:3072]
led=open(r'D:\ashish\nnn\Led\Controller-1\00_program1.led','rb').read()
raw=led[512:512+3072]
m=collections.defaultdict(collections.Counter)
for i in range(1024):
    m[rec[i]][raw[i*3]]+=1
# for top REC values, show LED ch0 histogram
for k in [0xF1,0x72,0x71,0x73,0x51,0x69,0xA9,0xF2,0xF3,0x00]:
    if k in m:
        v=m[k]
        print(f'REC {k:02X} n={sum(v.values())} -> LEDch0 {[(f"{a:02X}",b) for a,b in v.most_common(10)]}')
