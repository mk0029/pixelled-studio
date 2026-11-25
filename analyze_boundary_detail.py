import numpy as np
rec=np.frombuffer(open(r'D:\ashish\Program_1\_rec.bin','rb').read()[:3072],dtype=np.uint8)
led=np.frombuffer(open(r'D:\ashish\n2\Led\Controller-1\00_program1.led','rb').read()[512:512+3072],dtype=np.uint8)
for p in [1788,1792,1800,1864,1872,1888,1896,1900]:
    print(p,'rec',' '.join(f'{x:02X}' for x in rec[p:p+16]),'led',' '.join(f'{x:02X}' for x in led[p:p+16]))
