import collections
a=open(r'D:\ashish\1234567.Lxb','rb').read()
b=open(r'D:\ashish\234.Lxb','rb').read()
d=[(a[i]-b[i])&0xff for i in range(len(a))]
print('diff histogram top',collections.Counter(d).most_common(10))
print('first 64 diffs',' '.join(f'{x:02X}' for x in d[:64]))
# try adding per-file XOR keys derived from first 4 bytes
# check if a and b are same after XOR with first-byte key
for op in ['sub','xor']:
   for keyname,key in [('k0',a[0]^b[0])]:
        if op=='xor': t=bytes(x^key for x in a)
        else: t=bytes((x-key)&0xff for x in a)
        eq=sum(1 for i in range(len(t)) if t[i]==b[i])
        print(op,keyname,hex(key),'equal bytes',eq,'/',len(t))
# check if data region is simple: byte = base + i*something
print('a[16:48]',' '.join(f'{x:02X}' for x in a[16:48]))
print('b[16:48]',' '.join(f'{x:02X}' for x in b[16:48]))
