import collections
import cv2
import numpy as np

led = open(r'D:\ashish\nnn\Led\Controller-1\00_program1.led','rb').read()
f = led[512:512+3072]
mask = 0x07
dec = [(b - mask) & 0xff for b in f]
pix = [tuple(dec[i*3:i*3+3]) for i in range(1024)]

print('decoded sector4 distinct:', set(dec[2048:2056]))
print('first 12 decoded pixels:', [' '.join(f'{v:3d}' for v in p) for p in pix[:12]])
for c in range(3):
    h=collections.Counter(p[c] for p in pix)
    print(f'dec ch{c} distinct={len(h)} top={h.most_common(8)}')

cap=cv2.VideoCapture(r'D:\TOHRAN PROJECT\test_gradient_32x32.avi')
ok,fr=cap.read();cap.release()
small=cv2.resize(fr,(32,32),interpolation=cv2.INTER_AREA)
R=small[:,:,2].astype(int);G=small[:,:,1].astype(int);B=small[:,:,0].astype(int)

# how many decoded triplets contain exactly 128 in one channel?
cnt=collections.Counter()
for p in pix:
    for c in range(3):
        if p[c]==128: cnt[c]+=1
print('decoded channels containing 128:', dict(cnt))

# For each decoded pixel, find AVI cells whose (R,G,B) matches under channel permutations
perms=[(0,1,2),(0,2,1),(1,0,2),(1,2,0),(2,0,1),(2,1,0)]
for perm in perms:
    okc=0
    for i,p in enumerate(pix):
        x=i%32;y=i//32
        src=(R[y,x],G[y,x],B[y,x])
        if all(abs(p[perm[c]]-src[c])<=2 for c in range(3)): okc+=1
    print('perm',perm,'matches@identity',okc)

# global: build lookup for AVI colors -> positions
avimap=collections.defaultdict(list)
for y in range(32):
    for x in range(32):
        avimap[(int(R[y,x]),int(G[y,x]),int(B[y,x]))].append((x,y))
print('unique AVI colors:',len(avimap))
matchcount=0
samples=[]
for i,p in enumerate(pix):
    for perm in perms:
        key=tuple(p[perm[c]] for c in range(3))
        if key in avimap:
            matchcount+=1
            if len(samples)<10: samples.append((i,perm,key,avimap[key][:3]))
            break
print('pixels matching some AVI color under some perm:',matchcount)
for s in samples: print(' ',s)
