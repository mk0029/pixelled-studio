import collections
rec=open(r'D:\ashish\Program_1\_rec.bin','rb').read()[:3072]
led=open(r'D:\ashish\nnn\Led\Controller-1\00_program1.led','rb').read()
raw=[(b)&0xff for b in led[512:512+3072]]
# group by REC value -> set of LED raw triplets at same index
m=collections.defaultdict(collections.Counter)
for i in range(1024):
    m[rec[i]][tuple(raw[i*3:i*3+3])]+=1
clean=0
for k,v in sorted(m.items()):
    if len(v)==1: clean+=1
print('REC values with a single LED triplet at same index:',clean,'/',len(m))
# distribution of number of distinct LED triplets per REC value
print('counts:',collections.Counter(len(v) for v in m.values()))
# show a few
for k in sorted(m)[:12]:
    print(f'{k:02X} n={sum(m[k].values())} distinct={len(m[k])} top={[(tuple(f"{x:02X}" for x in tr),n) for tr,n in m[k].most_common(3)]}')
