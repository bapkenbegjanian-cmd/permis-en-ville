"""Télécharge des photos libres (Wikimedia Commons) servant de modèle visuel : rues de Lyon, intérieurs de voitures.
Écrit references/<thème>/NN.jpg et references/CREDITS.md (auteur, licence, lien)."""
import json, os, re, sys, time, urllib.parse, urllib.request

THEMES = {
    'bellecour': ['Place Bellecour Lyon', 'Place Bellecour statue Louis XIV'],
    'republique': ['Rue de la République Lyon', 'Rue de la République Lyon immeubles'],
    'victor-hugo': ['Rue Victor-Hugo Lyon'],
    'barre': ['Rue de la Barre Lyon', 'Pont de la Guillotière Lyon'],
    'quais-rhone': ['Quai Jules-Courmont Lyon', 'Quai du Rhône Lyon Presqu\'île façades'],
    'quais-saone': ['Quai Saint-Antoine Lyon', 'Quai de la Pêcherie Lyon', 'Quai Saint-Vincent Lyon'],
    'terreaux': ['Place des Terreaux Lyon', 'Rue d\'Algérie Lyon'],
    'herriot': ['Rue Édouard-Herriot Lyon', 'Rue du Président-Édouard-Herriot Lyon'],
    'cordeliers': ['Place des Cordeliers Lyon', 'Rue Grenette Lyon'],
    'perrache': ['Cours de Verdun Lyon', 'Place Carnot Lyon'],
    'jacobins': ['Place des Jacobins Lyon'],
    'toits': ['Toits de Lyon Presqu\'île', 'Lyon roofs Presqu\'île'],
    'guillotiere': ['Cours Gambetta Lyon', 'Place Gabriel-Péri Lyon'],
    'vieux-lyon': ['Quai Romain-Rolland Lyon', 'Vieux Lyon rue Saint-Jean'],
    'interieur-clio': ['Renault Clio V interior', 'Renault Clio interior dashboard'],
    'interieur-208': ['Peugeot 208 II interior', 'Peugeot 208 interior'],
    'interieur-autre': ['Citroën C3 interior', 'Volkswagen Polo VI interior', 'car dashboard driver view'],
    'auto-ecole': ['voiture auto-école France', 'driving school car France'],
}
API = 'https://commons.wikimedia.org/w/api.php'
UA = {'User-Agent': 'permis-en-ville/1.0 (https://github.com/bapkenbegjanian-cmd/permis-en-ville)'}
def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r: return r.read()
out = sys.argv[1] if len(sys.argv) > 1 else 'references'
os.makedirs(out, exist_ok=True)
credits = ['# Photos de référence (Wikimedia Commons)\n', 'Utilisées comme modèle visuel. Chaque photo garde sa licence d\'origine.\n']
for theme, queries in THEMES.items():
    d = os.path.join(out, theme); os.makedirs(d, exist_ok=True); n = 0; seen = set()
    credits.append(f'\n## {theme}\n')
    for q in queries:
        params = {'action': 'query', 'format': 'json', 'generator': 'search', 'gsrsearch': q + ' filetype:bitmap', 'gsrnamespace': 6, 'gsrlimit': 12,
                  'prop': 'imageinfo', 'iiprop': 'url|extmetadata|size', 'iiurlwidth': 1024}
        try: data = json.loads(get(API + '?' + urllib.parse.urlencode(params)))
        except Exception as e: credits.append(f'- erreur recherche « {q} » : {e}\n'); continue
        pages = sorted((data.get('query') or {}).get('pages', {}).values(), key=lambda p: p.get('index', 99))
        for p in pages:
            if n >= 8 or p['title'] in seen: continue
            ii = (p.get('imageinfo') or [{}])[0]; url = ii.get('thumburl') or ii.get('url')
            if not url or not re.search(r'\.(jpe?g|png)$', url, re.I): continue
            seen.add(p['title'])
            try: img = get(url)
            except Exception: continue
            n += 1; path = os.path.join(d, f'{n:02d}.jpg')
            open(path, 'wb').write(img)
            md = ii.get('extmetadata', {})
            strip = lambda s: re.sub('<[^>]+>', '', (md.get(s) or {}).get('value', '')).strip()
            credits.append(f'- {theme}/{n:02d}.jpg — {p["title"]} — {strip("Artist")[:80]} — {strip("LicenseShortName")} — {ii.get("descriptionurl", "")}\n')
            time.sleep(.5)
open(os.path.join(out, 'CREDITS.md'), 'w').write(''.join(credits))
print('ok')
