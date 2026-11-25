import numpy as np, cv2, itertools
rec=np.frombuffer(open(r'D:\ashish\Program_1\_rec.bin','rb').read()[:3072],dtype=np.uint8).astype(float)
led=np.frombuffer(open(r'D:\ashish\n2\Led\Controller-1\00_program1.led','rb').read()[512:512+3072],dtype=np.uint8).astype(float)
dec=((led.astype(np.int16)-61)&0xff).astype(float)
cap=cv2.VideoCapture(r'D:\TOHRAN PROJECT\test_blocks_30x20.avi'); ok,fr=cap.read(); cap.release()
blk=fr.reshape(20,8,30,8,3).mean(axis=(1,3))
R=np.array([blk[by,bx,2] for by in range(20) for bx in range(30)])
G=np.array([blk[by,bx,1] for by in range(20) for bx in range(30)])
B=np.array([blk[by,bx,0] for by in range(20) for bx in range(30)])
# candidate pixel order permutations
orders={}
orders['row']=list(range(600))
orders['col']=[by*30+bx for bx in range(30) for by in range(20)]
orders['row_snake']=[by*30+(bx if by%2==0 else 29-bx) for by in range(20) for bx in range(30)]
orders['col_snake']=[(by if bx%2==0 else 19-by)*30+bx for bx in range(30) for by in range(20)]
for oname,pix in orders.items():
    print('\norder',oname)
    for src,nm in [(R,'R'),(G,'G'),(B,'B')]:
        s=src[pix]
        for arr,an in [(rec,'rec'),(dec,'dec')]:
            cors=[]
            for c in range(3):
                cors.append(round(float(np.corrcoef(arr[c::3][:600],s)[0,1]),3))
            print(nm,an,cors)
