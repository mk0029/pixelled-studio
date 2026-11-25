import struct, collections
from PIL import Image
import io
avi=r'D:\TOHRAN PROJECT\test_solid_white_red_green_blue.avi'
b=open(avi,'rb').read()
pos=0; frames=[]
while True:
    k=b.find(b'00dc',pos)
    if k<0: break
    sz=struct.unpack_from('<I',b,k+4)[0]
    frames.append(b[k+8:k+8+sz]); pos=k+8+sz
print('frames',len(frames))
seen={}
for n,f in enumerate(frames):
    try:
        im=Image.open(io.BytesIO(f)).convert('RGB')
        c=collections.Counter(im.getdata())
        key=tuple(c.most_common(1)[0][0])
        seen.setdefault(key,[]).append(n)
    except Exception as e:
        print('frame',n,'decode error',e)
print('distinct dominant colours:',len(seen))
for k,v in seen.items():
    print('  rgb',k,'frames',v[:6],'... count',len(v))
