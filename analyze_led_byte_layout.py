import numpy as np, collections
led=np.frombuffer(open(r'D:\ashish\n2\Led\Controller-1\00_program1.led','rb').read()[512:512+3072],dtype=np.uint8)
pad=collections.Counter(led.tolist()).most_common(1)[0][0]
print('pad/mode byte',hex(pad))
idx=np.where(led!=pad)[0]
print('non-pad count',len(idx),'first',idx[:20].tolist(),'last',idx[-20:].tolist())
print('min',idx.min(),'max',idx.max())
for start in range(0,3072,256):
    seg=led[start:start+256]
    nz=(seg!=pad).sum()
    print(f'{start:04x}-{start+255:04x}: nonpad {nz:3d}  head {" ".join(f"{x:02X}" for x in seg[:8])}')
