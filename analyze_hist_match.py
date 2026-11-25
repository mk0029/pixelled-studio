import cv2, numpy as np, collections
led=open(r'D:\ashish\nnn\Led\Controller-1\00_program1.led','rb').read()
dec=np.array([(b-7)&0xff for b in led[512:512+3072]],dtype=np.int32).reshape(1024,3)
d=dec[:600]
cap=cv2.VideoCapture(r'D:\TOHRAN PROJECT\test_gradient_32x32.avi')
ok,fr=cap.read();cap.release()
for W,H in [(30,20),(32,20),(32,32)]:
    s=cv2.resize(fr,(W,H),interpolation=cv2.INTER_AREA)
    for c,nm in [(2,'R'),(1,'G'),(0,'B')]:
        arr=s[:,:,c].astype(int).flatten()
        print(f'AVI {W}x{H} {nm}: min {arr.min()} max {arr.max()} unique {len(set(arr))} top {collections.Counter(arr).most_common(5)}')
print()
for c in range(3):
    v=d[:,c]
    print(f'LED dec ch{c}: min {v.min()} max {v.max()} unique {len(set(v))} top {collections.Counter(v).most_common(8)}')
