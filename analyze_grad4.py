import collections
import cv2
import numpy as np

rec = open(r'D:\ashish\Program_1\_rec.bin','rb').read()[:24576]
led = open(r'D:\ashish\nnn\Led\Controller-1\00_program1.led','rb').read()
lo=512
s0 = rec[:3072]
pix = [tuple(led[lo+i*3:lo+i*3+3]) for i in range(1024)]

print('=== REC slice0 grid (8x8 sample) ===')
for y in range(0,32,4): print(' '.join(f'{s0[y*32+x]:02X}' for x in range(0,32,4)))
print('=== first 40 REC slice0 ===', ' '.join(f'{b:02X}' for b in s0[:40]))
print('=== first 40 LED bytes ===', ' '.join(f'{b:02X}' for b in led[lo:lo+40]))
print()

# map each REC value -> set of LED triplet values at same index
m = collections.defaultdict(collections.Counter)
for i in range(1024):
    m[s0[i]][pix[i]] += 1
print('=== REC val -> LED triplet at SAME index (top 5 each) ===')
for k in sorted(m)[:25]:
    tops = [(''.join(f'{b:02X}' for b in tr),n) for tr,n in m[k].most_common(5)]
    print(f'{k:02X}: n={sum(m[k].values())} {tops}')

# reverse: LED ch0 value -> REC values
mr = collections.defaultdict(collections.Counter)
for i in range(1024):
    mr[pix[i][0]][s0[i]] += 1
print('=== LED ch0 -> REC val at same index ===')
for k in sorted(mr)[:25]:
    tops = [(f'{r:02X}',n) for r,n in mr[k].most_common(5)]
    print(f'{k:02X}: n={sum(mr[k].values())} {tops}')
