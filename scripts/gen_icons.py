from PIL import Image, ImageDraw
import os
os.makedirs("public/icons", exist_ok=True)
def make(size):
    img = Image.new("RGBA", (size,size), (9,9,11,255))
    d = ImageDraw.Draw(img)
    n = 5
    pad = size//8
    cell = (size - pad*2)//n
    colors = [(45,212,191),(154,124,255),(255,200,87),(110,231,168),(251,146,60)]
    for y in range(n):
        for x in range(n):
            idx = (x+y)%len(colors)
            c = colors[idx]
            x0 = pad + x*cell + cell//8
            y0 = pad + y*cell + cell//8
            x1 = pad + (x+1)*cell - cell//8
            y1 = pad + (y+1)*cell - cell//8
            d.rounded_rectangle([x0,y0,x1,y1], radius=cell//6, fill=c)
    img.save(f"public/icons/icon-{size}.png")
make(192)
make(512)
# maskable copy
import shutil
shutil.copyfile("public/icons/icon-512.png","public/icons/icon-maskable-512.png")
print("done")
