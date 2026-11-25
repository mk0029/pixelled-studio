import collections
for path,key,start in [(r'D:\ashish\1234567.Lxb',0x6c,512),(r'D:\ashish\234.Lxb',0x4e,518)]:
    d=bytes((x-key)&0xff for x in open(path,'rb').read())
    recs=[d[start+i*16:start+(i+1)*16] for i in range(600)]
    print('\n',path,'start',start)
    for b in range(16):
        vals=[r[b] for r in recs]
        print('byte',b,'distinct',len(set(vals)),'min',min(vals),'max',max(vals),'top',collections.Counter(vals).most_common(6))
    print('first 6 records:')
    for r in recs[:6]: print(' '.join(f'{x:02X}' for x in r))
