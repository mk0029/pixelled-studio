import collections

led = open(r'D:\ashish\Led\Controller-1\00_program1.led', 'rb').read()
rec = open(r'D:\ashish\Program_1\_rec.bin', 'rb').read()

# Frame 0: REC has 81:600, 82:1200, 83:1272 ; LED has BA:600, FA:1200, FB:1272
r0 = rec[0:3072]
l0 = led[512:512+3072]
r81 = [i for i,v in enumerate(r0) if v == 0x81]
lBA = [i for i,v in enumerate(l0) if v == 0xBA]
print('REC 0x81 count', len(r81), 'first20', r81[:20])
print('LED 0xBA count', len(lBA), 'first20', lBA[:20])
print('same positions:', sum(1 for a,b in zip(r81,lBA) if a==b), '/', len(r81))

print()
print('=== channel (byte mod 3) distribution ===')
for name, arr in [('REC81', r81), ('LED_BA', lBA)]:
    c = collections.Counter(i%3 for i in arr)
    print(name, dict(sorted(c.items())))

print()
print('=== pixel index distribution (byte//3) ===')
for name, arr in [('REC81', r81), ('LED_BA', lBA)]:
    ps = [i//3 for i in arr]
    print(name, 'unique pixels', len(set(ps)), 'first20', ps[:20])

print()
print('=== row/col of REC81 pixels ===')
rp = sorted(set(i//3 for i in r81))
print('rows', dict(sorted(collections.Counter(p//32 for p in rp).items())))
print('cols', dict(sorted(collections.Counter(p%32 for p in rp).items())))
print('=== row/col of LED_BA pixels ===')
lp = sorted(set(i//3 for i in lBA))
print('rows', dict(sorted(collections.Counter(p//32 for p in lp).items())))
print('cols', dict(sorted(collections.Counter(p%32 for p in lp).items())))
