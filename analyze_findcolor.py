import cv2, numpy as np
raw=open(r'D:\ashish\nnn\Led\Controller-1\00_program1.led','rb').read()[512:512+3072]
dec=np.array([(b-9)&0xff for b in raw],dtype=np.int32).reshape(1024,3)
cap=cv2.VideoCapture(r'D:\TOHRAN PROJECT\test_gradient_32x32.avi'); ok,fr=cap.read(); cap.release()
s=cv2.resize(fr,(32,32),interpolation=cv2.INTER_AREA)
# AVI cell colours as RGB
cells={(int(s[y,x,2]),int(s[y,x,1]),int(s[y,x,0])):(x,y) for y in range(32) for x in range(32)}
hits=[]
for i in range(600):
    p=tuple(dec[i])
    for dr in range(-3,4):
        for dg in range(-3,4):
            for db in range(-3,4):
                k=(p[0]+dr,p[1]+dg,p[2]+db)
                if k in cells:
                    hits.append((i,p,cells[k],(dr,dg,db))); break
            else: continue
            break
        else: continue
        break
print('hits',len(hits))
print(hits[:30])
