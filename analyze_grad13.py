import cv2, numpy as np
led=open(r'D:\ashish\nnn\Led\Controller-1\00_program1.led','rb').read()
dec=np.array([(b-7)&0xff for b in led[512:512+3072]],dtype=np.int32).reshape(1024,3)
cap=cv2.VideoCapture(r'D:\TOHRAN PROJECT\test_gradient_32x32.avi')
ok,fr=cap.read();cap.release()
# average 8x8 blocks: 240/8=30, 160/8=20
blocks=fr.reshape(20,8,30,8,3).mean(axis=(1,3))
R=blocks[:,:,2];G=blocks[:,:,1];B=blocks[:,:,0]
print('block grid shape',blocks.shape,'R00',R[0,0],'G00',G[0,0],'B00',B[0,0],'R29,19',R[19,29],'G29,19',G[19,29])

def transforms(a):
    yield 'id',a
    yield 'flipH',np.fliplr(a)
    yield 'flipV',np.flipud(a)
    yield 'rot180',np.flipud(np.fliplr(a))
    yield 'transp',a.T
    yield 'antiT',np.fliplr(np.flipud(a)).T
    yield 'rot90',np.flipud(a.T)
    yield 'rot270',np.fliplr(a.T)

d=dec[:600]
for name,T in transforms(G):
    Tf=T.flatten()
    print(f'G {name:7s}: corr d0={np.corrcoef(d[:,0],Tf)[0,1]:.3f} d1={np.corrcoef(d[:,1],Tf)[0,1]:.3f} d2={np.corrcoef(d[:,2],Tf)[0,1]:.3f}')
for name,T in transforms(R):
    Tf=T.flatten()
    print(f'R {name:7s}: corr d0={np.corrcoef(d[:,0],Tf)[0,1]:.3f} d1={np.corrcoef(d[:,1],Tf)[0,1]:.3f} d2={np.corrcoef(d[:,2],Tf)[0,1]:.3f}')
