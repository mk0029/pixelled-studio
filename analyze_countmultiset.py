import collections
rec=collections.Counter(open(r'D:\ashish\Program_1\_rec.bin','rb').read()[:1800])
led=collections.Counter(((b-61)&0xff) for b in open(r'D:\ashish\n2\Led\Controller-1\00_program1.led','rb').read()[512:512+1800])
rc=collections.Counter(rec.values()); lc=collections.Counter(led.values())
print('REC count multiset top',rc.most_common(15))
print('LED count multiset top',lc.most_common(15))
print('same multiset?',rc==lc)
# pair by count
for n in sorted(set(rec.values())|set(led.values()),reverse=True)[:15]:
    rv=[f'{v:02X}' for v,c in rec.items() if c==n]
    lv=[f'{v:02X}' for v,c in led.items() if c==n]
    print('n',n,'rec',rv[:8],'led',lv[:8])
