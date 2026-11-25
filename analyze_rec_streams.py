import numpy as np, collections
rec=np.frombuffer(open(r'D:\ashish\Program_1\_rec.bin','rb').read()[:1800],dtype=np.uint8)
for c in range(3):
    s=rec[c::3]
    print('stream',c,'head',' '.join(f'{x:02X}' for x in s[:60]))
    print('  top',collections.Counter(s.tolist()).most_common(12))
