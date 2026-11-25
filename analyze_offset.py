import collections
raw=open(r'D:\ashish\nnn\Led\Controller-1\00_program1.led','rb').read()[512:512+3072]
for off in [7,8,9,10,11]:
    dec=[(b-off)&0xff for b in raw]
    vals=[v for v in dec[:1800] if v!=((7-off)&0xff)]
    c=collections.Counter(vals)
    # count how many values are near multiples of 8
    mult8=sum(n for v,n in c.items() if v%8==0)
    print('off',off,'taildec',(7-off)&0xff,'distinct',len(c),'mult8',mult8,'top',c.most_common(6))
