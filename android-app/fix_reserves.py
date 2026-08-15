from pathlib import Path

p = Path('../app.js')
s = p.read_text(encoding='utf-8')

old = "const obligLeft = (today.getDate() < OBLIGATIONS_DAY) ? Math.max(0, obligationsTotal - paidOblig) : 0;"
new = "const obligLeft = Math.max(0, obligationsTotal - paidOblig);"
if old not in s:
    raise SystemExit('mandatory-payments calculation pattern not found')
s = s.replace(old, new, 1)

old = """if(ok){\n    txs = txs.filter(t => String(t.id) !== String(raw));\n    persistLocalCache();\n    render();\n  }"""
new = """if(ok){\n    txs = txs.filter(t => String(t.id) !== String(raw));\n    // A transaction deletion changes the real reserve state. Do not let a previous\n    // manual monthly-cut value keep a deleted debt/goal/payment marked as closed.\n    monthlyCut = null;\n    persistMetaCache();\n    persistLocalCache();\n    render();\n  }"""
if old not in s:
    raise SystemExit('deleteTx pattern not found')
s = s.replace(old, new, 1)

p.write_text(s, encoding='utf-8')
print('reserve patch applied')
