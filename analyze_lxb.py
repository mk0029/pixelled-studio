import collections, os
for p in [r'D:\ashish\1234567.Lxb', r'D:\ashish\234.Lxb']:
    b=open(p,'rb').read()
    print(p,'len',len(b))
    # find longest run
    best=(0,0,0); i=0
    while i<len(b):
        j=i
        while j<len(b) and b[j]==b[i]: j+=1
        if j-i>best[1]: best=(i,j-i,b[i])
        i=j
    print(' longest run',best)
    print(' head', ' '.join(f'{x:02X}' for x in b[:32]))
    # byte histogram
    h=collections.Counter(b)
    print(' distinct',len(h),'top',[(f'{k:02X}',v) for k,v in h.most_common(8)])
    # check XOR with single byte for low entropy region
    for k in range(256):
        t=bytes(x^k for x in b[16:1024-16])
        c=collections.Counter(t)
        if len(c)<40:
            print(' XOR',hex(k),'distinct',len(c),'top',[(f'{a:02X}',n) for a,n in c.most_common(5)])
            break
