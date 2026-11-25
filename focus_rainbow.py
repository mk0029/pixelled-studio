import struct, collections
import numpy as np

paths = [
    r'D:\ashish\Led\Controller-1\00_program1.led',
    r'D:\ashish\Program_1\_T_1000_AC\00_1.led',
    r'D:\Program_1\_T_1000_AC\00_1.led',
    r'D:\BACKUP TORHAN SHOWS\Led\Controller-1\00_program1.led',
]
for p in paths:
    d = open(p, 'rb').read()
    n = (len(d) - 20992) // 3072
    print('\n', p, 'size', len(d), 'frames', n)
    for k in [0, 1, 2, 3, n // 2, n - 1]:
        f = d[512 + k * 3072:512 + (k + 1) * 3072]
        print(' frame', k, ' '.join(f'{x:02X}' for x in f[:18]))
