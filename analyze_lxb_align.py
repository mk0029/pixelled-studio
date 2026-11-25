import struct, collections
b=open(r'D:\ashish\234.Lxb','rb').read(); key=0x4e
d=bytes((x-key)&0xff for x in b)
for start in range(480,545):
    recs=[d[start+i*16:start+(i+1)*16] for i in range(600)]
    if len(recs[-1])<16: continue
    f0=[struct.unpack('>H',r[0:2])[0] for r in recs]
    if len(set(f0))<=3:
        print('start',start,'f0 top',collections.Counter(f0).most_common(5))
        for i,r in enumerate(recs[:4]): print(i,r.hex(' '),struct.unpack('>8H',r))
