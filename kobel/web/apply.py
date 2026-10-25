#!/usr/bin/env python3
"""Idempotent patcher: inserts web/modules/* into android/app/src/main/assets/www/index.html.
Each module is wrapped in /*@@name*/ ... /*@@end name*/ markers and replaced if it already exists."""
import re, sys, pathlib
ROOT = pathlib.Path(__file__).resolve().parent
HTML = ROOT.parent / 'android/app/src/main/assets/www/index.html'
src = HTML.read_text(encoding='utf-8')

def block(name, body, kind):
    a, b = f'/*@@{name}*/', f'/*@@end {name}*/'
    return f'{a}\n{body.rstrip()}\n{b}', a, b

def put(src, name, body, anchor, before=True):
    blk, a, b = block(name, body, None)
    if a in src:
        i, j = src.index(a), src.index(b) + len(b)
        return src[:i] + blk + src[j:]
    if anchor not in src:
        sys.exit(f'anchor missing for {name}: {anchor!r}')
    k = src.index(anchor)
    return src[:k] + blk + '\n' + src[k:] if before else src[:k+len(anchor)] + '\n' + blk + src[k+len(anchor):]

def sub(src, old, new, count=1):
    if new and new in src:
        return src          # already applied
    if old not in src and new == '':
        return src
    if old not in src:
        sys.exit(f'patch anchor missing: {old[:70]!r}')
    return src.replace(old, new, count)

mods = ROOT / 'modules'
def mod(n): return (mods / n).read_text(encoding='utf-8')

src = put(src, 'css-fonts', mod('fonts.css'), '</style>')
src = put(src, 'css-path', mod('path.css'), '</style>')
src = put(src, 'css-bl25', mod('bl25.css'), '</style>')
src = put(src, 'css-ui3', mod('ui3.css'), '</style>')
src = put(src, 'css-fx3', mod('fx3.css'), '</style>')
src = put(src, 'css-qx', mod('qx.css'), '</style>')
src = put(src, 'css-settings', mod('settings.css'), '</style>')
src = put(src, 'css-games', mod('games.css'), '</style>')
src = put(src, 'js-notes', mod('notes.js'), 'const BATCHES=[')
src = put(src, 'js-path', mod('path.js'), '/* ───────── events ───────── */')
src = put(src, 'js-social25', mod('social25.js'), '/* ───────── events ───────── */')
src = put(src, 'js-icons', mod('icons.js'), '/* ───────── events ───────── */')
src = put(src, 'js-ui3', mod('ui3.js'), '/* ───────── events ───────── */')
src = put(src, 'js-fx3', mod('fx3.js'), '/* ───────── events ───────── */')
src = put(src, 'js-playoff', mod('playoff.js'), '/* ───────── events ───────── */')
src = put(src, 'js-distract', mod('distract.js'), '/* ───────── events ───────── */')
src = put(src, 'js-snd', mod('snd.js'), '/* ───────── events ───────── */')
src = put(src, 'js-qx', mod('qx.js'), '/* ───────── events ───────── */')
src = put(src, 'js-settings', mod('settings.js'), '/* ───────── events ───────── */')
src = put(src, 'js-qv', mod('qv.js'), '/* ───────── events ───────── */')
src = put(src, 'js-games', mod('games.js'), '/* ───────── events ───────── */')
src = put(src, 'js-roadmap', mod('roadmap.js'), '/* ───────── events ───────── */')
exec((ROOT / 'patches.py').read_text(encoding='utf-8'))
HTML.write_text(src, encoding='utf-8')
print('applied;', len(src), 'bytes')
