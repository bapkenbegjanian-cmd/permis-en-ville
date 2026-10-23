"""Découpe un extrait OpenStreetMap (.osm.pbf) en tuiles de 1 km pour le simulateur.

Chaque tuile a le même format que data/lyon.json (routes, nœuds, immeubles, eau, verdure, points),
avec les mêmes coordonnées en mètres autour de Bellecour (x = est, y = nord).
Les routes sont coupées au bord des tuiles (un nœud est créé à la coupure) pour qu'aucune
tuile ne dépende d'une autre ; les surfaces (eau, parcs, champs) sont découpées au carré.

Usage : python3 tuiles_rhone.py extrait.osm.pbf dossier_sortie
"""
import json, math, os, sys, collections
import osmium
from shapely.geometry import Polygon, box
from shapely.validation import make_valid

SRC, OUT = sys.argv[1], sys.argv[2]
LAT0, LNG0 = 45.7590, 4.8330
KX, KY = 111320 * math.cos(math.radians(LAT0)), 110540
T = 1000  # taille d'une tuile en mètres

DRIVE = {'motorway', 'motorway_link', 'trunk', 'trunk_link', 'primary', 'primary_link', 'secondary', 'secondary_link',
         'tertiary', 'tertiary_link', 'unclassified', 'residential', 'living_street', 'service'}
KEEP_ROAD_TAGS = ['highway', 'name', 'ref', 'maxspeed', 'oneway', 'lanes', 'junction', 'bridge', 'layer', 'service', 'width',
                  'access', 'motor_vehicle', 'area', 'busway', 'psv']
NODE_TAGS = ('highway', 'direction', 'crossing')
POINT_KINDS = ('stop', 'give_way', 'traffic_signals', 'crossing', 'mini_roundabout', 'street_lamp', 'tree')
GREEN = {('leisure', 'park'), ('leisure', 'garden'), ('leisure', 'pitch'), ('landuse', 'grass'), ('natural', 'wood'),
         ('landuse', 'forest'), ('landuse', 'meadow'), ('landuse', 'farmland'), ('landuse', 'vineyard'), ('landuse', 'orchard'),
         ('landuse', 'recreation_ground'), ('landuse', 'village_green'), ('natural', 'grassland'), ('natural', 'scrub')}


def xy(lon, lat):
    return (round((lon - LNG0) * KX, 1), round((lat - LAT0) * KY, 1))


def tkey(x, y):
    return (math.floor(x / T), math.floor(y / T))


tiles = collections.defaultdict(lambda: {'roads': [], 'ped': [], 'buildings': [], 'water': [], 'green': [], 'points': [], 'nodes': {}})
node_tags = {}
places = []
synthetic = [0]


def add_area(kind, outer, inners, extra):
    """Découpe un polygone au carré de chaque tuile qu'il recouvre."""
    try:
        poly = Polygon(outer, inners)
        if not poly.is_valid:
            poly = make_valid(poly)
    except Exception:
        return
    if poly.is_empty or poly.area < 4:
        return
    x0, y0, x1, y1 = poly.bounds
    for tx in range(math.floor(x0 / T), math.floor(x1 / T) + 1):
        for ty in range(math.floor(y0 / T), math.floor(y1 / T) + 1):
            cell = box(tx * T - .5, ty * T - .5, (tx + 1) * T + .5, (ty + 1) * T + .5)
            try:
                part = poly.intersection(cell)
            except Exception:
                continue
            if part.is_empty:
                continue
            geoms = getattr(part, 'geoms', [part])
            for g in geoms:
                if g.geom_type != 'Polygon' or g.area < 4:
                    continue
                g = g.simplify(.3)
                if g.is_empty or g.geom_type != 'Polygon':
                    continue
                ring = [[round(a, 1), round(b, 1)] for a, b in g.exterior.coords]
                holes = [[[round(a, 1), round(b, 1)] for a, b in r.coords] for r in g.interiors]
                if kind == 'green':
                    tiles[(tx, ty)]['green'].append(ring)
                else:
                    tiles[(tx, ty)]['water'].append({'outer': [ring], 'inner': holes, **extra})


def add_road(wid, refs, coords, tags):
    """Coupe la route aux bords des tuiles ; chaque morceau garde les étiquettes de la route."""
    seq = []  # (ref, x, y)
    for i, (r, (x, y)) in enumerate(zip(refs, coords)):
        if seq:
            px, py = seq[-1][1], seq[-1][2]
            cuts = []
            for a0, a1, k in ((px, x, 0), (py, y, 1)):
                if a0 == a1:
                    continue
                lo, hi = sorted((a0, a1))
                m = math.floor(lo / T) + 1
                while m * T < hi:
                    cuts.append((m * T - a0) / (a1 - a0))
                    m += 1
            for t in sorted(cuts):
                if 1e-6 < t < 1 - 1e-6:
                    synthetic[0] -= 1
                    seq.append((synthetic[0], round(px + (x - px) * t, 1), round(py + (y - py) * t, 1)))
        seq.append((r, x, y))
    piece, cur, k = [], None, 0
    def flush():
        nonlocal k
        if len(piece) >= 2 and cur is not None:
            tl = tiles[cur]
            tl['roads'].append({'id': wid * 100 + k, 'n': [p[0] for p in piece], 't': tags})
            for r, x, y in piece:
                tl['nodes'][str(r)] = [x, y] + ([node_tags[r]] if r in node_tags else [])
            k += 1
    for i in range(len(seq) - 1):
        a, b = seq[i], seq[i + 1]
        key = tkey((a[1] + b[1]) / 2, (a[2] + b[2]) / 2)
        if key != cur:
            flush()
            piece, cur = [a], key
        piece.append(b)
    flush()


class Nodes(osmium.SimpleHandler):
    """Premier passage : étiquettes des nœuds (stops, feux, passages piétons…) et noms des communes."""
    def node(self, n):
        t = n.tags
        h = t.get('highway')
        k = h if h in POINT_KINDS else ('tree' if t.get('natural') == 'tree' else None)
        if h or t.get('crossing'):
            kept = {a: t.get(a) for a in NODE_TAGS if t.get(a)}
            if kept:
                node_tags[n.id] = kept
        if k and n.location.valid():
            x, y = xy(n.location.lon, n.location.lat)
            p = {'id': n.id, 'k': k, 'x': x, 'y': y}
            if t.get('direction'): p['dir'] = t.get('direction')
            if k == 'crossing' and t.get('crossing'): p['cr'] = t.get('crossing')
            tiles[tkey(x, y)]['points'].append(p)
        pl = t.get('place')
        if pl in ('city', 'town', 'village', 'suburb') and t.get('name') and n.location.valid():
            x, y = xy(n.location.lon, n.location.lat)
            try: pop = int(str(t.get('population', '0')).replace(' ', ''))
            except ValueError: pop = 0
            places.append({'name': t.get('name'), 'kind': pl, 'pop': pop, 'x': x, 'y': y})


class Ways(osmium.SimpleHandler):
    """Second passage : routes (lignes) et surfaces (immeubles, eau, verdure)."""
    def way(self, w):
        t = w.tags
        h = t.get('highway')
        if not h:
            return
        try:
            coords = [xy(n.location.lon, n.location.lat) for n in w.nodes]
        except osmium.InvalidLocationError:
            return
        refs = [n.ref for n in w.nodes]
        if h in DRIVE and t.get('tunnel') not in ('yes', 'building_passage') and t.get('area') != 'yes':
            if h == 'service' and t.get('service') in ('parking_aisle', 'driveway', 'drive-through'):
                return
            if t.get('access') in ('no', 'private') or t.get('motor_vehicle') in ('no', 'private'):
                return
            if len(refs) < 2:
                return
            add_road(w.id, refs, coords, {k: t.get(k) for k in KEEP_ROAD_TAGS if t.get(k)})
        elif h == 'pedestrian' and t.get('tunnel') != 'yes' and len(coords) >= 2:
            cx = sum(c[0] for c in coords) / len(coords); cy = sum(c[1] for c in coords) / len(coords)
            area = t.get('area') == 'yes' or (refs[0] == refs[-1] and t.get('area') != 'no')
            tiles[tkey(cx, cy)]['ped'].append({'p': [list(c) for c in coords], 'area': area})

    def area(self, a):
        t = a.tags
        b = t.get('building')
        water = t.get('natural') == 'water' or t.get('waterway') == 'riverbank'
        green = any((k, t.get(k)) in GREEN for k in ('leisure', 'landuse', 'natural'))
        if not (b or water or green):
            return
        try:
            for outer in a.outer_rings():
                ring = [xy(n.lon, n.lat) for n in outer]
                if b:
                    if b in ('roof', 'no') or t.get('location') == 'underground' or len(ring) < 4:
                        continue
                    try: hgt = float(str(t.get('height', '')).replace('m', '').strip())
                    except ValueError: hgt = None
                    try: lv = float(t.get('building:levels'))
                    except (TypeError, ValueError): lv = None
                    p = [list(c) for c in ring[:-1]]
                    cx = sum(c[0] for c in p) / len(p); cy = sum(c[1] for c in p) / len(p)
                    tiles[tkey(cx, cy)]['buildings'].append({'id': a.orig_id(), 'p': p, 'h': hgt, 'lv': lv, 'k': b, 'mh': t.get('min_height')})
                    break
                inners = [[xy(n.lon, n.lat) for n in r] for r in a.inner_rings(outer)]
                if water:
                    add_area('water', ring, inners, {'basin': t.get('water') == 'basin'} if not a.is_multipolygon() else {'name': t.get('name')})
                else:
                    add_area('green', ring, inners, {})
        except osmium.InvalidLocationError:
            return


Nodes().apply_file(SRC)
Ways().apply_file(SRC, locations=True, idx='flex_mem')

os.makedirs(OUT, exist_ok=True)
index, total = [], 0
for (tx, ty), d in tiles.items():
    if not (d['roads'] or d['buildings']):
        continue
    d['origin'] = [LAT0, LNG0]
    d['tile'] = [tx, ty, T]
    path = os.path.join(OUT, f'{tx}_{ty}.json')
    with open(path, 'w') as f:
        json.dump(d, f, separators=(',', ':'))
    size = os.path.getsize(path); total += size
    index.append([tx, ty, size, len(d['roads']), len(d['buildings'])])
places.sort(key=lambda p: -p['pop'])
with open(os.path.join(OUT, 'index.json'), 'w') as f:
    json.dump({'origin': [LAT0, LNG0], 'tile': T, 'tiles': index, 'places': places}, f, separators=(',', ':'), ensure_ascii=False)
print('tuiles', len(index), 'taille totale', round(total / 1e6, 1), 'Mo', 'communes', len(places),
      'routes', sum(i[3] for i in index), 'immeubles', sum(i[4] for i in index))
