import cv2, numpy as np, collections
raw=open(r'D:\ashish\nnn\Led\Controller-1\00_program1.led','rb').read()[512:512+3072]
dec=np.array([(b-9)&0xff for b in raw],dtype=np.int32).reshape(1024,3)
cap=cv2.VideoCapture(r'D:\TOHRAN PROJECT\test_gradient_32x32.avi')
ok,fr=cap.read();cap.release()
s=cv2.resize(fr,(32,32),interpolation=cv2.INTER_AREA)
R=s[:,:,2].astype(int);G=s[:,:,1].astype(int);B=s[:,:,0].astype(int)
# build map from source color (rounded) -> list of (x,y)
src=collections.defaultdict(list)
for y in range(32):
    for x in range(32):
        src[(int(R[y,x]),int(G[y,x]),int(B[y,x]))].append((x,y))
perms=[(0,1,2),(0,2,1),(1,0,2),(1,2,0),(2,0,1),(2,1,0)]
for tol in [0,1,2,3,5]:
    total=0
    for i in range(600):
        p=dec[i].tolist()
        found=False
        for perm in perms:
            # try all small offsets per channel
            for dr in range(-tol,tol+1):
                for dg in range(-tol,tol+1):
                    for db in range(-tol,tol+1):
                        k=(p[perm[0]]+dr,p[perm[1]]+dg,p[perm[2]]+db)
                        if k in src: found=True;break
                    if found:break
                if found:break
            if found:break
        total+=found
    print('tol',tol,'matched',total,'/',600)
