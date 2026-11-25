def parse(start,d):
    recs=[d[start+i*16:start+(i+1)*16] for i in range(600)]
    if len(recs[-1])<16: return None
    return recs
for path,key in [(r'D:\ashish\1234567.Lxb',0x6c),(r'D:\ashish\234.Lxb',0x4e)]:
    d=bytes((x-key)&0xff for x in open(path,'rb').read())
    print('\n',path)
    results=[]
    for start in range(480,560):
        recs=parse(start,d)
        if not recs: continue
        # index candidates: high byte *256 + low byte
        for hi in range(16):
            for lo in range(16):
                if hi==lo: continue
                idx=[r[hi]*256+r[lo] for r in recs]
                if len(set(idx))!=600 or min(idx)!=0 or max(idx)!=599: continue
                for xb in range(16):
                    xs=[r[xb] for r in recs]
                    if len(set(xs))!=30 or min(xs)!=0 or max(xs)!=29: continue
                    for yb in range(16):
                        ys=[r[yb] for r in recs]
                        if len(set(ys))!=20 or min(ys)!=0 or max(ys)!=19: continue
                        results.append((start,hi,lo,xb,yb))
    print('matches',len(results))
    for r in results[:20]: print(r)
