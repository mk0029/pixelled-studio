import json, collections

p = r'C:\Users\mkhic\AppData\Local\Temp\opencode\frida_bundle.zip'
d = json.load(open(p, encoding='utf-8'))
recs = d.get('records', [])

events = []
for r in recs:
    nr = r.get('normalized_result') or {}
    for m in nr.get('messages', []) or []:
        pl = m.get('payload') if isinstance(m, dict) else None
        if isinstance(pl, dict) and pl.get('t') == 'FULL':
            events.append(pl)
events.sort(key=lambda e: e.get('seq', 0))
print('events', len(events), 'seq range', events[0]['seq'], events[-1]['seq'])

# around gradient load
for e in events:
    if 3400 <= e.get('seq',0) <= 3500:
        print(json.dumps(e, ensure_ascii=False)[:300])

print()
print('=== all unique paths after seq 3400 ===')
paths = collections.OrderedDict()
for e in events:
    if e.get('seq',0) < 3400: continue
    p = e.get('p') or e.get('path') or e.get('src')
    if p:
        paths.setdefault(p, []).append((e['seq'], e.get('tag')))
for p, occ in paths.items():
    print(f'{p}  first={occ[0]} count={len(occ)}')
