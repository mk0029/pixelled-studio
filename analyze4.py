import collections
import cv2
import numpy as np

led = open(r'D:\ashish\Led\Controller-1\00_program1.led', 'rb').read()
fc = led[12] * 256 + led[13]
trailer = led[-20480:]
print('=== trailer histogram ===')
h = collections.Counter(trailer)
print('distinct:', len(h), 'top:', [(hex(k), v) for k,v in h.most_common(12)])
print('first 64:', ' '.join(f'{x:02X}' for x in trailer[:64]))
print('nonzero count:', sum(1 for x in trailer if x))

print()
print('=== header full 512 bytes first 128 ===')
print(' '.join(f'{x:02X}' for x in led[:128]))

print()
print('=== AVI decode + LED compare ===')
cap = cv2.VideoCapture(r'D:\TOHRAN PROJECT\test_solid_white_red_green_blue.avi')
print('avi frames:', int(cap.get(cv2.CAP_PROP_FRAME_COUNT)), 'fps:', cap.get(cv2.CAP_PROP_FPS))
frames = []
while True:
    ok, fr = cap.read()
    if not ok: break
    frames.append(fr)
cap.release()
print('decoded:', len(frames), 'shape:', frames[0].shape)
for i in [0, 8, 16, 24]:
    fr = frames[i]
    small = cv2.resize(fr, (32,32), interpolation=cv2.INTER_AREA)
    c = small[16,16]
    print(f'avi frame {i} center BGR={c}')

# LED frame signatures vs AVI frame — find frame correspondence
print()
print('=== LED frame 0,4,30 pixel triplets at selected positions ===')
for f in [0,4,30,38,64,73]:
    lo = 512 + f*3072
    vals = [tuple(led[lo+p*3:lo+p*3+3]) for p in [0,1,16,512,1023]]
    print(f'LED f{f}:', ' '.join(''.join(f'{v:02X}' for v in t) for t in vals))
