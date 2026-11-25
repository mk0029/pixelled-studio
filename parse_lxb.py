import collections
p = r'D:\ashish\celibration.Lxb'
d = open(p, 'rb').read()
recs = [d[512+i*16:512+(i+1)*16] for i in range(600)]
for field in (3, 11, 15):
    vals = [r[field] for r in recs]
    print('field', field, 'unique', len(set(vals)), 'range', min(vals), max(vals),
          'common', collections.Counter(vals).most_common(10))
# print first 40 decoded as (b3-0xcd, b11-0x27, b15-0xcd)
for i in range(40):
    r = recs[i]
    print(i, r[3]-0xCD, r[11]-0x27, r[15]-0xCD)
