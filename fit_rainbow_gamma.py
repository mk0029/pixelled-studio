import colorsys, collections
import numpy as np

root = r'D:\$RECYCLE.BIN\S-1-5-21-1788527993-1725293482-2949566873-1001'
ledp = root + r'\$RFZPO9I\_T_1000_AC\00_1.led'
d = open(ledp, 'rb').read()
f = np.frombuffer(d[512:512 + 3072], dtype=np.uint8).astype(int)
mask = collections.Counter(f[2048:].tolist()).most_common(1)[0][0]
dec = ((f - mask) & 0xff)[:1800].reshape(600, 3)

for offset in [0.0, 1/3, 2/3, 0.5]:
    for direction in [1, -1]:
        src = np.array([
            [round(v * 255) for v in colorsys.hsv_to_rgb((direction * p / 600 + offset) % 1.0, 1, 1)]
            for p in range(600)
        ])
        # fit exponent per channel globally
        s = src.reshape(-1) / 255
        t = dec.reshape(-1) / 255
        ok = (s > 0) & (t > 0)
        e = np.sum(np.log(t[ok]) * np.log(s[ok])) / np.sum(np.log(s[ok]) ** 2)
        pred = np.clip(np.round(255 * s ** e), 0, 255)
        mad = np.abs(pred.reshape(600, 3) - dec).mean()
        print(f'offset={offset:.3f} dir={direction:+d} exp={e:.3f} mad={mad:.2f} sample_src={src[0].tolist()} got={dec[0].tolist()}')
