from PIL import Image
import collections
import numpy as np

p = r'D:\ashish\celibration动画参照.bmp'
im = Image.open(p)
print('size', im.size, 'mode', im.mode)
im = im.convert('RGB')
arr = np.array(im)
print('unique colours', len(np.unique(arr.reshape(-1, 3), axis=0)))
print('top', collections.Counter(map(tuple, arr.reshape(-1, 3))).most_common(12))
print('first 8x8 RGB:', [tuple(x) for x in arr[0, :8]])
