import json

p = r'C:\Users\mkhic\AppData\Local\Temp\opencode\frida_bundle.zip'
d = json.load(open(p, encoding='utf-8'))
recs = d.get('records', [])
print('records:', len(recs))
r0 = recs[0]
print('record keys:', list(r0.keys()))
print(json.dumps(r0, ensure_ascii=False)[:1500])
