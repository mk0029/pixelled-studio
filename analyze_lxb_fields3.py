def metrics(start,d):
    recs=[d[start+i*16:start+(i+1)*16] for i in range(600)]
    if len(recs[-1])<16: return None
    idx=[int.from_bytes(r[2:6],'big') for r in recs]
    x=[int.from_bytes(r[6:8],'big') for r in recs]
    y=[int.from_bytes(r[8:10],'big') for r in recs]
    return (len(set(idx)),len(set(x)),len(set(y)),min(idx),max(idx),min(x),max(x),min(y),max(y),idx,x,y)
for path,key in [(r'D:\ashish\1234567.Lxb',0x6c),(r'D:\ashish\234.Lxb',0x4e)]:
    d=bytes((x-key)&0xff for x in open(path,'rb').read())
    best=[]
    for start in range(480,560):
        m=metrics(start,d)
        if not m: continue
        sc=m[0]+m[1]+m[2]
        best.append((sc,start,m[:9]))
    best.sort(reverse=True)
    print('\n',path)
    for sc,start,mm in best[:6]: print(sc,start,mm)
