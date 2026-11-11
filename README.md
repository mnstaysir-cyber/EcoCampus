# Module Web — Gestion de consommation

Interface en HTML, CSS et JavaScript, sans bibliothèque ni lien externe : aucun CDN, aucune police Google, aucun Bootstrap. Tout fonctionne hors ligne.

## Lancer l'application

Rien à installer (Windows) :

1. Double-cliquer sur **`lancer.bat`** dans le dossier `module-web`.
2. Une fenêtre noire s'ouvre (le serveur) et le navigateur ouvre http://localhost:3000.
3. Pour arrêter, fermer la fenêtre noire.

Le serveur est écrit en PowerShell (`server.ps1`), fourni avec Windows. Si Node.js est installé, `node server.js` fait exactement la même chose.

Compte de test : `admin@exemple.com` / `admin123`

## Comptes : localStorage

Les comptes sont enregistrés dans le navigateur (localStorage, clé `gc_utilisateurs`) :

- Au premier lancement, la liste est remplie avec les comptes de `COMPTES_INITIAUX` (`js/stockage.js`).
- **Créer le compte** ajoute le compte dans le localStorage.
- **Se connecter** vérifie l'email et le mot de passe dans le localStorage.
- **Mon profil** (sidebar) affiche le nom et l'email du compte, et permet de modifier le nom, l'email ou le mot de passe. Le mot de passe actuel est demandé pour enregistrer.

Les comptes sont propres à chaque navigateur : un compte créé sur un poste n'existe pas sur un autre.

## Mesures : moduleC/data.json

Le fichier de données est celui du module C : **`moduleC/data.json`** (il n'y a plus de dossier `module-web/data/`). Le serveur le fournit à l'adresse `/moduleC/data.json`.

Il est lu au premier lancement, puis les ajouts, modifications et suppressions sont gardés dans le navigateur. Pour mettre à jour le fichier, cliquez sur *Exporter data.json* dans le menu, puis remplacez `moduleC/data.json`. *Importer data.json* recharge un fichier (par exemple après une nouvelle exécution du module C).

## Mode clair / mode sombre

Bouton *Mode sombre* / *Mode clair* : dans la sidebar, et en haut à droite de la page de connexion. Le choix est gardé dans le localStorage (clé `gc_theme`). Sans choix, l'application suit le réglage du système. Les couleurs sont des variables CSS en haut de `css/style.css` (`:root` pour le clair, `:root[data-theme="dark"]` pour le sombre).

## Organisation du code

| Fichier | Rôle |
|---|---|
| `lancer.bat` + `server.ps1` | Mini serveur (PowerShell) : affiche le site et `moduleC/data.json` |
| `server.js` | Même serveur en Node.js (facultatif) |
| `login.html` + `js/auth.js` | Connexion et création de compte |
| `index.html` | Page principale (sidebar, filtres, 4 vues, formulaire) |
| `js/stockage.js` | Session, comptes et moduleC/data.json dans le navigateur (localStorage), import/export |
| `js/theme.js` | Mode clair / sombre |
| `js/app.js` | Navigation, affichage, recherche, filtres, anomalies |
| `js/crud.js` | Ajouter, modifier, supprimer une mesure |
| `js/profil.js` | Vue « Mon profil » : afficher et modifier son compte |
| `js/graphique.js` | Graphique par mois, dessiné en `<canvas>` (sans bibliothèque) |
| `css/style.css` | Apparence, thèmes clair / sombre, responsive |

## Fonctionnalités demandées

| N° | Fonction | Où |
|---|---|---|
| F1 | Afficher les données | Tableau de bord → « Toutes les mesures » (`afficherTableauDonnees`) |
| F2 | Afficher les anomalies | Vue Anomalies (champ `alerte`, `estAnomalie`) |
| F3 | Rechercher | Champ « Rechercher » (`filtrerDonnees`) |
| F4 | Filtrer par bâtiment | Liste « Bâtiment » |
| F5 | Filtrer par ressource | Liste « Ressource » |
| F6 | Filtrer par période | Champs « Du » / « Au » |
| F7 | Graphique | `js/graphique.js` (canvas natif) |
| F8 | Responsive | Fin de `css/style.css` (menu repliable sous 900 px) |

## Format de data.json

```json
{
  "mesures": [
    {"id": 1, "batiment": "BatA", "ressource": "electricite", "valeur": 420.50, "unite": "kWh", "date": "2026-09-01", "alerte": false}
  ],
  "statistiques": [
    {"batiment": "BatA", "ressource": "electricite", "nb": 3, "total": 1305.50, "moyenne": 435.17, "min": 420.50, "max": 455.00}
  ]
}
```

- Ressources : `electricite` (kWh), `eau` (m3), `gaz` (m3).
- **Anomalies (F2)** : mesures dont `alerte` vaut `true`.
- **Ajout / modification** : `alerte` est calculée avec les seuils de `SEUILS` (`js/app.js`) : 1000 kWh, 200 m3, 300 m3.
- **statistiques** : recalculées à chaque changement, avec le même arrondi que `printf("%.2f")`.

## Limite à connaître

Les mots de passe sont stockés en clair dans le localStorage, visibles dans les outils développeur du navigateur. C'est acceptable pour un projet d'étude, pas pour une vraie application : il faudrait un serveur et des mots de passe chiffrés.
