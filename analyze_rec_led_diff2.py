import collections, numpy as np
rec=np.frombuffer(open(r'D:\ashish\Program_1\_rec.bin','rb').read()[:3072],dtype=np.uint8)
led=np.frombuffer(open(r'D:\ashish\n2\Led\Controller-1\00_program1.led','rb').read()[512:512+3072],dtype=np.uint8)
d=(led.astype(int)-rec.astype(int))&0xff
for pos in range(3):
    print('byte pos',pos,'diff top',collections.Counter(d[pos::3].tolist()).most_common(8))
# check by pixel index ranges
for lo in range(0,3072,256):
    seg=d[lo:lo+256]
    print(lo,'top',collections.Counter(seg.tolist()).most_common(3))
