#!/usr/bin/env python3
"""Make a labelled corpus of synthetic yarn-label photos for tuning the
label reader (parseYarnLabel / readYarnLabel in app.js).

Each label is built from a bank of common real-world ball-band phrasings
(fiber lines in several languages, length/weight formats, CYC symbols, colour
and dye-lot styles, care-text noise), then degraded like a phone photo
(fonts, tilt, blur, speckle, shadow, dark or low-contrast labels, small
photos, JPEG). The answers go in truth.json.

The 'test' set mixes in phrasings the 'train' set never uses, so a score on
it shows how the rules cope with wording they weren't tuned on.

    python3 generate.py OUT_DIR [--train 40] [--test 24] [--seed 7]
Needs Pillow and DejaVu/Liberation fonts. Brands are real yarn brands (from
the app's presets) plus made-up "stash" brands; no label text is copied.
"""
import json, os, random, sys, argparse
from PIL import Image, ImageDraw, ImageFont, ImageFilter

YD_PER_M = 1.0936133
FONT_DIRS = ['/usr/share/fonts/truetype/dejavu', '/usr/share/fonts/truetype/liberation']
FONTS = [('DejaVuSans', 'DejaVuSans-Bold'), ('DejaVuSerif', 'DejaVuSerif-Bold'), ('LiberationSans-Regular', 'LiberationSans-Bold'),
         ('LiberationSerif-Regular', 'LiberationSerif-Bold'), ('DejaVuSansMono', 'DejaVuSansMono-Bold')]

PRESET = [('Cascade Yarns', '220'), ('Cascade Yarns', 'Heritage'), ('Malabrigo', 'Rios'), ('Drops', 'Nepal'), ('Lion Brand', 'Wool-Ease'),
          ('Lion Brand', 'Wool-Ease Thick & Quick'), ('Knit Picks', 'Wool of the Andes Worsted'), ('Berroco', 'Vintage'), ('Red Heart', 'Super Saver')]
STASH = [('Fernhollow Yarn Co.', 'Sock Base'), ('Moss & Marrow', 'Tweed DK'), ('Little Wren Fibres', 'Cloud Lace')]
UNKNOWN = [('Yarnworks', 'Cotton Classic'), ('Northfold', 'Shetland 4ply')]

# fiber → (English phrasings, translations)
FIBERS = {
  'Wool': (['Wool', 'Peruvian Highland Wool'], ['Laine', 'Wolle', 'Lana', 'Wol']),
  'Merino': (['Superwash Merino Wool', 'Merino Wool', 'Extrafine Merino'], ['Laine Mérinos', 'Merinowolle', 'Lana Merino']),
  'Alpaca': (['Alpaca', 'Baby Alpaca'], ['Alpaga', 'Alpaka']),
  'Cotton': (['Cotton', 'Mercerized Cotton'], ['Coton', 'Baumwolle', 'Algodón', 'Cotone']),
  'Acrylic': (['Acrylic'], ['Acrylique', 'Polyacryl', 'Acrílico']),
  'Nylon': (['Nylon', 'Polyamide'], ['Polyamid', 'Poliamida', 'Poliammide']),
  'Silk': (['Silk', 'Mulberry Silk'], ['Soie', 'Seide', 'Seda']),
  'Linen': (['Linen'], ['Lin', 'Leinen', 'Lino']),
  'Mohair': (['Kid Mohair', 'Mohair'], ['Mohair']),
}
WEIGHTS = {  # category → phrasings (train), held-out phrasings (test only)
  'Lace': (['(0) LACE', 'Lace weight'], ['Category 0 - Lace']),
  'Fingering': (['(1) SUPER FINE', 'Fingering weight', '4 ply', 'Sock weight'], ['Category 1 - Super Fine']),
  'Sport': (['(2) FINE', 'Sport weight'], ['5 ply']),
  'DK': (['(3) LIGHT', 'DK', '8 ply', 'Double Knitting'], ['Category 3 - Light', 'Light Worsted']),
  'Worsted': (['(4) MEDIUM', 'Worsted weight', 'Aran'], ['10 ply', 'Afghan']),
  'Bulky': (['(5) BULKY', 'Chunky'], ['12 ply']),
  'Super Bulky': (['(6) SUPER BULKY', 'Super Chunky'], ['Jumbo']),
}
COLOURS = (['Colour {n}', 'Color: {n} {w}', 'Shade {n} {w}', 'Col. {n}', 'Farbe Nr. {n}', 'Colorway: {W}', 'Coloris : {W}', 'Color # {n} {w}'],
           ['Shade No. {n}', 'Kleur {n}', 'Colour No: {n} {w}', 'Tono {n}'])
LOTS = (['Lot {l}', 'Dye lot: {l}', 'Partie {l}', 'Bain n° {l}', 'Batch {l}', 'Lot No. {l}'], ['Dye Lot No: {l}', 'Lote {l}', 'Charge {l}'])
COLOUR_WORDS = ['Rose', 'Natural', 'Sage', 'Mochi', 'Ink', 'Rust', 'Bleu Nuit', 'Moss Garden', 'Warm Brown', 'Oat']
NOISE = ['Machine wash 30°C', 'Do not tumble dry', 'Hand wash only', 'Colours may vary from dye lot to dye lot', 'Made in Peru',
         'Please buy enough yarn from the same dye lot', 'Needle 4.5 mm  Gauge 20 sts = 10 cm', 'Recommended hook 5 mm', 'Lay flat to dry',
         'www.example-yarns.com', 'Do not bleach', 'Dry clean only']

def length_lines(rnd, grams, metres, yards, heldout):
    oz = round(grams / 28.35, 1)
    train = [
        (f'{grams} g / {oz} oz   {yards} yds / {metres} m', yards),
        (f'{grams} g = ca {metres} m', round(metres * YD_PER_M)),
        (f'Approx. {grams}g ({oz}oz), {yards}yds ({metres}m)', yards),
        (f'Lauflänge / Length: {metres} m / {grams} g', round(metres * YD_PER_M)),
        (f'Net wt. {grams} g   Length {metres} m', round(metres * YD_PER_M)),
        (f'1 ball = {grams} g ≈ {metres} m', round(metres * YD_PER_M)),
        (f'Weight: {grams} g   Yardage: {yards} yds', yards),
    ]
    test = [
        (f'Nettogewicht {grams} g / Lauflänge {metres} m', round(metres * YD_PER_M)),
        (f'Peso {grams} gr - Largo {metres} mts', round(metres * YD_PER_M)),
        (f'{yards} yards ({metres} metres) per {grams} gram skein', yards),
    ]
    pool = train + (test if heldout else [])
    return rnd.choice(pool)

def blend(rnd):
    names = rnd.sample(list(FIBERS), rnd.choice([1, 1, 2, 2, 3]))
    if len(names) == 1: pcts = [100]
    elif len(names) == 2:
        a = rnd.choice([50, 55, 60, 65, 70, 75, 80, 85]); pcts = [a, 100 - a]
    else:
        a = rnd.choice([40, 50, 52, 60]); b = rnd.choice([20, 25, 30, 40]); b = min(b, 100 - a - 5); pcts = [a, b, 100 - a - b]
    return list(zip(names, pcts))

def fiber_lines(rnd, bl, heldout):
    eng = [(n, p, rnd.choice(FIBERS[n][0])) for n, p in bl]
    style = rnd.choice(['pct_first', 'pct_first', 'pct_after', 'multi'] + (['composition', 'foreign_only'] if heldout else []))
    lines = []
    if style == 'pct_first': lines.append(rnd.choice([', ', ' / ', '  ']).join(f'{p}% {e}' for n, p, e in eng))
    elif style == 'pct_after': lines.append(', '.join(f'{e} {p}%' for n, p, e in eng))
    elif style == 'multi':
        lines.append('  '.join(f'{p}% {e}' for n, p, e in eng))
        for _ in range(rnd.choice([1, 2])):
            lines.append('  '.join(f'{p}% {rnd.choice(FIBERS[n][1])}' for n, p, e in eng))
    elif style == 'composition': lines.append('Composition: ' + ' '.join(f'{p}% {e}' for n, p, e in eng))
    elif style == 'foreign_only':
        lines.append('  '.join(f'{p}% {rnd.choice(FIBERS[n][1])}' for n, p, e in eng))
        return lines, ', '.join(f'{p}% {n}' for n, p in bl)
    return lines, ', '.join(f'{p}% {e}' for n, p, e in eng)

def make_label(rnd, heldout):
    kind = rnd.random()
    brand, line = rnd.choice(PRESET if kind < 0.65 else STASH if kind < 0.85 else UNKNOWN)
    known = (brand, line) in PRESET or (brand, line) in STASH
    bl = blend(rnd)
    flines, fiber_truth = fiber_lines(rnd, bl, heldout)
    grams = rnd.choice([25, 50, 50, 100, 100, 100, 150, 200])
    metres = rnd.choice([75, 110, 125, 160, 192, 200, 250, 366, 400, 800]) * grams // 100 or 75
    yards = round(metres * YD_PER_M)
    ltxt, ltruth = length_lines(rnd, grams, metres, yards, heldout)
    cat = rnd.choice(list(WEIGHTS) + [None, None])
    wtxt = rnd.choice(WEIGHTS[cat][0] + (WEIGHTS[cat][1] if heldout else [])) if cat else None
    n = str(rnd.choice([rnd.randint(1, 99), rnd.randint(100, 9999)])).zfill(rnd.choice([1, 3, 4]))
    w = rnd.choice(COLOUR_WORDS)
    ctpl = rnd.choice(COLOURS[0] + (COLOURS[1] if heldout else []))
    ctxt = ctpl.format(n=n, w=w, W=w)
    ctruth = ctxt.split(':', 1)[1].strip() if ':' in ctpl else (f'{n} {w}' if '{w}' in ctpl else n)
    lot = rnd.choice([str(rnd.randint(100, 999999)), f'{rnd.choice("ABCK")}{rnd.randint(10, 999)}', f'{rnd.randint(1, 99)}{rnd.choice("ABC")}{rnd.randint(1, 9)}'])
    lotxt = rnd.choice(LOTS[0] + (LOTS[1] if heldout else [])).format(l=lot)
    body = flines + [ltxt] + ([wtxt] if wtxt else []) + [ctxt, lotxt] + rnd.sample(NOISE, rnd.choice([0, 1, 2, 3]))
    rnd.shuffle(body)
    # a weight word inside the yarn's own name counts as stating the weight
    line_w = next((c for c, ws in [('Worsted', ['worsted']), ('DK', ['dk']), ('Fingering', ['4ply'])] if any(x in line.lower().split() for x in ws)), None)
    truth = {'brand': brand if known else None, 'line': line if known else None, 'fiber': fiber_truth,
             'weightCategory': cat or line_w, 'skeinYardage': ltruth, 'skeinWeightGrams': grams, 'colorway': ctruth, 'dyeLot': lot}
    return [(brand, 'brand'), (line, 'line')] + [(t, 'body') for t in body], truth

def font(name, size):
    for d in FONT_DIRS:
        p = os.path.join(d, name + '.ttf')
        if os.path.exists(p): return ImageFont.truetype(p, size)
    return ImageFont.load_default()

def render(rnd, lines, path):
    reg, bold = rnd.choice(FONTS)
    base = rnd.randint(22, 32)
    W = rnd.choice([900, 1000, 1100]); two_col = rnd.random() < 0.25
    H = 70 + int(base * 1.55) * (len(lines) + 2) // (2 if two_col else 1) + 60
    dark = rnd.random() < 0.18
    bg = (rnd.randint(25, 60),) * 3 if dark else tuple(rnd.randint(225, 252) for _ in range(3))
    fg = (235, 230, 220) if dark else tuple(rnd.randint(15, 60) for _ in range(3))
    im = Image.new('RGB', (W, H), bg); d = ImageDraw.Draw(im)
    y = 30; col_x = 40; body_i = 0
    body = [l for l in lines if l[1] == 'body']; n_left = (len(body) + 1) // 2
    for text, role in lines:
        sz = int(base * (1.9 if role == 'brand' else 1.4 if role == 'line' else 1))
        fname = bold if role != 'body' or rnd.random() < 0.15 else reg
        f = font(fname, sz)
        # Long lines are set smaller so they fit on the label (truth must be visible).
        avail = (W // 2 - 50) if (two_col and role == 'body') else W - 70
        while sz > 12 and d.textlength(text, font=f) > avail:
            sz -= 1; f = font(fname, sz)
        if role == 'body' and two_col and body_i == n_left: col_x, y = W // 2 + 10, y_body_start
        if role == 'body' and body_i == 0: y_body_start = y
        d.text((col_x, y), text, font=f, fill=fg)
        y += int(sz * 1.45)
        if role == 'body': body_i += 1
    if rnd.random() < 0.2:  # small, low-contrast photo
        im = im.resize((W * 2 // 5, H * 2 // 5)); im = Image.blend(im, Image.new('RGB', im.size, (165, 160, 150)), 0.35)
    if rnd.random() < 0.3:  # shadow across the label
        px = im.load(); side = rnd.random() < 0.5
        for x in range(im.size[0]):
            f = 0.5 + 0.5 * (x / im.size[0] if side else 1 - x / im.size[0])
            for yy in range(im.size[1]):
                r, g, b = px[x, yy]; px[x, yy] = (int(r * f), int(g * f), int(b * f))
    angle = rnd.uniform(-4, 4) if rnd.random() < 0.5 else 0
    if angle: im = im.rotate(angle, expand=True, fillcolor=bg)
    blur = rnd.choice([0, 0, 0.6, 1.0, 1.3])
    if blur: im = im.filter(ImageFilter.GaussianBlur(blur))
    if rnd.random() < 0.3:
        px = im.load()
        for _ in range(rnd.randint(2000, 8000)):
            x = rnd.randrange(im.size[0]); yy = rnd.randrange(im.size[1]); v = rnd.randrange(256); px[x, yy] = (v, v, v)
    im.save(path, quality=rnd.randint(55, 85))

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('out'); ap.add_argument('--train', type=int, default=40); ap.add_argument('--test', type=int, default=24); ap.add_argument('--seed', type=int, default=7)
    a = ap.parse_args()
    for split, count, heldout, seed in [('train', a.train, False, a.seed), ('test', a.test, True, a.seed + 1000)]:
        rnd = random.Random(seed); out = os.path.join(a.out, split); os.makedirs(out, exist_ok=True); truth = {}
        for i in range(count):
            lines, t = make_label(rnd, heldout)
            name = f'{split}{i:03d}'; render(rnd, lines, os.path.join(out, name + '.jpg')); truth[name] = t
        json.dump({'stash': [{'brand': b, 'line': l} for b, l in STASH], 'presets': [{'brand': b, 'line': l} for b, l in PRESET], 'labels': truth},
                  open(os.path.join(out, 'truth.json'), 'w'), indent=1, ensure_ascii=False)
        print(split, count)

if __name__ == '__main__': main()
