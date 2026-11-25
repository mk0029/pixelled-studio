import collections
led = open(r'D:\ashish\Led\Controller-1\00_program1.led', 'rb').read()
fc = led[12]*256 + led[13]
data = led[512:512+fc*3072]
h = collections.Counter(data)
print('global LED byte histogram (top 20):', [(f'{k:02X}', v) for k,v in h.most_common(20)])
print('min/max:', min(h), max(h))
print('distinct byte values:', len(h))
# per pixel triplet distribution over a few frames
for f in [0, 4, 8, 16, 24, 30, 58, 87]:
    lo = 512 + f*3072
    trip = collections.Counter(tuple(led[lo+i:lo+i+3]) for i in range(0, 3072, 3))
    print(f'f{f} top triplets:', [(''.join(f'{b:02X}' for b in k), v) for k,v in trip.most_common(6)])
