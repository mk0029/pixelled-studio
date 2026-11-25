import struct, io, collections
import numpy as np
from PIL import Image

# source colours from block AVI
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

# decoded LED bytes (block export)
b=open(r'D:\ashish\n2\Led\Controller-1\00_program1.led','rb').read()
f=np.frombuffer(b[512:512+3072],dtype=np.uint8).astype(int)
mask=collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
dec=(f-mask)&0xff
pad=collections.Counter(dec.tolist()).most_common(1)[0][0]
active=dec[dec!=pad]
print('source bytes',len(src),'unique',len(set(src.tolist())))
print('LED active bytes',len(active),'unique',len(set(active.tolist())),'pad',pad)
print('src hist top',collections.Counter(src.tolist()).most_common(6))
print('led hist top',collections.Counter(active.tolist()).most_common(6))

for g in [1.0,1.8,2.2]:
    t=np.clip(np.round(255*(src/255)**g),0,255).astype(int)
    print('gamma',g,'hist top',collections.Counter(t.tolist()).most_common(6))
    # histogram L1 distance
    hs=np.bincount(src,minlength=256); ht=np.bincount(t,minlength=256)
    print('  src-gamma hist distance',np.abs(hs-ht).sum())
hl=np.bincount(active,minlength=256)
for name,t in [('raw',src),('gamma1.8',np.clip(np.round(255*(src/255)**1.8),0,255).astype(int))]:
    ht=np.bincount(t,minlength=256)
    print('LED vs',name,'hist distance',np.abs(hl-ht).sum())
