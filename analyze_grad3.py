import collections
import cv2
import numpy as np

REC = r'D:\ashish\Program_1\_rec.bin'
LED = r'D:\ashish\nnn\Led\Controller-1\00_program1.led'
rec = open(REC,'rb').read()
led = open(LED,'rb').read()
fc = led[12]*256+led[13]
print('rec len',len(rec),'frames',len(rec)//24576,'led frames',fc)

# per-slice histograms for REC frame 0
f0 = rec[:24576]
for s in range(8):
    sl = f0[s*3072:(s+1)*3072]
    h = collections.Counter(sl)
    print(f'REC slice {s}: distinct={len(h)} top={[(f"{k:02X}",v) for k,v in h.most_common(6)]}')

# LED frame 0
lo=512
pix = [tuple(led[lo+i*3:lo+i*3+3]) for i in range(1024)]
for c in range(3):
    h=collections.Counter(p[c] for p in pix)
    print(f'LED ch{c} distinct={len(h)} top={[(f"{k:02X}",v) for k,v in h.most_common(10)]}')

# decode AVI gradients
cap=cv2.VideoCapture(r'D:\TOHRAN PROJECT\test_gradient_32x32.avi')
ok,fr=cap.read();cap.release()
small=cv2.resize(fr,(32,32),interpolation=cv2.INTER_AREA)
R=small[:,:,2];G=small[:,:,1];B=small[:,:,0]
print('AVI unique R',len(set(R.flatten())),'G',len(set(G.flatten())),'B',len(set(B.flatten())))

# print 8x8 sampled grids
print('=== AVI R grid ===')
for y in range(0,32,4): print(' '.join(f'{R[y,x]:3d}' for x in range(0,32,4)))
print('=== AVI G grid ===')
for y in range(0,32,4): print(' '.join(f'{G[y,x]:3d}' for x in range(0,32,4)))
print('=== LED ch0 grid ===')
for y in range(0,32,4): print(' '.join(f'{pix[y*32+x][0]:3d}' for x in range(0,32,4)))
print('=== LED ch1 grid ===')
for y in range(0,32,4): print(' '.join(f'{pix[y*32+x][1]:3d}' for x in range(0,32,4)))
print('=== LED ch2 grid ===')
for y in range(0,32,4): print(' '.join(f'{pix[y*32+x][2]:3d}' for x in range(0,32,4)))
