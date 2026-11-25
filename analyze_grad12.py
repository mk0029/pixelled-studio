import collections
import cv2, numpy as np
led=open(r'D:\ashish\nnn\Led\Controller-1\00_program1.led','rb').read()
dec=np.array([(b-7)&0xff for b in led[512:512+3072]],dtype=np.int32).reshape(1024,3)
nb=dec[(dec!=0).any(axis=1)]
print('nonblack',len(nb))
for c in range(3):
    h=collections.Counter(nb[:,c])
    print('ch',c,'distinct',len(h),'top',h.most_common(12))
# check if any channel is constant-ish
# check relation between channels
for a,b in [(0,1),(0,2),(1,2)]:
    print(f'corr ch{a},ch{b}:',np.corrcoef(nb[:,a],nb[:,b])[0,1])
# quantize decoded values to multiples of 8 and see
for c in range(3):
    q=nb[:,c]//8
    print(f'ch{c} //8 top',collections.Counter(q).most_common(12))
