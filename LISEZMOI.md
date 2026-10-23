# Permis en Ville

Simulateur d'entraînement à l'examen du permis de conduire, dans les vraies rues de Lyon reconstruites en 3D.

**Site :** https://bapkenbegjanian-cmd.github.io/permis-en-ville/

## Ce qui est réel
- Les rues, carrefours, sens uniques, ponts et quais de la Presqu'île, de la Guillotière et des bords de Saône et du Rhône
- Les feux tricolores, stops, cédez-le-passage, passages piétons, limitations de vitesse
- L'emplacement, la forme et la hauteur (quand elle est connue) des immeubles, les arbres et les lampadaires

Données © contributeurs OpenStreetMap (licence ODbL). Les façades sont des façades types.

## Ce qui est contrôlé comme à l'examen
Vitesse, arrêt au STOP, contrôle visuel gauche/droite, feux, cédez-le-passage, priorité à droite, piétons engagés,
sens interdit, voie de gauche, clignotant avant de tourner, collisions, montée sur le trottoir.

## Commandes
↑ ↓ vitesse · ← → volant · Espace freinage appuyé · A / E clignotants · Q / D regarder à gauche / à droite · P pause · M son

## Pour développer
- `data/lyon.json` est produit par `outils/preparer_donnees.py` à partir de l'extraction OpenStreetMap `data/lyon-presquile.json`
  (téléchargée par l'action GitHub « Données OpenStreetMap »).
- Anciennes versions : `google3d.html` (3D Google) et `streetview.html` (photos Street View).
