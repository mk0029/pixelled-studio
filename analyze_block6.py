import collections
led=open(r'D:\ashish\n2\Led\Controller-1\00_program1.led','rb').read()
tail=led[512+2048]
dec=[(b-tail)&0xff for b in led[512:512+3072]]
pix=[tuple(dec[i*3:i*3+3]) for i in range(1024)]
c=collections.Counter(sum(1 for v in p if v==(0-tail)&0xff) for p in pix[:600])
print('count of mask/blank bytes per pixel:',c)
# how many distinct values per pixel
print('distinct per pixel',collections.Counter(len(set(p)) for p in pix[:600]))
print('sample 30 pixels',pix[:30])
# distribution of nonblank value counts
nb=collections.Counter(sum(1 for v in p if v!=((0-tail)&0xff)) for p in pix[:600])
print('nonblank per pixel',nb)
