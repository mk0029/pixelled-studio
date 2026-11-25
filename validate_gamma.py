import struct, io, collections
import numpy as np
from PIL import Image

base=r'D:\ashish\celibration\Led\Controller-1'
def dec(name):
    b=open(f'{base}\\{name}.led','rb').read()
    f=np.frombuffer(b[512:512+3072],dtype=np.uint8).astype(int)
    mask=collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
    return (f-mask)&0xff
blk=dec('black')
cal={n:dec(n)-blk for n in ['red','green','blue']}

avi=open(r'D:\TOHRAN PROJECT\test_blocks_30x20.avi','rb').read()
pos=0; frame=None
while True:
    k=avi.find(b'00dc',pos)
    if k<0: break
    sz=struct.unpack_from('<I',avi,k+4)[0]
    chunk=avi[k+8:k+8+sz]; pos=k+8+sz
    try:
        im=Image.open(io.BytesIO(chunk)).convert('RGB')
        if im.size==(240,160): frame=im; break
    except Exception: pass
arr=np.array(frame); rgb=arr[4::8,4::8].reshape(-1,3).astype(int)
b=open(r'D:\ashish\n2\Led\Controller-1\00_program1.led','rb').read()
f=np.frombuffer(b[512:512+3072],dtype=np.uint8).astype(int)
bm=collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
actual=(f-bm)&0xff
for gamma in [0.5,0.6,0.8,1.0,1.2,1.5,1.8,2.2,2.5]:
    pred=blk.copy()
    for p in range(600):
        r,g,b2=rgb[p]
        rf=(r/255)**gamma*255; gf=(g/255)**gamma*255; bf=(b2/255)**gamma*255
        for c in range(3):
            i=p*3+c
            v=blk[i]+(cal['red'][i]*rf+cal['green'][i]*gf+cal['blue'][i]*bf)/255
            pred[i]=int(np.clip(round(v),0,255))
    eq=(pred[:1800]==actual[:1800]).sum()
    mad=np.abs(pred[:1800]-actual[:1800]).mean()
    print('gamma',gamma,'exact',eq,'mad',round(mad,2))
