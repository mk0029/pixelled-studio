import collections, cv2, numpy as np
rec=np.frombuffer(open(r'D:\ashish\Program_1\_rec.bin','rb').read()[:3072],dtype=np.uint8)
led=np.frombuffer(open(r'D:\ashish\n2\Led\Controller-1\00_program1.led','rb').read()[512:512+3072],dtype=np.uint8)
tail=int(led[2048])
dec=(led.astype(np.int16)-tail)&0xff
cap=cv2.VideoCapture(r'D:\TOHRAN PROJECT\test_blocks_30x20.avi'); ok,fr=cap.read(); cap.release()
blk=fr.reshape(20,8,30,8,3).mean(axis=(1,3))
# source RGB intended values
R=np.array([bx*8 for by in range(20) for bx in range(30)])
G=np.array([by*12 for by in range(20) for bx in range(30)])
B=np.full(600,128)
for nm,arr in [('srcR',R),('srcG',G),('srcB',B)]:
    c=collections.Counter(arr.tolist())
    print(nm,'top',c.most_common(6))
for nm,arr in [('rec',rec[:1800]),('ledraw',led[:1800]),('leddec',dec[:1800])]:
    print('\n',nm,'all top',collections.Counter(arr.tolist()).most_common(12))
    for ch in range(3):
        c=collections.Counter(arr[ch::3].tolist())
        print(' ',nm,'ch',ch,'top',c.most_common(8))
