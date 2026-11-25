import numpy as np
rec=np.frombuffer(open(r'D:\ashish\Program_1\_rec.bin','rb').read()[:3072],dtype=np.uint8).astype(int)
led=np.frombuffer(open(r'D:\ashish\n2\Led\Controller-1\00_program1.led','rb').read()[512:512+3072],dtype=np.uint8).astype(int)
# for each shift, count matches with +154
best=[]
for shift in range(-100,101):
    if shift>=0:
        a=rec[shift:]; b=led[:len(a)]
    else:
        a=rec[:len(rec)+shift]; b=led[-shift:]
    m=(((a+154)&0xff)==b).sum()
    best.append((m,shift))
best.sort(reverse=True)
print('best shifts',best[:15])
