import struct, collections
avi=r'D:\TOHRAN PROJECT\test_solid_white_red_green_blue.avi'
b=open(avi,'rb').read()
print('AVI size',len(b))
# find avih and strh
i=b.find(b'avih')
print('avih',struct.unpack_from('<IIIIIIIIII',b,i+8))
j=b.find(b'strh')
print('strh',struct.unpack_from('<4s4sIIHHIIIIIIII',b,j+8)[:12])
# find movi frames: standard '00dc' chunks
pos=0; frames=[]
while True:
    k=b.find(b'00dc',pos)
    if k<0: break
    sz=struct.unpack_from('<I',b,k+4)[0]
    frames.append(b[k+8:k+8+sz]); pos=k+8+sz
print('frames',len(frames),'frame bytes',len(frames[0]) if frames else 0)
for n,f in enumerate(frames[:8]):
    c=collections.Counter(f)
    print(' AVI frame',n,'top',c.most_common(5),'distinct',len(c))
led=open(r'D:\ashish\Led\Controller-1\00_program1.led','rb').read()
uniq=[]
for i in range(116):
    f=led[512+i*3072:512+(i+1)*3072]
    if f not in uniq: uniq.append(f)
print('LED unique',len(uniq))
for n,f in enumerate(uniq):
    c=collections.Counter(f)
    print(' LED frame',n,'top',c.most_common(8),'distinct',len(c), 'first12',' '.join(f'{x:02X}' for x in f[:12]))
