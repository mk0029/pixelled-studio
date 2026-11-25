import collections
import numpy as np

base = r'D:\ashish\celibration\Led\Controller-1'
def dec(name):
    b = open(f'{base}\\{name}.led', 'rb').read()
    f = np.frombuffer(b[512:512 + 3072], dtype=np.uint8).astype(int)
    mask = collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
    return (f - mask) & 0xff

frames = {n: dec(n) for n in ['red', 'green', 'blue']}
pos = {n: [i for i, v in enumerate(frames[n]) if v != 0] for n in frames}
for n in pos:
    print(n, 'active', len(pos[n]), 'first', pos[n][:10], 'last', pos[n][-5:])

# group by k-th active position
p = r'D:\ashish\Led\Controller-1\00_program1.led'
d = open(p, 'rb').read()
f = np.frombuffer(d[512:512 + 3072], dtype=np.uint8).astype(int)
mask = collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
rain = ((f - mask) & 0xff)
triples = [(rain[pos['red'][k]], rain[pos['green'][k]], rain[pos['blue'][k]]) for k in range(600)]
print('rainbow triples via k-th active positions:')
print(' first 20', triples[:20])
print(' distinct colours', len(set(triples)))
print(' saturated triples (one 0, one 255)', sum(1 for t in triples if 0 in t and 255 in t))
