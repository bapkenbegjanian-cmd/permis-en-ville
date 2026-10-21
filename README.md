# Permis en Ville

Simulateur de conduite pour auto-école dans la vraie ville en 3D (Google Photorealistic 3D Tiles) avec les vraies règles de circulation (OpenStreetMap) et une circulation automatique.

Site : https://bapkenbegjanian-cmd.github.io/permis-en-ville/

## 1. Créer la clé Google (une seule fois, environ 10 minutes)

1. Aller sur https://console.cloud.google.com et se connecter avec un compte Google.
2. Créer un projet (par exemple « Permis en Ville »).
3. Activer la facturation (une carte bancaire est demandée). Google offre un quota gratuit chaque mois ; un usage de test reste en général gratuit.
4. Menu « API et services » → « Bibliothèque » → chercher **Map Tiles API** → **Activer** (ville en 3D).
   Pour l'ancienne version Street View, activer aussi **Maps JavaScript API**.
5. « API et services » → « Identifiants » → « Créer des identifiants » → « Clé API ». Copier la clé (elle commence par `AIza…`).

## 2. Lancer l'application

- Double-cliquer sur `index.html` : il s'ouvre dans le navigateur (Chrome conseillé).
- Coller la clé, choisir une ville ou taper une adresse, puis « Démarrer la séance ».
- La clé est retenue sur cet ordinateur pour les prochaines fois.

## 3. Conduire

| Touche | Action |
|---|---|
| ↑ / ↓ | Accélérer / freiner |
| Espace | Freinage appuyé |
| ← / → | Clignotant : tourner au prochain carrefour (appuyer à nouveau pour l'annuler) |
| Q / D (maintenir) | Regarder à gauche / à droite (contrôle visuel) |
| R | Demi-tour (à l'arrêt) |
| P | Pause |

Sur tablette, des boutons apparaissent à l'écran.

## Ce qui est contrôlé

- Limitation de vitesse de la rue (excès : faute, plus de 20 km/h au-dessus : éliminatoire)
- STOP : arrêt complet obligatoire + regard à gauche et à droite
- Cédez-le-passage et entrée de giratoire : arriver à 20 km/h maximum
- Priorité à droite (carrefour sans panneau) : arriver à 25 km/h maximum + regard à droite
- Feux tricolores : feu rouge grillé = éliminatoire
- Sens interdit = éliminatoire
- Clignotant mis trop tard avant de tourner
- Questions à la première rencontre de chaque type de carrefour

## Limites connues

- Street View est une suite de photos : on avance par petits sauts, pas en continu.
- Les voitures et piétons des photos sont figés : pas de vraie circulation.
- L'état des feux est **simulé** (affiché à droite de l'écran), car la photo a été prise à un autre moment.
- Les règles viennent d'OpenStreetMap : si un panneau manque dans OSM, il n'est pas contrôlé. Sans limitation renseignée, la règle par défaut en ville (50 km/h) s'applique.
- Les priorités à droite sont déduites (carrefour sans stop, cédez-le-passage ni feu, entre rues de même importance) : il peut y avoir des erreurs.

## Mise en ligne (plus tard)

Pour en faire un service en ligne (SaaS), héberger ce fichier sur un site (Netlify, Vercel, OVH…), puis dans Google Cloud restreindre la clé à l'adresse du site (« Restrictions relatives aux applications » → « Sites web »).
