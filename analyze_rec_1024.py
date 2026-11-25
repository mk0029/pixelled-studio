import numpy as np, collections
rec=np.frombuffer(open(r'D:\ashish\Program_1\_rec.bin','rb').read(),dtype=np.uint8)[:24576]
print('len',len(rec),'chunks of 1024',len(rec)//1024)
for c in range(24):
    ch=rec[c*1024:(c+1)*1024]
    cnt=collections.Counter(ch.tolist())
    print(f'chunk {c:2d} distinct {len(cnt):3d} top {cnt.most_common(6)}')
print('first 128 hex:', ' '.join(f'{x:02X}' for x in rec[:128]))
print('at 1024:', ' '.join(f'{x:02X}' for x in rec[1024:1152]))
