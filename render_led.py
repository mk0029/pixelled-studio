from PIL import Image
import numpy as np
led=open(r'D:\ashish\nnn\Led\Controller-1\00_program1.led','rb').read()
dec=[(b-7)&0xff for b in led[512:512+3072]]
pix=np.array([dec[i*3:i*3+3] for i in range(1024)],dtype=np.uint8)
# render 30x20
im=Image.fromarray(pix[:600].reshape(20,30,3),'RGB').resize((600,400),Image.NEAREST)
im.save(r'D:\TOHRAN PROJECT\led_gradient_30x20.png')
# render 32x20
im2=Image.fromarray(pix[:640].reshape(20,32,3),'RGB').resize((640,400),Image.NEAREST)
im2.save(r'D:\TOHRAN PROJECT\led_gradient_32x20.png')
# render 32x32
im3=Image.fromarray(pix[:1024].reshape(32,32,3),'RGB').resize((512,512),Image.NEAREST)
im3.save(r'D:\TOHRAN PROJECT\led_gradient_32x32.png')
print('saved')
