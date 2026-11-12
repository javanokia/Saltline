import re

with open('几猫国产3A大作_V1.html', 'r', encoding='utf-8') as f:
    c = f.read()

match = re.search(r'br\(lt,\{([^}]+)\}\)', c)
pairs = match.group(1).split(',')
mapping = {}
for p in pairs:
    if ':' in p:
        k, v = p.split(':', 1)
        v_name = v.replace('()=>', '').strip()
        mapping[v_name] = k.strip()

print(f"Extracted {len(mapping)} Three.js classes/constants.")
with open('three_symbols_map.json', 'w', encoding='utf-8') as out:
    import json
    json.dump(mapping, out, indent=2)
print("Saved to three_symbols_map.json")
