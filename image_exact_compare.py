import collections, json
import cv2, numpy as np

cap = cv2.VideoCapture(r'D:\TOHRAN PROJECT\cal_ramp_grey.avi')
ok, frame = cap.read(); cap.release()
frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
print('avi frame', frame.shape)

d = open(r'D:\ashish\blue.v2\Led\Controller-1\02_gray-v2.led','rb').read()
f = np.frombuffer(d[512:512+3072], dtype=np.uint8).astype(int)
mask = collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
led = ((f - mask) & 0xff).reshape(32,32,3).mean(axis=2)

for interp, name in [(cv2.INTER_AREA,'area'),(cv2.INTER_LINEAR,'linear'),(cv2.INTER_NEAREST,'nearest')]:
    ref = cv2.resize(frame, (32,32), interpolation=interp).mean(axis=2)
    for t in range(8):
        r = ref
        if t & 1: r = np.fliplr(r)
        if t & 2: r = np.flipud(r)
        if t & 4: r = r.T
        if r.shape != led.shape: continue
        c = np.corrcoef(led.ravel(), r.ravel())[0,1]
        print(name, 'transform', t, 'corr', round(float(c),3))
