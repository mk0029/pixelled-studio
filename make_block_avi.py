from PIL import Image, ImageDraw
import io, struct, cv2

W,H,N,FPS = 240,160,32,15
BW,BH = 8,8                 # 240/8=30 columns, 160/8=20 rows -> 600 LEDs
COLS,ROWS = W//BW, H//BH

imgs=[]
for f in range(N):
    im=Image.new('RGB',(W,H))
    d=ImageDraw.Draw(im)
    for by in range(ROWS):
        for bx in range(COLS):
            i=by*COLS+bx
            # unique colour per 8x8 block: R varies with column, G with row, B fixed
            r=(bx*8)&0xff
            g=(by*12)&0xff
            b=128
            d.rectangle([bx*BW,by*BH,(bx+1)*BW-1,(by+1)*BH-1],fill=(r,g,b))
    buf=io.BytesIO(); im.save(buf,format='JPEG',quality=100,subsampling=0)
    imgs.append(buf.getvalue())

jl=len(imgs[0]); us=1000000//FPS
def chunk(cid,data):
    o=cid+struct.pack('<I',len(data))+data
    return o+(b'\0' if len(data)%2 else b'')
def lst(typ,data):
    body=typ+data
    o=b'LIST'+struct.pack('<I',len(body))+body
    return o+(b'\0' if len(body)%2 else b'')

avih=struct.pack('<14I',us,jl*FPS,0,0x10,N,0,1,jl,W,H,0,0,0,0)
strh=(b'vids'+b'MJPG'+struct.pack('<IHHIIIIIIII',0,0,0,0,1,FPS,0,N,jl,0xFFFFFFFF,0)
      +struct.pack('<HHHH',0,0,W,H))
strf=struct.pack('<IiiHH4sIiiII',40,W,H,1,24,b'MJPG',jl,0,0,0,0)
body=lst(b'hdrl',chunk(b'avih',avih)+lst(b'strl',chunk(b'strh',strh)+chunk(b'strf',strf)))

movi=b''; offs=[]
for j in imgs:
    offs.append(4+len(movi)); movi+=chunk(b'00dc',j)
idx=b''
for o in offs: idx+=b'00dc'+struct.pack('<III',0x10,o,jl)
body+=lst(b'movi',movi)+chunk(b'idx1',idx)
avi=b'RIFF'+struct.pack('<I',len(body)+4)+b'AVI '+body
path=r'D:\TOHRAN PROJECT\test_blocks_30x20.avi'
open(path,'wb').write(avi)
print('wrote',path,'bytes',len(avi),'frames',N,'jpeg',jl)

cap=cv2.VideoCapture(path); ok,fr=cap.read(); cap.release()
if ok:
    blk=fr.reshape(20,8,30,8,3).mean(axis=(1,3))
    print('decoded frames',int(cv2.VideoCapture(path).get(cv2.CAP_PROP_FRAME_COUNT)))
    print('block(0,0) BGR',blk[0,0],'block(19,29) BGR',blk[19,29],'block(10,15) BGR',blk[10,15])
    print('unique colours',len(set(tuple(map(int,v)) for row in blk for v in row)))
