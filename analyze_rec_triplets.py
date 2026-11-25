import collections, cv2, numpy as np
rec = open(r'D:\ashish\Program_1\_rec.bin','rb').read()[:3072]
led = open(r'D:\ashish\n2\Led\Controller-1\00_program1.led','rb').read()[512:512+3072]
tail = led[2048]
print('rec head', ' '.join(f'{x:02X}' for x in rec[:48]))
print('led head', ' '.join(f'{x:02X}' for x in led[:48]))
print('tail', hex(tail))
for name, arr in [('rec', rec), ('led', led)]:
    for c in range(3):
        h = collections.Counter(arr[c::3])
        print(name, 'ch', c, 'distinct', len(h), 'top', [(f'{k:02X}', v) for k,v in h.most_common(8)])
# decoded AVI block colors
cap=cv2.VideoCapture(r'D:\TOHRAN PROJECT\test_blocks_30x20.avi'); ok,fr=cap.read(); cap.release()
blk=fr.reshape(20,8,30,8,3).mean(axis=(1,3)).astype(int)
exp=[]
for by in range(20):
    for bx in range(30):
        exp.append((int(blk[by,bx,0]),int(blk[by,bx,1]),int(blk[by,bx,2])))
expset=set(exp)
print('exp head', exp[:12])
print('exp unique', len(expset))
# try rec/led triplets under channel permutations and small offsets
for nm, arr in [('rec', rec), ('led', led)]:
    pix=[tuple(arr[i:i+3]) for i in range(0,1800,3)]
    for perm in [(0,1,2),(2,1,0),(1,2,0),(0,2,1),(1,0,2),(2,0,1)]:
        for off in range(256):
            n=0
            for p in pix:
                q=tuple((p[perm[j]]-off)&0xff for j in range(3))
                if q in expset: n+=1
            if n>20: print(nm,'perm',perm,'off',hex(off),'matches',n,'/600')
