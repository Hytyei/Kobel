#!/usr/bin/env python3
"""Builds a single-file preview (kobel.html) with fonts, logo, crests, stadiums, league logos and eagle inlined. Usage: python3 web/build_preview.py OUT.html"""
import base64, glob, json, os, re, sys
WWW = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'android', 'app', 'src', 'main', 'assets', 'www')
os.chdir(WWW)
b = lambda p, m: f"data:{m};base64," + base64.b64encode(open(p, 'rb').read()).decode()
h = open('index.html', encoding='utf-8').read()
cr = {os.path.basename(p)[:-4]: b(p, 'image/svg+xml') for p in glob.glob('clubs/*.svg')}
st = {os.path.basename(p)[:-4]: b(p, 'image/png') for p in glob.glob('stadiums/*.png')}
lg = [b(f'leagues/t{i}.png', 'image/png') for i in range(6)]
h = h.replace('<img src="leagues/t${i}.png"', '<img src="${__LG[i]}"')
h = h.replace('url(stadiums/${id}.png);mask-image:url(stadiums/${id}.png)', 'url(${__ST[id]});mask-image:url(${__ST[id]})')
h = re.sub(r'clubs/\$\{(\w+)\}\.svg', r'${__CR[\1]}', h)
inj = f"const __CR={json.dumps(cr)},__ST={json.dumps(st)},__LG={json.dumps(lg)};\n"
h = h.replace('const CLUBS=[', inj + 'const CLUBS=[', 1)
h = h.replace('brand/logo.png', b('brand/logo.png', 'image/png'))
if os.path.exists('brand/eagle.png'):
    h = h.replace('brand/eagle.png', b('brand/eagle.png', 'image/png'))
h = re.sub(r'url\(["\']?(fonts/[^)"\']+)["\']?\)', lambda m: 'url("data:font/otf;base64,' + base64.b64encode(open(m.group(1), 'rb').read()).decode() + '")', h)
open(sys.argv[1], 'w', encoding='utf-8').write(h)
print(len(h) // 1000, 'KB')
