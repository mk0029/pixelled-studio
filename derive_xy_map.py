import collections, json
import numpy as np

LXB = r'D:\ashish\celibration.Lxb'
LED = r'D:\ashish\calxy\Led\Controller-1\00_calxy.led'

# Lxb: record i -> (x 0..29, y 0..19); webapp LED k = y*30 + x
b = open(LXB, 'rb').read()
coord = {}
for i in range(600):
    r = b[512+i*16:512+(i+1)*16]
    y = r[3] - 0xCD
    idx = (r[15] - 0xCD) & 0xFF
    for wrap in range(3):
        v = idx + 256*wrap
        if v >= y and (v - y) % 20 == 0:
            x = (v - y)//20
            if 0 <= x < 30:
                coord[i] = (x, y)
                break
assert len(coord) == 600
by_xy = {v: i for i, v in coord.items()}

d = open(LED, 'rb').read()
def dec(k):
    f = np.frombuffer(d[512+k*3072:512+(k+1)*3072], dtype=np.uint8).astype(int)
    return (f - 0x59) & 0xff
A = {k: dec(k) for k in [0, 1, 2, 3, 5, 6]}
pairs = [(6, 0), (1, 2), (3, 5)]  # R, G, B = (x frame, y frame)

maps = []
for ci, (gx, gy) in enumerate(pairs):
    x, y = A[gx], A[gy]
    both = (x != 0) & (y != 0)
    posmap = {}
    conflicts = 0
    for i in np.where(both)[0]:
        sx = max(0, min(29, int(round(x[i] / 8))))
        sy = max(0, min(19, int(round(y[i] / 8))))
        led = by_xy.get((sx, sy))
        if led is None:
            continue
        if i in posmap and posmap[i] != led:
            conflicts += 1
        posmap[int(i)] = led
    # inverse: led -> position
    inverse = {}
    for p, led in posmap.items():
        inverse.setdefault(led, []).append(p)
    multi = sum(1 for v in inverse.values() if len(v) > 1)
    maps.append(inverse)
    print('channel', ci, 'mapped positions', len(posmap), 'LEDs', len(inverse),
          'multi-position LEDs', multi, 'conflicts', conflicts)
    # validate values
    errs = []
    for p, led in posmap.items():
        sx, sy = coord[led]
        errs.append(abs(x[p] - sx*8) + abs(y[p] - sy*8))
    print('  value error median', int(np.median(errs)), '<=4', sum(e <= 4 for e in errs),
          '<=8', sum(e <= 8 for e in errs))

# save pos[channel][led] (led = y*30+x)
out = []
for inv in maps:
    arr = [None] * 600
    for led, ps in inv.items():
        k = coord[led][1] * 30 + coord[led][0]
        arr[k] = ps[0]
    out.append(arr)
json.dump(out, open(r'D:\TOHRAN PROJECT\led_byte_map.json', 'w'))
print('missing per channel', [sum(v is None for v in a) for a in out])
