import collections, json
import numpy as np

root = r'D:\ashish\blue.v2\Led\Controller-1'
def dec(fn):
    d = open(root + '\\' + fn, 'rb').read()
    f = np.frombuffer(d[512:512+3072], dtype=np.uint8).astype(int)
    mask = collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
    return (f - mask) & 0xff

R, B, G = dec('00_red-v2.led'), dec('01_blue.v2.led'), dec('02_gray-v2.led')
meta = {n: json.load(open(f'D:\\TOHRAN PROJECT\\cal_ramp_{n}.json'))['decoded'] for n in ['red','blue','grey']}
srcR = np.array([p[0] for p in meta['red']])
srcB = np.array([p[2] for p in meta['blue']])
srcG = np.array([p[0] for p in meta['grey']])

Rpos = np.where(R != 0)[0]
Bpos = np.where(B != 0)[0]
Gpos = np.where(G != 0)[0]
print('nonzero', len(Rpos), len(Bpos), len(Gpos))
print('R&B overlap', len(set(Rpos.tolist()) & set(Bpos.tolist())))
print('R & G overlap', len(set(Rpos.tolist()) & set(Gpos.tolist())))

# rank-map: sort positions by exported value -> sort LEDs by source value
def rankmap(pos, vals, src):
    order_pos = pos[np.argsort(vals[pos], kind='stable')]
    order_led = np.argsort(src, kind='stable')
    n = min(len(order_pos), len(order_led))
    m = np.full(600, -1, dtype=int)
    m[order_led[:n]] = order_pos[:n]
    return m

mR = rankmap(Rpos, R, srcR)
mB = rankmap(Bpos, B, srcB)
mG = rankmap(Gpos, G, srcG)
print('mapped LEDs', (mR>=0).sum(), (mB>=0).sum(), (mG>=0).sum())

# consistency: grey ramp should give similar value at all three channel positions of an LED
ok = (mR>=0)&(mB>=0)&(mG>=0)
vr, vb, vg = G[mR[ok]], G[mB[ok]], G[mG[ok]]
print('LEDs with all 3 positions', ok.sum())
print('grey channel spread mean', round(float(np.mean(np.maximum.reduce([vr,vb,vg]) - np.minimum.reduce([vr,vb,vg]))), 2))
print('  samples', [(int(a),int(b),int(c)) for a,b,c in zip(vr[:12],vb[:12],vg[:12])])

# cross-check: red ramp at blue/green positions should be ~0
print('red ramp at blue positions mean', round(float(R[mB[ok]].mean()), 2))
print('red ramp at green positions mean', round(float(R[mG[ok]].mean()), 2))
print('blue ramp at red positions mean', round(float(B[mR[ok]].mean()), 2))
print('blue ramp at green positions mean', round(float(B[mG[ok]].mean()), 2))
