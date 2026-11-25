import os
for root in [r'D:\ashish', r'D:\ashish\Led', r'D:\ashish\celibration']:
    print('\n===', root)
    for dp, dn, fn in os.walk(root):
        for name in fn:
            print(os.path.join(dp, name))
