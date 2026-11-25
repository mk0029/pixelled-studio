import numpy as np
rec=np.frombuffer(open(r'D:\ashish\Program_1\_rec.bin','rb').read()[:24576],dtype=np.uint8)
for p in range(24):
    print('pkt',p,'head',' '.join(f'{x:02X}' for x in rec[p*1024:p*1024+12]))
