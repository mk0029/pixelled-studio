import collections
a=open(r'D:\ashish\nnn\Led\Controller-1\00_program1.led','rb').read()[512:512+3072]
b=open(r'D:\ashish\n2\Led\Controller-1\00_program1.led','rb').read()[512:512+3072]
print('tail a',hex(a[2048]),'tail b',hex(b[2048]))
for sh in range(256):
    eq=sum(1 for i in range(3072) if ((a[i]+sh)&0xff)==b[i])
    if eq>100: print('shift',sh,'equal',eq)
d=[(b[i]-a[i])&0xff for i in range(3072)]
print('diff hist top',collections.Counter(d).most_common(8))
print('first 24 a',' '.join(f'{x:02X}' for x in a[:24]))
print('first 24 b',' '.join(f'{x:02X}' for x in b[:24]))
