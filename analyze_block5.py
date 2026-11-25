import collections
led=open(r'D:\ashish\n2\Led\Controller-1\00_program1.led','rb').read()
raw=list(led[512:512+3072])
tail=raw[2048]
Rset={bx*8 for bx in range(30)}; Gset={by*12 for by in range(20)}; allset=Rset|Gset|{128}
def rev(v): return int(f'{v:08b}'[::-1],2)
ops={
 'sub_tail':lambda b:(b-tail)&0xff,
 'sub_tail2':lambda b:(b-tail-2)&0xff,
 'xor_tail':lambda b:b^tail,
 'sub_rev':lambda b:rev((b-tail)&0xff),
 'rev_sub':lambda b:(rev(b)-tail)&0xff,
 'rev_xor':lambda b:rev(b)^tail,
}
for nm,fn in ops.items():
    dec=[fn(b) for b in raw[:1800]]
    c=collections.Counter(dec)
    inall=sum(n for v,n in c.items() if v in allset)
    print(f'{nm:10s} inAVIset={inall:5d}/1800 distinct={len(c):3d} top={c.most_common(6)}')
