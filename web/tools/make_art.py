#!/usr/bin/env python3
"""Generates the art the web UI uses but cannot draw cheaply at runtime. Needs Pillow and numpy.
  brand/emboss-{circle,shield,diamond}.webp  stepped relief behind a crest (the Bundesliga stat-card pattern: the rings
                                             repeat the shape of the crest). Black and white alpha only, so it works on any club colour.
  leagues/t0.png                             the 3. Liga logo with its player, ball and flag bar back in black, on a white disc."""
import pathlib
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
WWW = pathlib.Path(__file__).resolve().parents[2] / 'android/app/src/main/assets/www'
S = 960

def shape_mask(kind, k, ox=0, oy=0):
    """Antialiased mask of a shape scaled by k (1 = fills the texture)."""
    n = S * 2
    im = Image.new('L', (n, n), 0)
    d = ImageDraw.Draw(im)
    c = n / 2
    r = n / 2 * k
    if kind == 'circle':
        d.ellipse([c - r, c - r, c + r, c + r], fill=255)
    elif kind == 'diamond':
        d.polygon([(c, c - r * 1.08), (c + r * .86, c), (c, c + r * 1.08), (c - r * .86, c)], fill=255)
    else:
        pts = []
        for t in np.linspace(0, 1, 60):      # right flank, a slow curve into the point
            x = .84 * (1 - t ** 2.6)
            pts.append((x, -.62 + 1.72 * t))
        top = [(-.84 + 1.68 * t, -.74 + .12 * abs(2 * t - 1) ** 2 * 0 - .1 * np.cos(np.pi * (2 * t - 1) / 2)) for t in np.linspace(0, 1, 40)]
        poly = top + pts + [(-x, y) for x, y in reversed(pts)]
        d.polygon([(c + r * x, c + r * y) for x, y in poly], fill=255)
    return np.asarray(im.resize((S, S), Image.LANCZOS), dtype=np.float32) / 255

def blur(a, r):
    return np.asarray(Image.fromarray((a * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(r)), dtype=np.float32) / 255

def shift(a, dx, dy):
    return np.roll(np.roll(a, dy, 0), dx, 1)

def emboss(kind):
    y, x = np.mgrid[0:S, 0:S].astype(np.float32) / S
    lean = (x + y - 1) * .5                     # light from the top left
    I = np.full((S, S), .44, dtype=np.float32) - lean * .10
    for i, k in enumerate(np.arange(1.42, .2, -.135)):
        M = shape_mask(kind, k)
        sh = blur(shift(M, 7, 11), 13)
        I = I * (1 - .42 * sh * (1 - M))
        tone = .455 + .008 * i - lean * (.08 + .025 * i)
        I = I * (1 - M) + tone * M
        edge = np.clip(M - shift(M, 2, 3), 0, 1)
        I = np.clip(I + edge * .05, 0, 1)
    a = np.clip(np.abs(I - .5) * 2.1, 0, .62)
    v = (I > .5) * 255
    out = np.dstack([v, v, v, a * 255]).astype('uint8')
    p = WWW / 'brand' / f'emboss-{kind}.webp'
    Image.fromarray(out, 'RGBA').save(p, 'WEBP', quality=70, alpha_quality=88, method=6)
    print(p.name, p.stat().st_size)

def liga3():
    """The old recolour painted the dark parts white and left only a faint dotted outline. Close that outline, flood the disc
    from outside it, and whatever stays enclosed above the wordmark is the player, the ball or the flag bar."""
    from collections import deque
    p = WWW / 'leagues/t0.png'
    src = Image.open(p).convert('RGBA')
    w, h = src.size
    a = np.asarray(src, dtype=np.float32)
    white = (a[..., 3] > 200) & (a[..., :3].min(2) > 253)
    wall = np.asarray(Image.fromarray((~white * 255).astype('uint8')).filter(ImageFilter.MaxFilter(3))) > 0
    seen = np.zeros_like(wall)
    seeds = [(int(h * .19), int(w * .53)), (int(h * .49), int(w * .74)), (int(h * .63), int(w * .32)), (int(h * .66), int(w * .59))]
    q = deque()
    for s in seeds:
        if wall[s]: raise SystemExit(f'seed on a wall: {s}')
        q.append(s); seen[s] = True
    while q:
        yy, xx = q.popleft()
        for ny, nx in ((yy + 1, xx), (yy - 1, xx), (yy, xx + 1), (yy, xx - 1)):
            if 0 <= ny < h and 0 <= nx < w and not seen[ny, nx] and not wall[ny, nx]:
                seen[ny, nx] = True; q.append((ny, nx))
    print('disc pixels', int(seen.sum()))
    rest = white & ~seen & ~wall
    rest[int(h * .86):] = False                          # the wordmark stays white
    lab = np.zeros(rest.shape, dtype=np.int32); sizes = {}; cur = 0
    for sy, sx in zip(*np.nonzero(rest)):
        if lab[sy, sx]: continue
        cur += 1; n = 0; ys = [sy]; xs = [sx]
        q = deque([(sy, sx)]); lab[sy, sx] = cur
        while q:
            yy, xx = q.popleft(); n += 1; ys.append(yy); xs.append(xx)
            for ny, nx in ((yy + 1, xx), (yy - 1, xx), (yy, xx + 1), (yy, xx - 1)):
                if 0 <= ny < h and 0 <= nx < w and rest[ny, nx] and not lab[ny, nx]:
                    lab[ny, nx] = cur; q.append((ny, nx))
        sizes[cur] = (n, min(ys), max(ys), min(xs), max(xs))
    keep = np.zeros(rest.shape, dtype=np.uint8)
    for k, (n, t, b, l, r) in sorted(sizes.items(), key=lambda v: -v[1][0]):
        print('region', n, t, b, l, r)
        touches_rim = t < 6 or l < 3 or r > w - 3 or (r - l > w * .8 and b - t > h * .6)
        if n >= 60 and not touches_rim: keep[lab == k] = 255
    m = Image.fromarray(keep).filter(ImageFilter.MaxFilter(3)).resize((w * 4, h * 4), Image.BICUBIC).filter(ImageFilter.GaussianBlur(2))
    m = m.point(lambda v: 255 if v > 118 else 0).resize((w, h), Image.LANCZOS)
    m = np.asarray(m, dtype=np.float32) / 255
    out = a.copy()
    ink = np.array([14, 16, 18], dtype=np.float32)
    for c in range(3): out[..., c] = out[..., c] * (1 - m) + ink[c] * m
    out[..., 3] = np.maximum(out[..., 3], m * 255)
    Image.fromarray(out.astype('uint8'), 'RGBA').save(p, optimize=True)

if __name__ == '__main__':
    import sys
    if 'logo' in sys.argv: liga3()
    else:
        for k in ('circle', 'shield', 'diamond'): emboss(k)
