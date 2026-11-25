import collections
import numpy as np

for name, folder, ledfile in [
    ('grey','gray-v2', r'D:\ashish\blue.v2\Led\Controller-1\02_gray-v2.led'),
    ('red','red-v2',  r'D:\ashish\blue.v2\Led\Controller-1\00_red-v2.led'),
    ('blue','blue.v2',r'D:\ashish\blue.v2\Led\Controller-1\01_blue.v2.led'),
]:
    rec = np.frombuffer(open(f'D:\\ashish\\{folder}\\_rec.bin','rb').read()[:3072], dtype=np.uint8).astype(int)
    d = open(ledfile,'rb').read()
    led = np.frombuffer(d[512:512+3072], dtype=np.uint8).astype(int)
    delta = collections.Counter(((led - rec) & 0xff).tolist())
    print(name, 'top delta', delta.most_common(8), 'distinct', len(delta))
    print('  rec head', rec[:12].tolist(), 'led raw head', led[:12].tolist())
