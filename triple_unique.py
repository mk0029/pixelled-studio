import collections, json
import numpy as np

meta = json.load(open(r'D:\TOHRAN PROJECT\cal_channel_map.json'))['decoded']
s = [np.array([px[c] for px in meta[c]]) for c in range(3)]
triples = [tuple(int(s[c][k]) for c in range(3)) for k in range(600)]
c = collections.Counter(triples)
print('unique triples', len(c), 'of 600')
print('duplicated groups', sum(1 for v in c.values() if v>1), 'max group', max(c.values()))
print('first 20', triples[:20])
