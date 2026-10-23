"""Transforme l'extraction OpenStreetMap brute en un fichier compact pour le simulateur.
Coordonnées en mètres autour d'un point d'origine (x = est, y = nord)."""
import json, math, sys

SRC, DST = sys.argv[1], sys.argv[2]
d = json.load(open(SRC))
els = d['elements']
LAT0, LNG0 = 45.7590, 4.8330
KX, KY = 111320 * math.cos(math.radians(LAT0)), 110540

nodes = {}
for e in els:
    if e['type'] == 'node':
        n = nodes.setdefault(e['id'], {})
        n['x'] = round((e['lon'] - LNG0) * KX, 2)
        n['y'] = round((e['lat'] - LAT0) * KY, 2)
        if e.get('tags'):
            n['tags'] = e['tags']
ways = {e['id']: e for e in els if e['type'] == 'way'}

DRIVE = {'trunk', 'trunk_link', 'primary', 'primary_link', 'secondary', 'secondary_link', 'tertiary', 'tertiary_link',
         'unclassified', 'residential', 'living_street', 'service'}
KEEP_ROAD_TAGS = ['highway', 'name', 'maxspeed', 'oneway', 'lanes', 'junction', 'bridge', 'layer', 'service', 'width', 'access', 'motor_vehicle', 'area', 'busway', 'psv']
used = set()
out = {'origin': [LAT0, LNG0], 'roads': [], 'ped': [], 'buildings': [], 'water': [], 'green': [], 'points': []}

def pts(ids):
    r = [[nodes[i]['x'], nodes[i]['y']] for i in ids if i in nodes and 'x' in nodes[i]]
    return r

for w in ways.values():
    t = w.get('tags') or {}
    h = t.get('highway')
    if h in DRIVE and t.get('tunnel') not in ('yes', 'building_passage') and t.get('area') != 'yes':
        if h == 'service' and t.get('service') in ('parking_aisle', 'driveway', 'drive-through'):
            continue
        if t.get('access') in ('no', 'private') or t.get('motor_vehicle') in ('no', 'private'):
            continue
        ids = [i for i in w['nodes'] if i in nodes]
        if len(ids) < 2: continue
        used.update(ids)
        out['roads'].append({'id': w['id'], 'n': ids, 't': {k: t[k] for k in KEEP_ROAD_TAGS if k in t}})
    elif h in ('pedestrian',) and t.get('tunnel') != 'yes':
        p = pts(w['nodes'])
        if len(p) >= 2:
            out['ped'].append({'p': p, 'area': t.get('area') == 'yes' or (w['nodes'][0] == w['nodes'][-1] and t.get('area') != 'no')})
    elif 'building' in t and t.get('building') not in ('roof', 'no') and t.get('location') != 'underground':
        p = pts(w['nodes'])
        if len(p) < 4: continue
        try: hgt = float(str(t.get('height', '')).replace('m', '').strip())
        except ValueError: hgt = None
        lv = None
        try: lv = float(t.get('building:levels'))
        except (TypeError, ValueError): pass
        out['buildings'].append({'id': w['id'], 'p': p[:-1] if p[0] == p[-1] else p, 'h': hgt, 'lv': lv, 'k': t.get('building'), 'mh': t.get('min_height')})
    elif t.get('leisure') in ('park', 'garden', 'pitch') or t.get('landuse') == 'grass' or t.get('natural') == 'wood':
        p = pts(w['nodes'])
        if len(p) >= 4: out['green'].append(p)
    elif t.get('natural') == 'water' and w['nodes'][0] == w['nodes'][-1]:
        p = pts(w['nodes'])
        if len(p) >= 4: out['water'].append({'outer': [p], 'basin': t.get('water') == 'basin'})

# rivières : relations multipolygones, on recolle les morceaux de contour
def rings(member_ids):
    segs = [list(ways[m]['nodes']) for m in member_ids if m in ways]
    res = []
    while segs:
        ring = segs.pop(0)
        changed = True
        while ring[0] != ring[-1] and changed:
            changed = False
            for i, s in enumerate(segs):
                if s[0] == ring[-1]: ring += s[1:]
                elif s[-1] == ring[-1]: ring += s[::-1][1:]
                elif s[-1] == ring[0]: ring = s[:-1] + ring
                elif s[0] == ring[0]: ring = s[::-1][:-1] + ring
                else: continue
                segs.pop(i); changed = True; break
        if len(ring) > 3: res.append(pts(ring))
    return res
for r in els:
    if r['type'] == 'relation' and (r.get('tags') or {}).get('natural') == 'water':
        outer = rings([m['ref'] for m in r['members'] if m['type'] == 'way' and m.get('role') in ('outer', '')])
        inner = rings([m['ref'] for m in r['members'] if m['type'] == 'way' and m.get('role') == 'inner'])
        out['water'].append({'outer': outer, 'inner': inner, 'name': r['tags'].get('name')})

for i, n in nodes.items():
    t = n.get('tags') or {}
    k = t.get('highway') or t.get('natural')
    if k in ('stop', 'give_way', 'traffic_signals', 'crossing', 'mini_roundabout', 'street_lamp', 'tree'):
        out['points'].append({'id': i, 'k': k, 'x': n['x'], 'y': n['y'], **({'dir': t['direction']} if 'direction' in t else {}),
                              **({'cr': t.get('crossing')} if k == 'crossing' else {})})

# nœuds des routes (avec étiquettes utiles)
out['nodes'] = {str(i): [nodes[i]['x'], nodes[i]['y']] + ([{k: v for k, v in nodes[i]['tags'].items() if k in ('highway', 'direction', 'crossing')}] if nodes[i].get('tags') else []) for i in used}
json.dump(out, open(DST, 'w'), separators=(',', ':'))
print('routes', len(out['roads']), 'pietons', len(out['ped']), 'immeubles', len(out['buildings']), 'eau', len(out['water']), 'vert', len(out['green']), 'points', len(out['points']), 'noeuds', len(out['nodes']))
