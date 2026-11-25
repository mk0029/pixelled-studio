import collections
for path,key in [(r'D:\ashish\1234567.Lxb',0x6c),(r'D:\ashish\234.Lxb',0x4e)]:
    d=bytes((x-key)&0xff for x in open(path,'rb').read())
    pos=[i for i,x in enumerate(d) if x==0x5a]
    print('\n',path,'count',len(pos),'first',pos[:20],'last',pos[-10:])
    diffs=[pos[i+1]-pos[i] for i in range(len(pos)-1)]
    print('diff top',collections.Counter(diffs).most_common(10))
