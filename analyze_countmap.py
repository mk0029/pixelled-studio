import collections
rec=open(r'D:\ashish\Program_1\_rec.bin','rb').read()[:3072]
led=open(r'D:\ashish\n2\Led\Controller-1\00_program1.led','rb').read()
tail=led[512+2048]
dec=[(b-tail)&0xff for b in led[512:512+3072]]
rc=collections.Counter(rec); lc=collections.Counter(dec)
# for each REC value (n>=5), find LED values with closest count
for r,n in rc.most_common(30):
    cands=sorted(lc.items(),key=lambda kv:abs(kv[1]-n))[:4]
    print(f'REC {r:02X} n={n:4d} -> LED cands {[(f"{k:02X}",v) for k,v in cands]}')
