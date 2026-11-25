import struct, collections

p = r'D:\ashish\celibration.Lxb'
b = open(p, 'rb').read()
print('size', len(b), 'head', ' '.join(f'{x:02X}' for x in b[:64]))
start = 521
recs = []
for k in range(600):
    o = start + k * 16
    if o + 16 > len(b):
        break
    rec = b[o:o + 16]
    recs.append(rec)
print('records', len(recs), 'first', [r.hex() for r in recs[:8]])
for i, r in enumerate(recs[:30]):
    print(i, 'b0', r[0], 'b3', r[3], 'b5', r[5], 'b9', r[9])
