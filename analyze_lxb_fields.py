import struct, collections
def score(start,d):
    recs=[d[start+i*16:start+(i+1)*16] for i in range(600)]
    if len(recs[-1])<16: return None
    idx=[int.from_bytes(r[4:6],'big') for r in recs]
    x=[int.from_bytes(r[6:8],'big') for r in recs]
    y=[int.from_bytes(r[8:10],'big') for r in recs]
    s=0
    s+= sum(1 for v in idx if 0<=v<600)
    s+= sum(1 for v in x if 0<=v<30)
    s+= sum(1 for v in y if 0<=v<20)
    return s,idx,x,y
for path,key in [(r'D:\ashish\1234567.Lxb',0x6c),(r'D:\ashish\234.Lxb',0x4e)]:
    d=bytes((x-key)&0xff for x in open(path,'rb').read())
    best=[]
    for start in range(480,560):
        r=score(start,d)
        if r: best.append((r[0],start))
    best.sort(reverse=True)
    print(path,'best',best[:8])
    for sc,start in best[:3]:
        _,idx,x,y=score(start,d)
        print(' start',start,'idx range',min(idx),max(idx),'x',min(x),max(x),'y',min(y),max(y))
        print('  first8',[(idx[i],x[i],y[i]) for i in range(8)])
