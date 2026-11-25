import collections

led = open(r'D:\ashish\Led\Controller-1\00_program1.led', 'rb').read()
rec = open(r'D:\ashish\Program_1\_rec.bin', 'rb').read()
fc = led[12] * 256 + led[13]

print('=== LED frame-level histograms (all frames, compressed) ===')
prev = None
for f in range(fc):
    lo = 512 + f * 3072
    h = collections.Counter(led[lo:lo+3072])
    sig = tuple(sorted(h.items()))
    if sig != prev:
        print(f'frame {f:3d}: {[(hex(k), v) for k,v in sig]}')
        prev = sig

print()
print('=== REC slice-level histograms for frame 0 and 4 ===')
for f in [0, 4, 8, 16, 24]:
    for sl in range(8):
        ro = f * 24576 + sl * 3072
        h = collections.Counter(rec[ro:ro+3072])
        print(f'f{f} s{sl}: {[(hex(k), v) for k,v in sorted(h.items())][:12]}')
    print()

print('=== LED frame 4 pixel triplets (first 30) ===')
lo = 512 + 4 * 3072
for p in range(30):
    print(p, ' '.join(f'{led[lo+p*3+c]:02X}' for c in range(3)))
