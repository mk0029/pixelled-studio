import base64, collections, json
import numpy as np

LED = r'D:\ashish\singal-rgb\Led\Controller-1\00_singal-rgb.led'
d = open(LED, 'rb').read()
n = (len(d)-20992)//3072
MASK = collections.Counter(np.frombuffer(d[512+2048:512+3072], dtype=np.uint8).tolist()).most_common(1)[0][0]
print('frames', n, 'mask', hex(MASK))

def dec(k):
    f = np.frombuffer(d[512+k*3072:512+(k+1)*3072], dtype=np.uint8).astype(int)
    return (f-MASK)&0xff

uniq=[]; seen={}; first=[]
for k in range(n):
    a=dec(k); nz=np.where(a!=0)[0]; v=a[nz].tolist()
    t=(int(nz[v.index(255)]), int(nz[v.index(233)]), int(nz[v.index(82)]))
    if t not in seen:
        seen[t]=len(uniq); uniq.append(t); first.append(k)
print('unique LEDs', len(uniq), 'first-appearance frames', first[:20], '...', first[-10:])

# check diff regularity for R position over first 160 unique
rp=[t[0] for t in uniq]
diffs=[rp[i+1]-rp[i] for i in range(min(160,len(rp)-1))]
print('R diffs first 40', diffs[:40])
# find shortest repeating cycle
for period in range(2,40):
    if all(diffs[i]==diffs[i%period] for i in range(len(diffs))):
        print('exact cycle', period); break
else:
    print('no exact cycle <40')

json.dump(uniq, open(r'D:\TOHRAN PROJECT\led_byte_map_full.json','w'))
# template bytes
header = d[:512]
trailer = d[-20480:]
open(r'D:\TOHRAN PROJECT\led_template_header.b64','w').write(base64.b64encode(header).decode())
open(r'D:\TOHRAN PROJECT\led_template_trailer.b64','w').write(base64.b64encode(trailer).decode())
print('template saved', len(header), len(trailer))
