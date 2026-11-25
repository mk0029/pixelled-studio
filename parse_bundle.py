import json

p = r'C:\Users\mkhic\AppData\Local\Temp\opencode\frida_bundle.zip'
d = json.load(open(p, encoding='utf-8'))
print('top keys:', list(d.keys()))
arts = d.get('artifacts', [])
print('artifacts:', len(arts))
for a in arts[:10]:
    print(' ', {k: (str(v)[:120] if isinstance(v,(str,dict,list)) else v) for k,v in a.items() if k != 'content'})
    if 'content' in a:
        print('   content type', type(a['content']), 'len', len(str(a['content'])))
