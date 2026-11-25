import struct, io, collections
import numpy as np
from PIL import Image

base=r'D:\ashish\celibration\Led\Controller-1'
def decoded(name):
    b=open(f'{base}\\{name}.led','rb').read()
    f=b[512:512+3072]
    mask=collections.Counter(f[2048:]).most_common(1)[0][0]
    return ((f.astype(int)-mask)&0xff) if False else np.frombuffer(f,dtype=np.uint8)

def dec_frame(name):
    b=open(f'{base}\\{name}.led','rb').read()
    f=np.frombuffer(b[512:512+3072],dtype=np.uint8).astype(int)
    mask=collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
    return (f-mask)&0xff, mask

blk,mask=dec_frame('black')
cal={}
for name in ['red','green','blue']:
    d,_=dec_frame(name); cal[name]=d-blk

# Decode block AVI first frame
avi=open(r'D:\TOHRAN PROJECT\test_blocks_30x20.avi','rb').read()
j=avi.find(b'strh')
print('avi codec',avi[j+8:j+12])
pos=0; frame=None
while True:
    k=avi.find(b'00dc',pos)
    if k<0: break
    sz=struct.unpack_from('<I',avi,k+4)[0]
    chunk=avi[k+8:k+8+sz]
    pos=k+8+sz
    try:
        im=Image.open(io.BytesIO(chunk)).convert('RGB')
        if im.size==(240,160): frame=im; break
    except Exception: pass
print('frame size',frame.size if frame else None)
if frame:
    arr=np.array(frame)
    rgb=arr[4::8,4::8].reshape(-1,3).astype(int)  # 30x20 sample at block centres
    print('rgb pixels',rgb.shape,'first',rgb[:5].tolist())
    pred=blk.copy()
    for p in range(min(600,len(rgb))):
        r,g,b=rgb[p]
        for c in range(3):
            i=p*3+c
            v=blk[i]+(cal['red'][i]*r+cal['green'][i]*g+cal['blue'][i]*b)/255
            pred[i]=int(np.clip(round(v),0,255))
    # compare with actual decoded block export
    b=open(r'D:\ashish\n2\Led\Controller-1\00_program1.led','rb').read()
    f=np.frombuffer(b[512:512+3072],dtype=np.uint8).astype(int)
    bm=collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
    actual=(f-bm)&0xff
    for lo,hi,name in [(0,1800,'first1800'),(0,3072,'whole')]:
        eq=(pred[lo:hi]==actual[lo:hi]).sum()
        print(name,'exact',eq,'/',hi-lo, 'mean abs diff',np.abs(pred[lo:hi]-actual[lo:hi]).mean())
