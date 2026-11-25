p = r'D:\ashish\celibration.Lxb'
b = open(p, 'rb').read()
for start in [0, 256, 512, 768, 1024, 2048, 4096, 8192]:
    print('\n', hex(start), ' '.join(f'{x:02X}' for x in b[start:start + 96]))
# count 0x4c positions
print('\n0x4C positions', [i for i, x in enumerate(b) if x == 0x4C][:20])
