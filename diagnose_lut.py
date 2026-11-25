import struct, io, collections
import numpy as np
from PIL import Image

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
src=rgb.reshape(-1)
b=open(r'D:\ashish\n2\Led\Controller-1\00_program1.led','rb').read()
f=np.frombuffer(b[512:512+3072],dtype=np.uint8).astype(int)
mask=collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
dec=(f-mask)&0xff
hl=np.bincount(dec,minlength=256)
hs=np.bincount(src,minlength=256)
# cumulative distribution matching
cs=np.cumsum(hs); cl=np.cumsum(hl)
lut=np.zeros(256,dtype=int)
j=0
for v in range(256):
    target=cs[v]
    while j<255 and cl[j]<target: j+=1
    lut[v]=j
print('lut samples',[(v,int(lut[v])) for v in [0,8,16,32,64,96,120,127,128,129,160,200,216,240,255]])
mapped=lut[src]
hm=np.bincount(mapped,minlength=256)
print('hist distance raw',np.abs(hl-hs).sum(),'after equalization',np.abs(hl-hm).sum())
# consistency test: top source value 128 -> lut?
print('src 128 count',hs[128],'lut(128)',lut[128],'led count there',hl[lut[128]])
