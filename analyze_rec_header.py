import numpy as np, collections
rec=open(r'D:\ashish\Program_1\_rec.bin','rb').read()
print('len',len(rec),'frames?',len(rec)/24576)
print('first 64',' '.join(f'{x:02X}' for x in rec[:64]))
print('last 64',' '.join(f'{x:02X}' for x in rec[-64:]))
# check frame boundaries
for f in range(3):
    off=f*24576
    print('frame',f,'head',' '.join(f'{x:02X}' for x in rec[off:off+16]))
# check if all frames same or different
for f in range(1,51):
    off=f*24576
    if rec[off:off+3072]!=rec[:3072]:
        print('frame',f,'differs from frame 0')
        break
else: print('all frames identical in first 3072')
