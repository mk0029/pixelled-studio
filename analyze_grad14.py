import cv2, numpy as np
led=open(r'D:\ashish\nnn\Led\Controller-1\00_program1.led','rb').read()
dec=np.array([(b-7)&0xff for b in led[512:512+3072]],dtype=np.int32).reshape(1024,3)
d=dec[:640]
cap=cv2.VideoCapture(r'D:\TOHRAN PROJECT\test_gradient_32x32.avi')
ok,fr=cap.read();cap.release()
s32=cv2.resize(fr,(32,32),interpolation=cv2.INTER_AREA)
s=cv2.resize(fr,(32,20),interpolation=cv2.INTER_AREA)
R=s[:,:,2].astype(int);G=s[:,:,1].astype(int);B=s[:,:,0].astype(int)
print('32x20 R00',R[0,0],'G00',G[0,0],'B00',B[0,0],'R19,31',R[19,31],'G19,31',G[19,31])
def xf(a,k):
    return [a,np.fliplr(a),np.flipud(a),np.flipud(np.fliplr(a)),a.T,np.fliplr(a.T),np.flipud(a.T),np.flipud(np.fliplr(a)).T][k]
names=['id','flipH','flipV','rot180','transp','antiT','rot90','rot270']
for k in range(8):
    for nm,Z in [('G',G),('R',R),('255G',255-G),('255R',255-R)]:
        T=xf(Z,k).flatten()
        c=[f'{np.corrcoef(d[:,c],T)[0,1]:.3f}' for c in range(3)]
        if max(abs(float(x)) for x in c)>0.4:
            print(f'{names[k]:7s} {nm:5s}: d0,d1,d2 corr = {c}')
