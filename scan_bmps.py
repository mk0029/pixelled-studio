from PIL import Image
import glob, collections, numpy as np

for p in glob.glob(r'D:\ashish\*.bmp') + glob.glob(r'D:\ashish\*.jpg'):
    try:
        im = Image.open(p).convert('RGB')
        arr = np.array(im)
        u = np.unique(arr.reshape(-1, 3), axis=0)
        c = collections.Counter(map(tuple, arr.reshape(-1, 3))).most_common(4)
        print(p.split('\\')[-1], 'size', im.size, 'unique', len(u), 'top', c)
    except Exception as e:
        print(p, 'ERR', e)
