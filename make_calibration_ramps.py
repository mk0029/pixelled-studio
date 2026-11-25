"""Generate 30x20 (600 LED) calibration ramp AVIs for LedEdit export.

Each file has 32 identical frames at 15 fps, 8x8 pixels per LED (240x160).
LED k (row-major, k = row*30 + col) gets level round(k*255/599), 0..255.
Sidecar .json records the real decoded RGB of each LED after JPEG, so the
source values used for calibration are exact, not nominal.
"""
import io
import json
import os

import cv2
import numpy as np
from PIL import Image, ImageDraw

W, H, N, FPS = 240, 160, 32, 15
COLS, ROWS, BW, BH = 30, 20, 8, 8
OUT = r"D:\TOHRAN PROJECT"


def avi_bytes(img):
    b = io.BytesIO()
    img.save(b, format="JPEG", quality=100, subsampling=0)
    jpg = b.getvalue()
    us = 1000000 // FPS

    def chunk(cid, data):
        out = cid + len(data).to_bytes(4, "little") + data
        return out + (b"\0" if len(data) % 2 else b"")

    def lst(typ, data):
        body = typ + data
        out = b"LIST" + len(body).to_bytes(4, "little") + body
        return out + (b"\0" if len(body) % 2 else b"")

    jl = len(jpg)
    avih = struct.pack("<14I", us, jl * FPS, 0, 0x10, N, 0, 1, jl, W, H, 0, 0, 0, 0)
    strh = (b"vids" + b"MJPG"
            + struct.pack("<IHHIIIIIIII", 0, 0, 0, 0, 1, FPS, 0, N, jl, 0xFFFFFFFF, 0)
            + struct.pack("<HHHH", 0, 0, W, H))
    strf = struct.pack("<IiiHH4sIiiII", 40, W, H, 1, 24, b"MJPG", jl, 0, 0, 0, 0)
    body = lst(b"hdrl", chunk(b"avih", avih) + lst(b"strl", chunk(b"strh", strh) + chunk(b"strf", strf)))
    movi, offs = b"", []
    for _ in range(N):
        offs.append(4 + len(movi))
        movi += chunk(b"00dc", jpg)
    idx = b"".join(b"00dc" + struct.pack("<III", 0x10, o, jl) for o in offs)
    body += lst(b"movi", movi) + chunk(b"idx1", idx)
    return b"RIFF" + (len(body) + 4).to_bytes(4, "little") + b"AVI " + body


import struct  # kept near use to avoid confusion with the packed struct calls


def make(name, channel):
    im = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(im)
    nominal = []
    for row in range(ROWS):
        for col in range(COLS):
            k = row * COLS + col
            v = round(k * 255 / (COLS * ROWS - 1))
            rgb = (v, v, v) if channel == "grey" else ((v, 0, 0) if channel == "red" else (0, 0, v))
            nominal.append(rgb)
            d.rectangle([col * BW, row * BH, (col + 1) * BW - 1, (row + 1) * BH - 1], fill=rgb)
    avi = os.path.join(OUT, f"cal_ramp_{name}.avi")
    with open(avi, "wb") as f:
        f.write(avi_bytes(im))

    cap = cv2.VideoCapture(avi)
    ok, frame = cap.read()
    cap.release()
    if not ok:
        raise RuntimeError(f"cannot decode {avi}")
    frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    actual = []
    for row in range(ROWS):
        for col in range(COLS):
            patch = frame[row * BH:(row + 1) * BH, col * BW:(col + 1) * BW]
            actual.append([int(x) for x in np.median(patch.reshape(-1, 3), axis=0)])
    meta = os.path.join(OUT, f"cal_ramp_{name}.json")
    with open(meta, "w") as f:
        json.dump({"name": name, "cols": COLS, "rows": ROWS, "frames": N, "fps": FPS,
                   "nominal": nominal, "decoded": actual}, f)
    print(f"{avi}: {os.path.getsize(avi)} bytes, {N} frames; {meta}")
    print("  decoded first/last", actual[0], actual[-1])


for name, ch in [("grey", "grey"), ("red", "red"), ("blue", "blue")]:
    make(name, ch)
