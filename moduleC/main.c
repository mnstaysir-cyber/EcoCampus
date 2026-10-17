/* main.c - Version interactive du Module C (menu)
 * Compilation : gcc -Wall -Wextra -o module_c moduleC/main.c moduleC/mesures.c moduleC/analyse.c
 * Execution   : .\module_c.exe moduleC\measures_in.csv data.json
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "gestion.h"

static void lire_texte(const char *invite, char *buf, int taille) {
    printf("%s", invite);
    if (!fgets(buf, taille, stdin)) { buf[0] = '\0'; return; }
    buf[strcspn(buf, "\r\n")] = '\0';
}

static double lire_nombre(const char *invite, int *ok) {
    char buf[64], *fin;
    lire_texte(invite, buf, sizeof buf);
    double v = strtod(buf, &fin);
    *ok = (fin != buf && *fin == '\0');
    return v;
}

static int prochain_id(const Tableau *t) {
    int max = 0;
    for (int i = 0; i < t->taille; i++)
        if (t->data[i].id > max) max = t->data[i].id;
    return max + 1;
}

static int sauvegarder_csv(const Tableau *t, const char *fichier) {
    FILE *f = fopen(fichier, "w");
    if (!f) { fprintf(stderr, "Erreur : impossible d'ecrire %s\n", fichier); return -1; }
    fprintf(f, "id,batiment,ressource,valeur,unite,date\n");
    for (int i = 0; i < t->taille; i++) {
        const Mesure *m = &t->data[i];
        fprintf(f, "%d,%s,%s,%.2f,%s,%s\n", m->id, m->batiment, m->ressource, m->valeur, m->unite, m->date);
    }
    fclose(f);
    return 0;
}

static void menu_ajouter(Tableau *t) {
    Mesure m;
    int ok;
    m.id = prochain_id(t);
    printf("(id attribue automatiquement : %d)\n", m.id);
    lire_texte("Batiment (ex: BatA)            : ", m.batiment, LEN_BAT);
    lire_texte("Ressource (electricite/eau/gaz): ", m.ressource, LEN_RES);
    m.valeur = lire_nombre("Valeur (ex: 150.5)             : ", &ok);
    if (!ok) { printf("Valeur invalide, ajout annule.\n"); return; }
    lire_texte("Unite (kWh ou m3)              : ", m.unite, LEN_UNITE);
    lire_texte("Date (AAAA-MM-JJ)              : ", m.date, LEN_DATE);

    if (m.batiment[0] == '\0' || m.ressource[0] == '\0') {
        printf("Batiment et ressource obligatoires, ajout annule.\n");
        return;
    }
    if (strcmp(m.ressource, "electricite") && strcmp(m.ressource, "eau") && strcmp(m.ressource, "gaz"))
        printf("Attention : ressource inconnue, aucune alerte ne sera calculee.\n");

    if (ajouter_mesure(t, m) == 0) {
        detecter_anomalies(t);
        printf("Mesure ajoutee (%d mesures au total).\n", t->taille);
    }
}

int main(int argc, char *argv[]) {
    const char *entree = (argc > 1) ? argv[1] : "measures_in.csv";
    const char *sortie = (argc > 2) ? argv[2] : "data.json";
    Tableau t;
    char buf[64];
    if (init_tableau(&t) != 0) return 1;

    int n = charger_csv(&t, entree);
    if (n < 0) { liberer_tableau(&t); return 1; }
    detecter_anomalies(&t);
    printf("%d mesure(s) chargee(s) depuis %s.\n", n, entree);

    int choix = -1;
    while (choix != 0) {
        printf("\n===== MENU =====\n"
               "1. Afficher toutes les mesures\n"
               "2. Ajouter une mesure\n"
               "3. Rechercher par batiment\n"
               "4. Rechercher par ressource\n"
               "5. Supprimer une mesure (par id)\n"
               "6. Trier par valeur\n"
               "7. Anomalies et statistiques\n"
               "8. Exporter le fichier JSON\n"
               "9. Sauvegarder dans le CSV (garder les changements)\n"
               "0. Quitter\n");
        lire_texte("Votre choix : ", buf, sizeof buf);
        choix = atoi(buf);
        if (buf[0] != '0' && choix == 0) choix = -1;

        switch (choix) {
        case 1:
            afficher_tableau(&t);
            break;
        case 2:
            menu_ajouter(&t);
            break;
        case 3: {
            char b[LEN_BAT];
            lire_texte("Batiment a chercher : ", b, sizeof b);
            printf("-> %d resultat(s)\n", rechercher_par_batiment(&t, b));
            break;
        }
        case 4: {
            char r[LEN_RES];
            lire_texte("Ressource a chercher : ", r, sizeof r);
            printf("-> %d resultat(s)\n", rechercher_par_ressource(&t, r));
            break;
        }
        case 5: {
            int ok;
            int id = (int)lire_nombre("Id a supprimer : ", &ok);
            if (!ok) printf("Id invalide.\n");
            else if (supprimer_mesure(&t, id) == 0) printf("Mesure %d supprimee (%d restantes).\n", id, t.taille);
            else printf("Id %d introuvable.\n", id);
            break;
        }
        case 6:
            lire_texte("Ordre (1 = croissant, 2 = decroissant) : ", buf, sizeof buf);
            trier_bulles(&t, atoi(buf) == 1);
            afficher_tableau(&t);
            break;
        case 7: {
            Stat s[50];
            printf("%d anomalie(s) detectee(s).\n", detecter_anomalies(&t));
            afficher_stats(s, calculer_stats(&t, s, 50));
            break;
        }
        case 8: {
            Stat s[50];
            int ns;
            detecter_anomalies(&t);
            ns = calculer_stats(&t, s, 50);
            if (exporter_json(&t, s, ns, sortie) == 0) printf("%s genere.\n", sortie);
            break;
        }
        case 9:
            if (sauvegarder_csv(&t, entree) == 0)
                printf("%s sauvegarde (%d mesures). Elles seront rechargees au prochain lancement.\n", entree, t.taille);
            break;
        case 0:
            printf("Au revoir.\n");
            break;
        default:
            printf("Choix invalide.\n");
        }
    }
    liberer_tableau(&t);
    return 0;
}
