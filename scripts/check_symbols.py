import re

with open('几猫国产3A大作_V1.html', 'r', encoding='utf-8') as f:
    c = f.read()

boundaries = [
    ("constants_and_utils", 733853, 737403),
    ("geo_utils", 737403, 745117),
    ("render", 745117, 800772),
    ("materials", 800772, 876707),
    ("physics", 876707, 883672),
    ("props", 883672, 1000933),
    ("level", 1000933, 1046199),
    ("backdrop", 1046199, 1099350),
    ("ground", 1099350, 1139816),
    ("fx", 1139816, 1227622),
    ("audio", 1227622, 1248806),
    ("input", 1248806, 1257175),
    ("player", 1257175, 1264467),
    ("combat", 1264467, 1266124),
    ("weapon", 1266124, 1324207),
    ("enemies", 1324207, 1378956),
    ("hud", 1378956, 1402037),
    ("game", 1402037, 1414377),
    ("boot", 1414377, 1422098)
]

# Common symbols defined in constants_and_utils:
# oi, Mn, en, Pi, vf, zc, Pr, zy, Dy, il, Zn, bi, Fo, sl, kn, Wt, dr
# Common symbols in geo_utils:
# sa, Ly, oa, $e, Wi, ot, Fn, ky, Fy, Uy, Ny, Fg, Dc, Lc, Ii, By, Qi

# Let's check which of these symbols appear in each section!
check_syms = [
    'oi', 'Mn', 'en', 'Pi', 'vf', 'zc', 'Pr', 'zy', 'Dy', 'il',
    'Zn', 'bi', 'Fo', 'sl', 'kn', 'Wt', 'dr',
    'sa', '$e', 'Wi', 'ot', 'Fn', 'Dc', 'Lc', 'Ii', 'By', 'Qi',
    'f3', 'li'
]

print("=== SYMBOL USAGE ACROSS MODULES ===")
for name, s, e in boundaries:
    chunk = c[s:e]
    used = []
    for sym in check_syms:
        # Match as whole identifier
        if re.search(r'\b' + re.escape(sym) + r'\b', chunk):
            used.append(sym)
    print(f"{name:20}: {', '.join(used)}")
