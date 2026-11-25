import numpy as np
# emulate AVI 240-wide gradient: cell width 7.5, color = floor(px/7.5)*8
row=[int(np.floor(px/7.5))*8 for px in range(240)]
print('cell width emulation first 32:',row[:32])
for bw in [5,6,7,8,10]:
    avgs=[sum(row[x*bw:(x+1)*bw])/bw for x in range(240//bw)]
    from collections import Counter
    c=Counter(round(a,1) for a in avgs)
    print('bw',bw,'top',c.most_common(6))
