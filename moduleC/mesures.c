/* mesures.c - Gestion des mesures
 * Auteur : Mansri Med Taysir (Module C 1/2)
 * Tableau dynamique, lecture CSV, ajout, recherche, suppression, tri
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "gestion.h"

/* ------------------ Tableau dynamique ------------------ */
int init_tableau(Tableau *t) {
    t->capacite = 10;
    t->taille = 0;
    t->data = malloc(t->capacite * sizeof(Mesure));
    if (!t->data) { fprintf(stderr, "Erreur : allocation memoire impossible\n"); return -1; }
    return 0;
}

void liberer_tableau(Tableau *t) {
    free(t->data);
    t->data = NULL;
    t->taille = t->capacite = 0;
}

int ajouter_mesure(Tableau *t, Mesure m) {
    if (m.valeur < 0) {
        fprintf(stderr, "Erreur : valeur negative refusee (id %d)\n", m.id);
        return -1;
    }
    if (t->taille == t->capacite) {
        int nc = t->capacite * 2;
        Mesure *p = realloc(t->data, nc * sizeof(Mesure));
        if (!p) { fprintf(stderr, "Erreur : realloc a echoue\n"); return -1; }
        t->data = p;
        t->capacite = nc;
    }
    m.alerte = 0; /* calcule ensuite par detecter_anomalies() */
    t->data[t->taille++] = m;
    return 0;
}

int supprimer_mesure(Tableau *t, int id) {
    for (int i = 0; i < t->taille; i++) {
        if (t->data[i].id == id) {
            for (int j = i; j < t->taille - 1; j++)
                t->data[j] = t->data[j + 1];
            t->taille--;
            return 0;
        }
    }
    return -1;
}

/* ------------------ Lecture CSV ------------------ */
/* Format : id,batiment,ressource,valeur,unite,date */
int charger_csv(Tableau *t, const char *fichier) {
    FILE *f = fopen(fichier, "r");
    if (!f) { fprintf(stderr, "Erreur : impossible d'ouvrir %s\n", fichier); return -1; }

    char ligne[256];
    int num = 0, ok = 0;
    while (fgets(ligne, sizeof ligne, f)) {
        num++;
        if (num == 1) continue;                       /* entete */
        ligne[strcspn(ligne, "\r\n")] = '\0';
        if (ligne[0] == '\0') continue;

        Mesure m;
        int n = sscanf(ligne, "%d,%31[^,],%15[^,],%lf,%7[^,],%10s",
                       &m.id, m.batiment, m.ressource, &m.valeur, m.unite, m.date);
        if (n != 6) {
            fprintf(stderr, "Ligne %d ignoree (format invalide) : %s\n", num, ligne);
            continue;
        }
        if (ajouter_mesure(t, m) == 0) ok++;
    }
    fclose(f);
    return ok;
}

/* ------------------ Affichage ------------------ */
void afficher_mesure(const Mesure *m) {
    printf("%-4d %-8s %-12s %9.2f %-4s %-11s %s\n", m->id, m->batiment, m->ressource,
           m->valeur, m->unite, m->date, m->alerte ? "ALERTE" : "ok");
}

void afficher_tableau(const Tableau *t) {
    printf("%-4s %-8s %-12s %9s %-4s %-11s %s\n", "ID", "Bat.", "Ressource", "Valeur", "Un.", "Date", "Etat");
    printf("--------------------------------------------------------------\n");
    for (int i = 0; i < t->taille; i++) afficher_mesure(&t->data[i]);
    printf("Total : %d mesure(s)\n", t->taille);
}

/* ------------------ Recherche ------------------ */
int rechercher_par_batiment(const Tableau *t, const char *batiment) {
    int n = 0;
    for (int i = 0; i < t->taille; i++)
        if (strcmp(t->data[i].batiment, batiment) == 0) { afficher_mesure(&t->data[i]); n++; }
    return n;
}

int rechercher_par_ressource(const Tableau *t, const char *ressource) {
    int n = 0;
    for (int i = 0; i < t->taille; i++)
        if (strcmp(t->data[i].ressource, ressource) == 0) { afficher_mesure(&t->data[i]); n++; }
    return n;
}

/* ------------------ Tri a bulles ------------------ */
void trier_bulles(Tableau *t, int croissant) {
    for (int i = 0; i < t->taille - 1; i++) {
        int echange = 0;
        for (int j = 0; j < t->taille - 1 - i; j++) {
            int hors_ordre = croissant ? (t->data[j].valeur > t->data[j + 1].valeur)
                                       : (t->data[j].valeur < t->data[j + 1].valeur);
            if (hors_ordre) {
                Mesure tmp = t->data[j];
                t->data[j] = t->data[j + 1];
                t->data[j + 1] = tmp;
                echange = 1;
            }
        }
        if (!echange) break;
    }
}

