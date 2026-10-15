#include <stdio.h>
/* main.c - Programme de test du Module C
 * Auteur : Talhaoui Ghofrane
 */
#include <stdio.h>
#include <string.h>
#include "gestion.h"

int main(int argc, char *argv[]) {
    const char *entree = (argc > 1) ? argv[1] : "measures_in.csv";
    const char *sortie = (argc > 2) ? argv[2] : "data.json";

    Tableau t;
    if (init_tableau(&t) != 0) return 1;

    /* 1. Chargement + verification */
    int n = charger_csv(&t, entree);
    if (n < 0) { liberer_tableau(&t); return 1; }
    detecter_anomalies(&t);
    printf("=== %d mesure(s) chargee(s) depuis %s ===\n", n, entree);
    afficher_tableau(&t);

    /* 2. Recherches */
    printf("\n=== Recherche : batiment BatA ===\n");
    printf("-> %d resultat(s)\n", rechercher_par_batiment(&t, "BatA"));
    printf("\n=== Recherche : ressource eau ===\n");
    printf("-> %d resultat(s)\n", rechercher_par_ressource(&t, "eau"));

    /* 3. Ajout puis suppression (test) */
    Mesure test = {99, "BatC", "gaz", 120.0, "m3", "2026-10-01", 0};
    ajouter_mesure(&t, test);
    printf("\nAjout id 99 -> %d mesures\n", t.taille);
    if (supprimer_mesure(&t, 99) == 0)
        printf("Suppression id 99 -> %d mesures\n", t.taille);
    if (supprimer_mesure(&t, 12345) != 0)
        printf("Suppression id 12345 -> introuvable (cas d'erreur OK)\n");

    /* 4. Anomalies + tri decroissant */
    int nb_anom = detecter_anomalies(&t);
    printf("\n=== %d anomalie(s) detectee(s) ===\n", nb_anom);
    trier_bulles(&t, 0);
    afficher_tableau(&t);

    /* 5. Statistiques */
    Stat stats[50];
    int ns = calculer_stats(&t, stats, 50);
    printf("\n=== Statistiques par batiment / ressource ===\n");
    afficher_stats(stats, ns);

    /* 6. Export */
    if (exporter_json(&t, stats, ns, sortie) == 0)
        printf("\nFichier %s genere avec succes.\n", sortie);

    liberer_tableau(&t);
    return 0;
}
