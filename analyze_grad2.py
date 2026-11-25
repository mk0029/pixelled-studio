import cv2
import numpy as np
import collections

led = open(r'D:\ashish\nnn\Led\Controller-1\00_program1.led', 'rb').read()
lo = 512
pix = [tuple(led[lo+i*3:lo+i*3+3]) for i in range(1024)]

cap = cv2.VideoCapture(r'D:\TOHRAN PROJECT\test_gradient_32x32.avi')
ok, fr = cap.read(); cap.release()
small = cv2.resize(fr, (32,32), interpolation=cv2.INTER_AREA)
R = small[:,:,2]; G = small[:,:,1]; B = small[:,:,0]

print('=== AVI G grid (first 8 rows, every 4th col) ===')
for y in range(0, 32, 4):
    print(f'y={y:2d}:', ' '.join(f'{G[y,x]:3d}' for x in range(0,32,4)))
print('=== LED ch0 grid (first 8 rows, every 4th col) ===')
for y in range(0, 32, 4):
    print(f'y={y:2d}:', ' '.join(f'{pix[y*32+x][0]:3d}' for x in range(0,32,4)))

# Find, for each LED byte value, which AVI (x,y) cells produce it under identity
print('=== value sets ===')
print('AVI G unique:', sorted(set(G.flatten().tolist()))[:10], '...')
print('LED ch0 unique count', len(set(p[0] for p in pix)))

# Check if LED byte = f(AVI cell value) under identity mapping, per channel
for c in range(3):
    m = collections.defaultdict(collections.Counter)
    for y in range(32):
        for x in range(32):
            p = y*32+x
            m[int(R[y,x])][pix[p][c]] += 1
            m[int(G[y,x])][pix[p][c]] += 1
            m[int(B[y,x])][pix[p][c]] += 1
    # print a few stable keys
    print(f'--- LED ch{c}: sample key->value ---')
    for k in sorted(m)[:12]:
        print(f'  src {k:3d}: {[(f"{a:02X}",b) for a,b in m[k].most_common(5)]}')
