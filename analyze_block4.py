import collections
led=open(r'D:\ashish\n2\Led\Controller-1\00_program1.led','rb').read()
raw=np.frombuffer(led[512:512+3072],dtype=np.uint8).astype(int) if False else list(led[512:512+3072])
Rset={bx*8 for bx in range(30)}
Gset={by*12 for by in range(20)}
Bset={128}
allset=Rset|Gset|Bset
for off in [61,63]:
    dec=[(b-off)&0xff for b in raw]
    pix=[tuple(dec[i*3:i*3+3]) for i in range(1024)]
    nall=sum(1 for p in pix[:600] if all(v in allset for v in p))
    n2=sum(1 for p in pix[:600] if sum(1 for v in p if v in allset)>=2)
    print('off',off,'all3 in expected set',nall,'at least2',n2)
    # counts per channel of membership
    for c in range(3):
        print('  ch',c,'in R',sum(1 for p in pix[:600] if p[c] in Rset),'in G',sum(1 for p in pix[:600] if p[c] in Gset),'is128',sum(1 for p in pix[:600] if p[c]==128))
    print('  sample pixels',pix[:12])
