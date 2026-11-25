import numpy as np, itertools
rec=np.frombuffer(open(r'D:\ashish\Program_1\_rec.bin','rb').read()[:24576],dtype=np.uint8)
led=np.frombuffer(open(r'D:\ashish\n2\Led\Controller-1\00_program1.led','rb').read()[512:512+3072],dtype=np.uint8)

def orders():
    base=list(range(24))
    yield ('identity',base)
    yield ('rev_all',base[::-1])
    yield ('rev_groups',list(range(7,-1,-1))+list(range(15,7,-1))+list(range(23,15,-1)))
    yield ('interleave',[i+8*c for i in range(8) for c in range(3)])
    yield ('interleave_rev',[i+8*c for i in range(7,-1,-1) for c in range(3)])

best=[]
for off in range(256):
    data=(rec.astype(np.int16)-off)&0xff
    for bitpos in range(8):
        bits=((data.reshape(24,1024)>>bitpos)&1).astype(np.uint8)
        for oname,order in orders():
            ob=bits[order]  # 24 x 1024
            # plane-major packing: 24 planes x 128 bytes
            for msb in (True,False):
                shifts=(7-np.arange(8)) if msb else np.arange(8)
                pm=np.zeros((24,128),dtype=np.uint16)
                for k in range(8):
                    pm |= ob[:,k::8].astype(np.uint16) << int(shifts[k])
                pm=pm.astype(np.uint8)
                eq=int(np.sum(pm.reshape(-1)==led))
                best.append((eq,off,bitpos,oname,'plane',msb))
            # pixel-major packing: 1024 pixels x 3 channel bytes
            for msb in (True,False):
                px=np.zeros((1024,3),dtype=np.uint16)
                shifts=(7-np.arange(8)) if msb else np.arange(8)
                for c in range(3):
                    for k in range(8):
                        px[:,c] |= ob[c*8+k].astype(np.uint16) << int(shifts[k])
                px=px.astype(np.uint8)
                eq=int(np.sum(px.reshape(-1)==led))
                best.append((eq,off,bitpos,oname,'pixel',msb))
best.sort(reverse=True)
print('best')
for x in best[:20]: print(x)
