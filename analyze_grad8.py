import collections
import cv2, numpy as np
led=open(r'D:\ashish\nnn\Led\Controller-1\00_program1.led','rb').read()
dec=[(b-7)&0xff for b in led[512:512+3072]]
pix=[tuple(dec[i*3:i*3+3]) for i in range(1024)]
print('fully black pixels:',sum(p==(0,0,0) for p in pix))
print('last non-black index:',max(i for i,p in enumerate(pix) if p!=(0,0,0)))
print('first non-black index:',min(i for i,p in enumerate(pix) if p!=(0,0,0)))
print('non-black count in ranges:')
for lo in range(0,1024,128):
    print(f' {lo:4d}-{lo+127:4d}: {sum(p!=(0,0,0) for p in pix[lo:lo+128])}')

# Look at the decoded non-black values - are they multiples of 2?
nzb=[v for p in pix for v in p if v!=0]
print('nonzero count',len(nzb),'all even?',all(v%2==0 for v in nzb))
print('sample sorted unique',sorted(set(nzb))[:40])

# check decoded values /2
print('dec/2 unique count',len(set(v//2 for v in nzb)))
print('dec/2 sample',sorted(set(v//2 for v in nzb))[:40])
