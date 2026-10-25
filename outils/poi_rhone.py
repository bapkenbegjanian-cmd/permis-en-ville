"""Commerces et services nommés (OpenStreetMap) par tuile de 1 km : nom, catégorie, position.
Sortie : data/rhone-poi/<tx>_<ty>.json et data/rhone-poi/index.json."""
import json, math, os, sys, collections
import osmium

SRC, OUT = sys.argv[1], sys.argv[2]
LAT0, LNG0 = 45.7590, 4.8330
KX, KY = 111320 * math.cos(math.radians(LAT0)), 110540
T = 1000
AMEN = {'restaurant', 'cafe', 'bar', 'fast_food', 'bank', 'pharmacy', 'post_office', 'pub', 'ice_cream', 'bureau_de_change', 'cinema', 'theatre', 'police', 'townhall', 'library', 'doctors', 'dentist', 'car_rental', 'fuel'}
tiles = collections.defaultdict(list)

def add(name, kind, lon, lat, brand=None):
    x, y = (lon - LNG0) * KX, (lat - LAT0) * KY
    tiles[(math.floor(x / T), math.floor(y / T))].append({'n': name[:40], 'k': kind, 'x': round(x, 1), 'y': round(y, 1), **({'b': brand} if brand else {})})

class H(osmium.SimpleHandler):
    def node(self, n):
        t = n.tags; name = t.get('name'); shop = t.get('shop'); am = t.get('amenity')
        if not name or not n.location.valid(): return
        if shop: add(name, 'shop:' + shop, n.location.lon, n.location.lat, t.get('brand'))
        elif am in AMEN: add(name, am, n.location.lon, n.location.lat, t.get('brand'))
    def area(self, a):
        t = a.tags; name = t.get('name'); shop = t.get('shop'); am = t.get('amenity')
        if not name or not (shop or am in AMEN): return
        try:
            ring = next(iter(a.outer_rings())); pts = [(p.lon, p.lat) for p in ring]
        except Exception: return
        lon = sum(p[0] for p in pts) / len(pts); lat = sum(p[1] for p in pts) / len(pts)
        add(name, 'shop:' + shop if shop else am, lon, lat, t.get('brand'))

H().apply_file(SRC, locations=True, idx='flex_mem')
os.makedirs(OUT, exist_ok=True)
keys = []
for (tx, ty), l in tiles.items():
    with open(os.path.join(OUT, f'{tx}_{ty}.json'), 'w') as f: json.dump(l, f, separators=(',', ':'), ensure_ascii=False)
    keys.append(f'{tx}_{ty}')
json.dump(keys, open(os.path.join(OUT, 'index.json'), 'w'))
print('tuiles', len(keys), 'commerces', sum(len(l) for l in tiles.values()))
