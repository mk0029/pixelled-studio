import collections
import numpy as np

# decoded block LED
p = r'D:\ashish\n2\Led\Controller-1\00_program1.led'
d = open(p, 'rb').read()
f = np.frombuffer(d[512:512 + 3072], dtype=np.uint8).astype(int)
mask = collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
dec = (f - mask) & 0xff
print('mask', hex(mask), 'decoded top', collections.Counter(dec.tolist()).most_common(8))

# known block source: r=bx*8, g=by*12, b=128, 30x20
src = []
for by in range(20):
    for bx in range(30):
        src += [bx * 8, by * 12, 128]
src = np.array(src[:1800])
got = dec[:1800]
print('pairs sample', list(zip(src[:18].tolist(), got[:18].tolist())))
# per source value -> mean decoded
m = collections.defaultdict(list)
for s, g in zip(src.tolist(), got.tolist()):
    m[s].append(g)
for s in sorted(m):
    print(f' src {s:3d} -> mean {np.mean(m[s]):7.2f} n={len(m[s])} vals={sorted(set(m[s]))[:8]}')
# fit exponent e: got/255 = (src/255)^e using nonempty
ss = np.array([s for s in sorted(m)])
mm = np.array([np.mean(m[s]) for s in ss])
e = np.sum(np.log(mm / 255) * np.log(ss / 255)) / np.sum(np.log(ss / 255) ** 2)
print('fitted exponent', e, '1/e', 1 / e)
pred = np.clip(np.round(255 * (ss / 255) ** e), 0, 255)
print('fit residual', np.abs(pred - mm).mean())
