import json

p = r'C:\Users\mkhic\AppData\Local\Temp\opencode\frida_bundle.zip'
d = json.load(open(p, encoding='utf-8'))
recs = d.get('records', [])
for i, r in enumerate(recs):
    op = r.get('operation')
    nr = r.get('normalized_result') or {}
    msg = nr.get('message')
    if op and 'frida' in str(op).lower():
        print(i, op, 'keys:', list(nr.keys()))
        print('  summary:', str(nr.get('summary'))[:300])
