import json, collections

p = r'C:\Users\mkhic\AppData\Local\Temp\opencode\frida_bundle.zip'
d = json.load(open(p, encoding='utf-8'))
recs = d.get('records', [])

allmsgs = []
for r in recs:
    nr = r.get('normalized_result') or {}
    for m in nr.get('messages', []) or []:
        allmsgs.append(m)
print('total messages:', len(allmsgs))
m0 = allmsgs[0]
print('sample message keys:', list(m0.keys()) if isinstance(m0, dict) else type(m0))
print(json.dumps(m0, ensure_ascii=False)[:800])

# collect FULL payloads
events = []
for m in allmsgs:
    pl = m.get('payload') if isinstance(m, dict) else None
    if isinstance(pl, dict) and pl.get('t') == 'FULL':
        events.append(pl)
print('FULL events:', len(events))
if events:
    print('event sample:', json.dumps(events[0], ensure_ascii=False)[:500])
    print('event keys:', list(events[0].keys()))

# search for gradient AVI
for e in events:
    s = json.dumps(e, ensure_ascii=False)
    if 'gradient' in s.lower() or 'test_gradient' in s.lower():
        print('GRADIENT:', s[:400])
