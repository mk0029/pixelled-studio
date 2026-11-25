import glob, json
import numpy as np

uniq = json.load(open(r'D:\TOHRAN PROJECT\led_byte_map_full.json'))

def read_lxb(p):
    b=open(p,'rb').read()
    coord={}
    for i in range(600):
        if 512+(i+1)*16>len(b): break
        r=b[512+i*16:512+(i+1)*16]
        y=r[3]-0xCD; idx=(r[15]-0xCD)&255
        for w in range(3):
            v=idx+256*w
            if v>=y and (v-y)%20==0:
                x=(v-y)//20
                if 0<=x<30: coord[i]=(x,y); break
    return coord

for p in glob.glob(r'D:\ashish\*.Lxb'):
    coord=read_lxb(p)
    if len(coord)<600: 
        print(p.split('\\')[-1],'coords',len(coord)); continue
    by_xy={v:k for k,v in coord.items()}
    # for first 20 known LEDs assume k = unique index; check pos = 3*i + c
    hits=[]
    for c in range(3072):
        ok=sum(1 for k in range(20) if uniq[k][0]==3*by_xy[(k%30,k//30)]+c)
        if ok>=10: hits.append((ok,c))
    print(p.split('\\')[-1],'coords',len(coord),'hits',sorted(hits,reverse=True)[:3])
