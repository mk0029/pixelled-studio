import collections
b=open(r'D:\ashish\Led\Controller-1\00_program1.led','rb').read()
uniq=[]
for i in range(116):
    f=b[512+i*3072:512+(i+1)*3072]
    if f not in uniq: uniq.append(f)
for n,f in enumerate(uniq):
    print('\nLED unique frame',n)
    for ch in range(3):
        vals=collections.Counter(f[ch::3])
        print('  channel',ch,'top',vals.most_common(5))
    # counts of first 1800 bytes by channel
    print('  pad bytes',collections.Counter(f[1800:]).most_common(3))
