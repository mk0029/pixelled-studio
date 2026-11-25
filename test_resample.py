import collections
import cv2
import numpy as np

p = r'D:\ashish\celibration\Led\Led\Controller-1\00_t-3.led'
d = open(p, 'rb').read()
f = np.frombuffer(d[512:512+3072], dtype=np.uint8).astype(int)
m = collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
led = ((f - m) & 255).reshape(32, 32, 3)

cap = cv2.VideoCapture(r'D:\TOHRAN PROJECT\cal_channel_map.avi')
ok, fr = cap.read(); cap.release()
fr = cv2.cvtColor(fr, cv2.COLOR_BGR2RGB)

for iname, interp in [('area', cv2.INTER_AREA), ('linear', cv2.INTER_LINEAR), ('nearest', cv2.INTER_NEAREST)]:
    small = cv2.resize(fr, (32, 32), interpolation=interp).astype(float)
    for flip in range(4):
        t = small
        if flip & 1: t = np.fliplr(t)
        if flip & 2: t = np.flipud(t)
        cs = [float(np.corrcoef(led[:, :, c].ravel(), t[:, :, c].ravel())[0, 1]) for c in range(3)]
        print(iname, 'flip', flip, 'corr', [round(x, 3) for x in cs],
              'mean', round(float(np.corrcoef(led.mean(axis=2).ravel(), t.mean(axis=2).ravel())[0, 1]), 3))
