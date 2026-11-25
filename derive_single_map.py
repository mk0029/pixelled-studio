import collections, json
import numpy as np

p = r'D:\ashish\singal-60\Led\Controller-1\00_singal-60.led'
d = open(p, 'rb').read()
n = (len(d)-20992)//3072

def dec(k):
    f = np.frombuffer(d[512+k*3072:512+(k+1)*3072], dtype=np.uint8).astype(int)
    return (f-0x50)&0xff

pos_by_led = []
bad = []
for k in range(600):
    a = dec(k)
    nz = np.where(a != 0)[0]
    if len(nz) != 3 or not (nz[1] == nz[0]+1 and nz[2] == nz[1]+1):
        bad.append((k, nz.tolist(), a[nz].tolist()))
    pos_by_led.append([int(x) for x in nz])
print('frames checked 600, bad', len(bad), bad[:5])
print('first', pos_by_led[:5], 'last', pos_by_led[-3:])
json.dump(pos_by_led, open(r'D:\TOHRAN PROJECT\led_positions.json','w'))
print('saved led_positions.json')
