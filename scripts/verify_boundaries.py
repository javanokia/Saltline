with open('几猫国产3A大作_V1.html', 'r', encoding='utf-8') as f:
    c = f.read()

boundaries = [
    ("constants_and_utils", 733853, 737678),
    ("geo_utils", 737678, 745117),
    ("render", 745117, 800772),
    ("materials", 800772, 876808),
    ("physics", 876808, 883672),
    ("props", 883672, 1000933),
    ("level", 1000933, 1046199),
    ("backdrop", 1046199, 1099350),
    ("ground", 1099350, 1139816),
    ("fx", 1139816, 1227622),
    ("audio", 1227622, 1249275),
    ("input", 1249275, 1257725),
    ("player", 1257725, 1264467),
    ("combat", 1264467, 1266124),
    ("weapon", 1266124, 1324207),
    ("enemies", 1324207, 1379168),
    ("hud", 1379168, 1402617),
    ("game", 1402617, 1414377),
    ("boot", 1414377, 1422098)
]

for name, s, e in boundaries:
    assert s < e
    chunk = c[s:e]
    print(f"{name:20}: start={s:7}, end={e:7}, len={len(chunk):7}, preview: {chunk[:60]!r}")
