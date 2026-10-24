"""Explore l'arbre 3D Tiles du photomaillage de la Métropole autour d'un point (lon, lat) et télécharge la branche la plus détaillée."""
import json, math, os, sys, urllib.request
BASE = 'https://data.grandlyon.com/files/grandlyon/2023/mesh/'
LON, LAT = float(sys.argv[1]), float(sys.argv[2]); OUT = sys.argv[3]; MAXD = int(sys.argv[4]) if len(sys.argv) > 4 else 30
os.makedirs(OUT, exist_ok=True)
def get(rel):
    with urllib.request.urlopen(urllib.request.Request(BASE + rel, headers={'User-Agent': 'permis-en-ville'}), timeout=120) as r: return r.read()
lo, la = math.radians(LON), math.radians(LAT)
def inside(bv):
    r = bv.get('region')
    return r and r[0] <= lo <= r[2] and r[1] <= la <= r[3]
log = open(os.path.join(OUT, 'arbre.txt'), 'w')
def walk(node, base, depth):
    c = node.get('content') or {}; u = c.get('uri') or c.get('url')
    log.write(f"{'  '*depth}err={node.get('geometricError')} uri={u} reg={[round(x,6) for x in node['boundingVolume'].get('region', [])]}\n")
    if u:
        rel = os.path.normpath(os.path.join(base, u)).replace('\\', '/')
        data = get(rel); dst = os.path.join(OUT, rel); os.makedirs(os.path.dirname(dst), exist_ok=True); open(dst, 'wb').write(data)
        log.write(f"{'  '*depth}  -> {len(data)} octets\n"); log.flush()
        if rel.endswith('.json'):
            sub = json.loads(data); walk(sub['root'], os.path.dirname(rel), depth + 1)
    if depth >= MAXD: return
    for k in node.get('children', []):
        if inside(k['boundingVolume']): walk(k, base, depth + 1)
root = json.loads(get('tileset.json')); open(os.path.join(OUT, 'tileset.json'), 'wb').write(json.dumps(root).encode())
walk(root['root'], '', 0)
print('fini')
