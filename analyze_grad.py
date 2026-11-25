import collections
import cv2
import numpy as np

LED_PATH = r'D:\ashish\nnn\Led\Controller-1\00_program1.led'
led = open(LED_PATH, 'rb').read()
fc = led[12]*256 + led[13]
print('frames', fc)

# unique frame signatures
sigs = collections.defaultdict(list)
for f in range(fc):
    lo = 512 + f*3072
    sigs[led[lo:lo+3072]].append(f)
print('distinct frames:', len(sigs), 'sizes:', sorted([len(v) for v in sigs.values()], reverse=True)[:10])

# decode AVI
cap = cv2.VideoCapture(r'D:\TOHRAN PROJECT\test_gradient_32x32.avi')
ok, fr = cap.read()
cap.release()
small = cv2.resize(fr, (32,32), interpolation=cv2.INTER_AREA)
print('avi cell(0,0) BGR', small[0,0], 'cell(31,31)', small[31,31])

# LED frame 0 triplets: print grid of first byte of each pixel
lo = 512
pix = [tuple(led[lo+i*3:lo+i*3+3]) for i in range(1024)]
print('LED f0 first 8 pixels:', [' '.join(f'{b:02X}' for b in p) for p in pix[:8]])
print('LED f0 last 8 pixels:', [' '.join(f'{b:02X}' for b in p) for p in pix[-8:]])

# histogram of LED bytes per channel
for c in range(3):
    h = collections.Counter(p[c] for p in pix)
    print('channel', c, 'distinct', len(h), 'top', [(f'{k:02X}',v) for k,v in h.most_common(8)])

# correlation: LED value at pixel p vs AVI R/G at cell (x,y)
R = small[:,:,2].astype(int)
G = small[:,:,1].astype(int)
B = small[:,:,0].astype(int)
for c in range(3):
    vals = np.array([pix[y*32+x][c] for y in range(32) for x in range(32)])
    print(f'LED ch{c} unique={len(set(vals))} range={vals.min()}..{vals.max()}')
    for name, arr in [('R',R),('G',G),('B',B)]:
        a = arr.flatten()
        # only cells where arr has unique values
        corr = np.corrcoef(a, vals)[0,1]
        print(f'  corr with AVI {name} = {corr:.3f}')
