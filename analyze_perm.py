import collections

led = open(r'D:\ashish\Led\Controller-1\00_program1.led', 'rb').read()
rec = open(r'D:\ashish\Program_1\_rec.bin', 'rb').read()
fc = led[12] * 256 + led[13]
M = {0x81: 0xBA, 0x82: 0xFA, 0x83: 0xFB, 0x84: 0xFB, 0x85: 0xFB}

ledsig = [bytearray(fc) for _ in range(3072)]
recsig = [bytearray(fc) for _ in range(3072)]
for f in range(fc):
    lo = 512 + f * 3072
    ro = f * 24576
    for i in range(3072):
        ledsig[i][f] = led[lo + i]
        recsig[i][f] = M.get(rec[ro + i], 0)

lg = collections.defaultdict(list)
rg = collections.defaultdict(list)
for i, s in enumerate(ledsig):
    lg[bytes(s)].append(i)
for j, s in enumerate(recsig):
    rg[bytes(s)].append(j)

print('=== signatures ===')
for sig, li in sorted(lg.items(), key=lambda kv: -len(kv[1])):
    print(f'LED sig n={len(li)} first20={[hex(x) for x in sig[:20]]} pos0={li[0]}')
for sig, rj in sorted(rg.items(), key=lambda kv: -len(kv[1])):
    print(f'REC sig n={len(rj)} first20={[hex(x) for x in sig[:20]]} pos0={rj[0]}')

print('=== exact match rate at same position ===')
ok = sum(1 for i in range(3072) if ledsig[i] == recsig[i])
print(f'{ok}/{3072} = {100*ok/3072:.2f}%')

print('=== per-group identity ===')
for sig, li in sorted(lg.items(), key=lambda kv: -len(kv[1])):
    same = sum(1 for i in li if ledsig[i] == recsig[i])
    print(f'LED group n={len(li)} same-position match={same}')

print('=== check other REC slices ===')
for sl in range(8):
    ok = 0
    for f in range(fc):
        lo = 512 + f * 3072
        ro = f * 24576 + sl * 3072
        for i in range(3072):
            if led[lo+i] == M.get(rec[ro+i], 0):
                ok += 1
    print(f'slice {sl}: {100*ok/(fc*3072):.2f}%')
