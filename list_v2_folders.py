import os
for root in [r'D:\ashish\blue.v2', r'D:\ashish\red-v2', r'D:\ashish\gray-v2']:
    print('\n===', root)
    for dp, dn, fn in os.walk(root):
        for name in fn:
            p = os.path.join(dp, name)
            print(p, os.path.getsize(p))
