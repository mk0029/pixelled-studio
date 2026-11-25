import collections, numpy as np
rec=np.frombuffer(open(r'D:\ashish\Program_1\_rec.bin','rb').read()[:24576],dtype=np.uint8)
led=np.frombuffer(open(r'D:\ashish\n2\Led\Controller-1\00_program1.led','rb').read()[512:512+3072],dtype=np.uint8)
tail=led[2048]
dec=(led-tail)&0xff
print('tail',hex(tail))
# REC = 24 packets x 1024 bytes, 8 ports in bits of each byte
# extract port 0 for each packet
for port in range(8):
    vals=[]
    for p in range(24):
        pkt=rec[p*1024:(p+1)*1024]
        for i in range(1024):
            vals.append((pkt[i]>>port)&1)
    vals=np.array(vals,dtype=np.uint8)
    # assemble into 1024 RGB triples: packet layout = red bits 0-7, green bits 0-7, blue bits 0-7
    rgb=np.zeros((1024,3),dtype=np.uint8)
    for c in range(3):
        for b in range(8):
            rgb[:,c] |= vals[(c*8+b)*1024:(c*8+b+1)*1024].astype(np.uint8)<<b
    # compare to decoded LED (first 1024 pixels x 3)
    flat=rgb.reshape(-1)
    d=np.abs(flat.astype(int)-dec[:3072].astype(int))
    match=(d==0).sum()
    near=(d<=2).sum()
    print('port',port,'exact',match,'/3072','near2',near,'sample rec',flat[:12].tolist(),'led',dec[:12].tolist())
