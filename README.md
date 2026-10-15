# Projet Consommation - DSI2 2026-2027

Suivi de la consommation (electricite, eau, gaz) par batiment : Module C (traitement des donnees en C) + Module Web.

## Equipe et branches
| Membre | Branche | Fichiers |
|---|---|---|
| Mansri Med Taysir | `feature/module-c-taysir` | moduleC/mesures.c, moduleC/measures_in.csv |
| Talhaoui Ghofrane | `feature/module-c-ghofrane` | moduleC/analyse.c, moduleC/main.c, moduleC/data.json |
| Kort Emna | `feature/web-emna` | web/ (HTML, CSS, Chart.js) |
| Mraihi Ghofrane | `feature/web-mraihi` | web/ (fetch, filtres, integration) |

## Module C : compilation et execution
    gcc -Wall -Wextra -o module_c moduleC/main.c moduleC/mesures.c moduleC/analyse.c
    ./module_c moduleC/measures_in.csv data.json
(ou simplement `make`, puis `./module_c moduleC/measures_in.csv data.json`)

## Format CSV d'entree
    id,batiment,ressource,valeur,unite,date

## Seuils d'anomalie (champ "alerte")
electricite > 1000 kWh, eau > 200 m3, gaz > 300 m3

## Format JSON de sortie
    { "mesures": [ {id, batiment, ressource, valeur, unite, date, alerte} ... ],
      "statistiques": [ {batiment, ressource, nb, total, moyenne, min, max} ... ] }
