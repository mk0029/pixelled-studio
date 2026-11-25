import numpy as np

rec = open(r'D:\ashish\gray-v2\_rec.bin', 'rb').read()
sl = np.frombuffer(rec[:3072], dtype=np.uint8)
print('first 96 bytes:', sl[:96].tolist())
print('bytes 0:600 sampled every 20:', sl[::20].tolist())
print('bytes 0:600 sampled every 40:', sl[::40].tolist())
# 1 byte per LED assumption: 20x30 region padded to 20x32?
for r in range(4):
    print('row', r, sl[r*32:r*32+32].tolist())
# 3 bytes per LED assumption
for r in range(2):
    print('triplets row', r, [tuple(sl[r*96+i*3:r*96+i*3+3]) for i in range(10)])
