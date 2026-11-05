import json, io, urllib.request, urllib.parse
from PIL import Image, ImageDraw, ImageFont
UA = {'User-Agent': 'Mozilla/5.0 lookmiz-preview'}
def get(u): return urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=30).read()
Q = [('Mariage / bague', 'ring box'), ('Fleurs', 'flower bloom'), ('Gateau', 'cake'), ('Cadeau', 'gift box'), ('Enfant', 'cute toy'), ('Noel', 'snow globe christmas'), ('Lanterne', 'lantern'), ('Coeur / amour', 'heart love'), ('Bougie', 'candle'), ('Ballon', 'balloon')]
F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 22); f2 = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 15)
out = Image.new('RGB', (1860, 300 * len(Q)), 'white'); d = ImageDraw.Draw(out); links = []
for r, (lab, q) in enumerate(Q):
    u = 'https://api.sketchfab.com/v3/search?' + urllib.parse.urlencode({'type': 'models', 'q': q, 'downloadable': 'true', 'animated': 'true', 'sort_by': '-likeCount', 'count': 24})
    try: res = json.loads(get(u))['results']
    except Exception as e: print('ERR', q, e); continue
    d.text((10, r * 300 + 6), lab, fill='black', font=F); x = 10; n = 0
    for m in res:
        th = sorted(m['thumbnails']['images'], key=lambda i: abs(i['width'] - 400))[0]['url']
        try: im = Image.open(io.BytesIO(get(th))).convert('RGB')
        except Exception: continue
        lic = m.get('license'); lic = lic.get('label') if isinstance(lic, dict) else lic
        if lic and 'NonCommercial' in str(lic): continue
        im.thumbnail((300, 220)); out.paste(im, (x, r * 300 + 38)); d.text((x, r * 300 + 262), (str(n + 1) + '. ' + m['name'])[:32], fill='black', font=f2)
        lic = m.get('license'); lic = lic.get('label') if isinstance(lic, dict) else lic
        if lic and 'NonCommercial' in str(lic): continue
        links.append(f"{lab} {n+1} | {m['name']} | https://sketchfab.com/3d-models/{m['uid']} | licence={lic}")
        x += 308; n += 1
        if n == 6: break
out.save('sketchfab.png'); open('liens.txt', 'w').write('\n'.join(links))
