/* main.c - Module C : version interactive avec controle de saisie
 * Compilation : gcc -Wall -Wextra -o module_c moduleC/main.c moduleC/mesures.c moduleC/analyse.c
 * Execution   : .\module_c.exe moduleC\measures_in.csv moduleC\data.json
 *
 * - Si le fichier CSV n'existe pas, le programme demarre SANS mesures.
 * - Chaque mesure saisie est verifiee (batiment, ressource, valeur, unite, date).
 * - Apres chaque ajout/suppression : CSV et data.json sont mis a jour automatiquement.
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>
#include "gestion.h"

static const char *g_csv  = "measures_in.csv";
static const char *g_json = "data.json";
static int g_backup_fait = 0;

/* ================= Saisie ================= */

/* Lit une ligne (sans \n). Retourne 0 si fin de saisie (EOF), 1 sinon.
   Retourne aussi 1 avec buf = "" si la ligne est trop longue. */
static int lire_ligne(const char *invite, char *buf, int taille) {
    char tmp[128];
    printf("%s", invite);
    if (!fgets(tmp, sizeof tmp, stdin)) return 0;
    if (!strchr(tmp, '\n')) {                  /* ligne trop longue : on vide le reste */
        int c;
        while ((c = getchar()) != '\n' && c != EOF) {}
        buf[0] = '\0';
        return 1;
    }
    tmp[strcspn(tmp, "\r\n")] = '\0';
    char *d = tmp;                             /* enleve espaces au debut et a la fin */
    while (*d == ' ' || *d == '\t') d++;
    size_t n = strlen(d);
    while (n > 0 && (d[n - 1] == ' ' || d[n - 1] == '\t')) d[--n] = '\0';
    if ((int)n >= taille) { buf[0] = '\0'; return 1; }
    strcpy(buf, d);
    return 1;
}

static int egal_nocase(const char *a, const char *b) {
    while (*a && *b) {
        if (tolower((unsigned char)*a) != tolower((unsigned char)*b)) return 0;
        a++; b++;
    }
    return *a == *b;
}

static void en_minuscules(char *s) {
    for (; *s; s++) *s = (char)tolower((unsigned char)*s);
}

/* ================= Validations ================= */
static int batiment_valide(const char *s) {
    if (s[0] == '\0') return 0;
    for (; *s; s++)
        if (!isalnum((unsigned char)*s) && *s != '-' && *s != '_' && *s != ' ') return 0;
    return 1;
}

static int ressource_valide(const char *s) {
    return !strcmp(s, "electricite") || !strcmp(s, "eau") || !strcmp(s, "gaz");
}

static const char *unite_attendue(const char *ressource) {
    return strcmp(ressource, "electricite") == 0 ? "kWh" : "m3";
}

static int date_valide(const char *s) {
    int a, m, j;
    if (strlen(s) != 10 || s[4] != '-' || s[7] != '-') return 0;
    for (int i = 0; i < 10; i++)
        if (i != 4 && i != 7 && !isdigit((unsigned char)s[i])) return 0;
    if (sscanf(s, "%4d-%2d-%2d", &a, &m, &j) != 3) return 0;
    if (a < 2000 || a > 2100 || m < 1 || m > 12 || j < 1) return 0;
    int jours[] = {31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};
    if (m == 2 && ((a % 4 == 0 && a % 100 != 0) || a % 400 == 0)) jours[1] = 29;
    return j <= jours[m - 1];
}

/* ================= Sauvegarde ================= */
static int copier_fichier(const char *src, const char *dst) {
    FILE *a = fopen(src, "rb");
    if (!a) return -1;
    FILE *b = fopen(dst, "wb");
    if (!b) { fclose(a); return -1; }
    char buf[1024];
    size_t n;
    while ((n = fread(buf, 1, sizeof buf, a)) > 0) fwrite(buf, 1, n, b);
    fclose(a);
    fclose(b);
    return 0;
}

static int sauvegarder_csv(const Tableau *t, const char *fichier) {
    FILE *f = fopen(fichier, "w");
    if (!f) { fprintf(stderr, "Erreur : impossible d'ecrire %s\n", fichier); return -1; }
    fprintf(f, "id,batiment,ressource,valeur,unite,date\n");
    for (int i = 0; i < t->taille; i++) {
        const Mesure *m = &t->data[i];
        fprintf(f, "%d,%s,%s,%.2f,%s,%s\n", m->id, m->batiment, m->ressource,
                m->valeur, m->unite, m->date);
    }
    fclose(f);
    return 0;
}

static void sauvegarde_auto(Tableau *t) {
    Stat s[50];
    if (!g_backup_fait) {                       /* copie de securite, une seule fois */
        char bak[512];
        snprintf(bak, sizeof bak, "%s.bak", g_csv);
        copier_fichier(g_csv, bak);
        g_backup_fait = 1;
    }
    detecter_anomalies(t);
    int ns = calculer_stats(t, s, 50);
    int r1 = sauvegarder_csv(t, g_csv);
    int r2 = exporter_json(t, s, ns, g_json);
    if (r1 == 0 && r2 == 0)
        printf("[Sauvegarde automatique] %s et %s mis a jour (%d mesures).\n", g_csv, g_json, t->taille);
}

static int prochain_id(const Tableau *t) {
    int max = 0;
    for (int i = 0; i < t->taille; i++)
        if (t->data[i].id > max) max = t->data[i].id;
    return max + 1;
}

/* ================= Actions ================= */
/* Retourne 1 si la saisie est terminee, 0 si l'utilisateur a tape "annuler" ou fin de saisie */
static int demander(const char *invite, char *buf, int taille) {
    if (!lire_ligne(invite, buf, taille)) return 0;
    return !egal_nocase(buf, "annuler");
}

static void action_ajouter(Tableau *t) {
    Mesure m;
    char tmp[64];
    m.id = prochain_id(t);
    printf("Nouvelle mesure (id %d). Tapez 'annuler' a tout moment pour abandonner.\n", m.id);

    for (;;) {                                                     /* batiment */
        if (!demander("Batiment (ex: BatA)             : ", m.batiment, LEN_BAT)) goto annule;
        if (batiment_valide(m.batiment)) break;
        printf("  Erreur : batiment invalide (lettres, chiffres, - _ espace ; max %d caracteres).\n", LEN_BAT - 1);
    }
    for (;;) {                                                     /* ressource */
        if (!demander("Ressource (electricite/eau/gaz) : ", m.ressource, LEN_RES)) goto annule;
        en_minuscules(m.ressource);
        if (ressource_valide(m.ressource)) break;
        printf("  Erreur : ressource inconnue. Choix possibles : electricite, eau, gaz.\n");
    }
    for (;;) {                                                     /* valeur */
        char *fin;
        if (!demander("Valeur (ex: 150.5)              : ", tmp, sizeof tmp)) goto annule;
        for (char *p = tmp; *p; p++) if (*p == ',') *p = '.';
        m.valeur = strtod(tmp, &fin);
        if (tmp[0] == '\0' || *fin != '\0') { printf("  Erreur : ce n'est pas un nombre.\n"); continue; }
        if (m.valeur < 0)                   { printf("  Erreur : la valeur ne peut pas etre negative.\n"); continue; }
        if (m.valeur > 1e9)                 { printf("  Erreur : valeur trop grande.\n"); continue; }
        break;
    }
    for (;;) {                                                     /* unite */
        const char *attendue = unite_attendue(m.ressource);
        if (!demander("Unite (kWh ou m3)               : ", tmp, sizeof tmp)) goto annule;
        if (egal_nocase(tmp, attendue)) { strcpy(m.unite, attendue); break; }
        printf("  Erreur : pour %s l'unite doit etre %s.\n", m.ressource, attendue);
    }
    for (;;) {                                                     /* date */
        if (!demander("Date (AAAA-MM-JJ)               : ", m.date, LEN_DATE)) goto annule;
        if (date_valide(m.date)) break;
        printf("  Erreur : date invalide (format AAAA-MM-JJ, ex: 2026-10-05, date reelle).\n");
    }

    if (ajouter_mesure(t, m) == 0) {
        sauvegarde_auto(t);
        if (t->data[t->taille - 1].alerte)
            printf("ALERTE : cette mesure depasse le seuil (%.0f %s).\n", seuil_pour(m.ressource), m.unite);
        else
            printf("Mesure ajoutee, aucune anomalie.\n");
    }
    return;
annule:
    printf("Ajout annule.\n");
}

static void action_supprimer(Tableau *t) {
    char tmp[32], *fin;
    if (t->taille == 0) { printf("Aucune mesure a supprimer.\n"); return; }
    if (!lire_ligne("Id a supprimer : ", tmp, sizeof tmp)) return;
    long id = strtol(tmp, &fin, 10);
    if (tmp[0] == '\0' || *fin != '\0') { printf("Id invalide.\n"); return; }
    if (supprimer_mesure(t, (int)id) == 0) {
        printf("Mesure %ld supprimee.\n", id);
        sauvegarde_auto(t);
    } else {
        printf("Id %ld introuvable.\n", id);
    }
}

static void action_anomalies_stats(Tableau *t) {
    Stat s[50];
    if (t->taille == 0) { printf("Aucune mesure.\n"); return; }
    int nb = detecter_anomalies(t);
    printf("\n--- ANOMALIES (%d) ---\n", nb);
    if (nb == 0) printf("Aucune anomalie.\n");
    for (int i = 0; i < t->taille; i++)
        if (t->data[i].alerte) afficher_mesure(&t->data[i]);
    printf("\n--- STATISTIQUES par batiment et ressource ---\n");
    afficher_stats(s, calculer_stats(t, s, 50));
}

/* ================= Programme principal ================= */
int main(int argc, char *argv[]) {
    if (argc > 1) g_csv = argv[1];
    if (argc > 2) g_json = argv[2];

    Tableau t;
    char buf[64];
    if (init_tableau(&t) != 0) return 1;

    FILE *test = fopen(g_csv, "r");              /* fichier absent : on demarre vide */
    if (test) {
        fclose(test);
        if (charger_csv(&t, g_csv) < 0) { liberer_tableau(&t); return 1; }
        detecter_anomalies(&t);
    }
    if (t.taille == 0)
        printf("Aucune mesure pour le moment : commencez par '2. Ajouter une mesure'.\n");

    int choix = -1;
    while (choix != 0) {
        printf("\n===== MENU (%d mesure(s)) =====\n"
               "1. Afficher toutes les mesures\n"
               "2. Ajouter une mesure\n"
               "3. Rechercher par batiment\n"
               "4. Rechercher par ressource\n"
               "5. Supprimer une mesure (par id)\n"
               "6. Trier par valeur\n"
               "7. Anomalies et statistiques\n"
               "0. Quitter\n", t.taille);
        if (!lire_ligne("Votre choix : ", buf, sizeof buf)) break;
        choix = atoi(buf);
        if (buf[0] != '0' && choix == 0) choix = -1;

        switch (choix) {
        case 1:
            if (t.taille == 0) printf("Aucune mesure.\n"); else afficher_tableau(&t);
            break;
        case 2: action_ajouter(&t); break;
        case 3: {
            char b[LEN_BAT];
            if (!lire_ligne("Batiment a chercher : ", b, sizeof b)) break;
            printf("-> %d resultat(s)\n", rechercher_par_batiment(&t, b));
            break;
        }
        case 4: {
            char r[LEN_RES];
            if (!lire_ligne("Ressource a chercher : ", r, sizeof r)) break;
            en_minuscules(r);
            printf("-> %d resultat(s)\n", rechercher_par_ressource(&t, r));
            break;
        }
        case 5: action_supprimer(&t); break;
        case 6:
            if (!lire_ligne("Ordre (1 = croissant, 2 = decroissant) : ", buf, sizeof buf)) break;
            trier_bulles(&t, atoi(buf) == 1);
            if (t.taille == 0) printf("Aucune mesure.\n"); else afficher_tableau(&t);
            break;
        case 7: action_anomalies_stats(&t); break;
        case 0: printf("Au revoir.\n"); break;
        default: printf("Choix invalide.\n");
        }
    }
    liberer_tableau(&t);
    return 0;
}
