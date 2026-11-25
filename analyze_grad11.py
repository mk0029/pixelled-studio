import cv2, numpy as np
led=open(r'D:\ashish\nnn\Led\Controller-1\00_program1.led','rb').read()
dec=np.array([(b-7)&0xff for b in led[512:512+3072]],dtype=np.int32).reshape(1024,3)

cap=cv2.VideoCapture(r'D:\TOHRAN PROJECT\test_gradient_32x32.avi')
ok,fr=cap.read();cap.release()
s=cv2.resize(fr,(32,32),interpolation=cv2.INTER_AREA)
R=s[:,:,2].astype(int);G=s[:,:,1].astype(int);B=s[:,:,0].astype(int)

def xf(a,k):
    if k==0:return a
    if k==1:return np.fliplr(a)
    if k==2:return np.flipud(a)
    if k==3:return np.flipud(np.fliplr(a))
    if k==4:return a.T
    if k==5:return np.fliplr(a).T
    if k==6:return np.flipud(a).T
    if k==7:return np.flipud(np.fliplr(a)).T
names=['id','flipH','flipV','rot180','transp','antiT','rot90','rot270']
for k in range(8):
    g=xf(G,k);r=xf(R,k)
    # compare dec ch0 to 255-G and to G, at index grid
    d0=dec[:,0].reshape(32,32)
    c1=np.corrcoef(d0.flatten(),(255-g).flatten())[0,1]
    c2=np.corrcoef(d0.flatten(),g.flatten())[0,1]
    c3=np.corrcoef(d0.flatten(),r.flatten())[0,1]
    print(f'{names[k]:7s}: corr d0 vs 255-G={c1:.3f} vs G={c2:.3f} vs R={c3:.3f}')
