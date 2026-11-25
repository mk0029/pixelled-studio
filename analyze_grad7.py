import cv2, numpy as np, collections

rec=open(r'D:\ashish\Program_1\_rec.bin','rb').read()[:3072]
led=open(r'D:\ashish\nnn\Led\Controller-1\00_program1.led','rb').read()
dec=[(b-7)&0xff for b in led[512:512+3072]]

cap=cv2.VideoCapture(r'D:\TOHRAN PROJECT\test_gradient_32x32.avi')
ok,fr=cap.read();cap.release()
s=cv2.resize(fr,(32,32),interpolation=cv2.INTER_AREA)
R=s[:,:,2].astype(int);G=s[:,:,1].astype(int);B=s[:,:,0].astype(int)

arr=np.array([rec[i] for i in range(1024)])
d0=np.array([dec[i*3] for i in range(1024)])
d1=np.array([dec[i*3+1] for i in range(1024)])
d2=np.array([dec[i*3+2] for i in range(1024)])
for name,a in [('REC0',arr),('d0',d0),('d1',d1),('d2',d2)]:
    print(name,'corr R,G,B =',*(f'{np.corrcoef(a, Z.flatten())[0,1]:.3f}' for Z in (R,G,B)))

# Check whether REC bytes are bit-reversal of decoded values
def rev8(v): return int(f'{v:08b}'[::-1],2)
print('REC vs rev(dec0) matches@identity:',sum(rec[i]==rev8(dec[i*3]) for i in range(1024)))
print('REC vs dec0 matches@identity:',sum(rec[i]==dec[i*3] for i in range(1024)))
print('REC vs rev(dec0+?) sample:',[(i,rec[i],dec[i*3]) for i in range(10)])

# print REC first 32 as binary
print('REC first16 bin:', ' '.join(f'{b:08b}' for b in rec[:16]))
print('DEC first16 ch0 bin:', ' '.join(f'{dec[i*3]:08b}' for i in range(16)))
