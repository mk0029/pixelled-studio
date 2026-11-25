p = r'D:\ashish\celibration.Lxb'
d = open(p, 'rb').read()
recs = [d[512+i*16:512+(i+1)*16] for i in range(600)]
bad, xy = [], []
for i, r in enumerate(recs):
    x = r[3] - 0xCD
    idx = (r[15] - 0xCD) & 0xFF
    opts = []
    for k in range(3):
        v = idx + 256*k
        if v >= x and (v - x) % 20 == 0:
            y = (v - x)//20
            if 0 <= y < 30:
                opts.append(y)
    if len(opts) != 1:
        bad.append((i, x, idx, opts))
    else:
        xy.append((x, opts[0]))
print('bad', len(bad), bad[:10])
print('x range', min(x for x,y in xy), max(x for x,y in xy), 'y range', min(y for x,y in xy), max(y for x,y in xy))
print('unique xy', len(set(xy)), 'of', len(xy))
missing = [(x,y) for x in range(20) for y in range(30) if (x,y) not in set(xy)]
print('missing', len(missing), missing[:20])
print('first 20', xy[:20])
