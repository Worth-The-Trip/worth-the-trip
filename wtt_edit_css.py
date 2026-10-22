def repl(path, old, new):
    s = open(path, encoding='utf-8').read()
    n = s.count(old)
    assert n == 1, f"{path}: pattern found {n} times"
    open(path, 'w', encoding='utf-8').write(s.replace(old, new))
    print("ok", path)

# ---------- styles.css ----------
repl('src/css/styles.css',
"  --vermilion-deep: #B71C1C;\n  --charcoal: #121212;",
"  --vermilion-deep: #B71C1C;\n  --green: #2E5D4B;\n  --green-deep: #1E3A2E;\n  --charcoal: #121212;", 1)

repl('src/css/styles.css',
""".btn-primary:hover {
  background: var(--vermilion-deep);
  box-shadow: 0 0 28px rgba(211, 47, 47, 0.5);
  transform: translateY(-1px);
}""",
""".btn-primary:hover {
  background: var(--vermilion-deep);
  box-shadow: 0 0 28px rgba(211, 47, 47, 0.5);
  transform: translateY(-1px);
}

.btn-green {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-xs);
  padding: 12px 24px;
  background: var(--green);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 600;
  font-family: var(--font-sans);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
  box-shadow: var(--shadow-glow);
  min-width: 140px;
}

.btn-green:hover {
  background: var(--green-deep);
  box-shadow: 0 0 28px rgba(30, 58, 46, 0.5);
  transform: translateY(-1px);
}

.btn-green .btn-label {
  display: block;
}""", 1)
