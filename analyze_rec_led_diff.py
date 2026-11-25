import collections, numpy as np
rec=np.frombuffer(open(r'D:\ashish\Program_1\_rec.bin','rb').read()[:3072],dtype=np.uint8)
led=np.frombuffer(open(r'D:\ashish\n2\Led\Controller-1\00_program1.led','rb').read()[512:512+3072],dtype=np.uint8)
print('rec head',' '.join(f'{x:02X}' for x in rec[:48]))
print('led head',' '.join(f'{x:02X}' for x in led[:48]))
tail=led[2048]
print('tail',hex(tail))
# find best additive offset
for off in range(256):
    m=((rec.astype(int)+off)&0xff)==led.astype(int)
    if m.sum()>50: print('add off',off,'match',m.sum())
# find best xor
for k in range(256):
    m=(rec^k)==led
    if m.sum()>50: print('xor',k,'match',m.sum())
# direct diff
d=(led.astype(int)-rec.astype(int))&0xff
print('diff top',collections.Counter(d.tolist()).most_common(10))
