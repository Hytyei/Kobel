#!/usr/bin/env python3
"""Writes modules/notes.js (the built-in class-notes batches after session 6) from database/content/*.notes.
Run before apply.py when a .notes file changes."""
import pathlib
ROOT = pathlib.Path(__file__).resolve().parent
C = ROOT.parent / 'database/content'
BATCH = [('N7', '008-session-7-8-things-colours-numbers.notes'), ('N9', '009-session-9-materials-objects-ordering.notes'), ('N10', '010-session-10-office-and-plurals.notes'), ('N11', '011-session-11-accusative-and-phone.notes')]
out = []
for var, f in BATCH:
    t = (C / f).read_text(encoding='utf-8')
    assert '`' not in t and '${' not in t and '\\' not in t, f
    lines = [l for l in t.split('\n') if not l.startswith('//')]
    out.append(f'const {var}=`' + '\n'.join(lines).strip() + '`;')
(ROOT / 'modules/notes.js').write_text('\n'.join(out) + '\n', encoding='utf-8')
print('notes.js', sum(len(x) for x in out), 'chars')
