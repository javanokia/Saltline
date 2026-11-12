import os
import re

with open('几猫国产3A大作_V1.html', 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Extract CSS
style_start = c.find('<style>') + len('<style>')
style_end = c.find('</style>')
css_content = c[style_start:style_end].strip()

# 2. Extract HTML template
body_start = c.find('<body>') + len('<body>')
script_start = c.find('<script>')
html_body = c[body_start:script_start].strip()

os.makedirs('src', exist_ok=True)
os.makedirs('src/config', exist_ok=True)
os.makedirs('src/utils', exist_ok=True)
os.makedirs('src/render', exist_ok=True)
os.makedirs('src/materials', exist_ok=True)
os.makedirs('src/physics', exist_ok=True)
os.makedirs('src/props', exist_ok=True)
os.makedirs('src/level', exist_ok=True)
os.makedirs('src/backdrop', exist_ok=True)
os.makedirs('src/ground', exist_ok=True)
os.makedirs('src/fx', exist_ok=True)
os.makedirs('src/audio', exist_ok=True)
os.makedirs('src/input', exist_ok=True)
os.makedirs('src/player', exist_ok=True)
os.makedirs('src/weapon', exist_ok=True)
os.makedirs('src/enemies', exist_ok=True)
os.makedirs('src/combat', exist_ok=True)
os.makedirs('src/hud', exist_ok=True)
os.makedirs('src/game', exist_ok=True)

with open('src/ui.css', 'w', encoding='utf-8') as f:
    f.write(css_content + '\n')
print('Saved src/ui.css')

print('HTML Body content:\n', html_body)
