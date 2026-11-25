import collections
led = open(r'D:\ashish\nnn\Led\Controller-1\00_program1.led','rb').read()
lo=512
f=led[lo:lo+3072]
for c in range(0,3072,512):
    h=collections.Counter(f[c:c+512])
    print(f'sector {c//512}: distinct={len(h)} top={[(f"{k:02X}",v) for k,v in h.most_common(6)]}')
print()
print('bytes 2000..2100:', ' '.join(f'{b:02X}' for b in f[2000:2100]))
print('bytes 3000..3072:', ' '.join(f'{b:02X}' for b in f[3000:3072]))
