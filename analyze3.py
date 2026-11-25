import collections

led = open(r'D:\ashish\Led\Controller-1\00_program1.led', 'rb').read()
rec = open(r'D:\ashish\Program_1\_rec.bin', 'rb').read()
fc = led[12] * 256 + led[13]

# Goal: predict LED[i] from REC bit b at slice b position i, b=0..7.
# Test mapping: for each source bit b, what LED values does it correspond to?
# Since each byte code 0x81..0x85 maps to fixed LED value 0xBA/0xFA/0xFB,
# and bits across slices determine the code, we need to find f(code)->LED value per bit-position/channel.

# Approach: For every position i and frame f, build the 8-bit code from slices,
# then see LED value. Build a table code->LED value, and check if it is position-independent.
print('=== REC code -> LED value (slice0 position i) ===')
code2led = collections.defaultdict(collections.Counter)
for f in range(fc):
    ro = f * 24576
    lo = 512 + f * 3072
    for i in range(3072):
        code = 0
        for b in range(8):
            bit = rec[ro + b*3072 + i]
            code = (code << 1) | (bit & 1)
        code2led[code][led[lo + i]] += 1

for code in sorted(code2led):
    c = code2led[code]
    print(f'code={code:02X} ({code:08b}): ' + ', '.join(f'{k:02X}:{v}' for k,v in c.most_common()))

print()
print('=== is code->led consistent? ===')
bad = 0
tot = 0
for f in range(fc):
    ro = f * 24576
    lo = 512 + f * 3072
    for i in range(3072):
        code = 0
        for b in range(8):
            code = (code << 1) | (rec[ro + b*3072 + i] & 1)
        pred = code2led[code].most_common(1)[0][0]
        if pred != led[lo + i]:
            bad += 1
        tot += 1
print(f'mismatch {bad}/{tot} = {100*bad/tot:.2f}%')
