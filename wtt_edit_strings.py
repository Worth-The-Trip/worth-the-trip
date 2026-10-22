def repl(path, old, new):
    s = open(path, encoding='utf-8').read()
    n = s.count(old)
    assert n == 1, f"{path}: pattern found {n} times"
    open(path, 'w', encoding='utf-8').write(s.replace(old, new))
    print("ok", path)

# ---------- strings.js ----------
repl('src/js/data/strings.js',
"    'modal.unlockAll': 'Unlock All Guides',\n    'modal.subscribe': 'Subscribe - Unlock All Guides',\n    'modal.unlockAllSub': 'One subscription · all guides',",
"    'modal.unlockAll': 'Unlock All Guides',\n    'modal.unlockFree': 'Unlock free',\n    'toast.unlockedFree': '✓ Free guide unlocked — enjoy!',\n    'modal.unlockAllSub': 'One subscription · all guides',")

repl('src/js/data/strings.js',
"    'modal.unlockAll': '全ガイドをアンロック',\n    'modal.unlockAllSub': 'サブスクリプション · 一括',",
"    'modal.unlockAll': '全ガイドをアンロック',\n    'modal.unlockFree': '無料で解禁',\n    'modal.subscribe': 'サブスクリプションで全ガイドをアンロック',\n    'modal.unlockAllSub': 'サブスクリプション · 一括',",
)
