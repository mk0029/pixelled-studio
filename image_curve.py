import collections
import cv2, numpy as np

cap = cv2.VideoCapture(r'D:\TOHRAN PROJECT\cal_ramp_grey.avi')
ok, frame = cap.read(); cap.release()
frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
ref = np.flipud(cv2.resize(frame, (32,32), interpolation=cv2.INTER_AREA).mean(axis=2))

d = open(r'D:\ashish\blue.v2\Led\Controller-1\02_gray-v2.led','rb').read()
f = np.frombuffer(d[512:512+3072], dtype=np.uint8).astype(int)
mask = collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
led = ((f - mask) & 0xff).reshape(32,32,3).mean(axis=2)

print('ref stats', ref.min(), ref.max(), ref.mean())
print('led stats', led.min(), led.max(), led.mean())
print('sample pairs:')
for y in [0,4,8,12,16,20,24,28,31]:
    print(' row',y, [(int(ref[y,x]), int(led[y,x])) for x in [0,4,8,12,16,20,24,28,31]])
# binned relationship
for lo in range(0,256,32):
    m = (ref>=lo)&(ref<lo+32)
    if m.sum(): print(' ref',lo,'-',lo+31,'n',m.sum(),'led mean',round(float(led[m].mean()),1),'median',int(np.median(led[m])))
