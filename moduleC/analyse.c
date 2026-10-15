module c (2/2) anomalies,statistiques,export JSON 
/* analyse.c - Anomalies, statistiques et export
 * Auteur : Talhaoui Ghofrane (Module C 2/2)
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "gestion.h"

/* Seuils d'anomalie par type de ressource */
double seuil_pour(const char *r) {
    if (strcmp(r, "electricite") == 0) return 1000.0; /* kWh */
    if (strcmp(r, "eau") == 0)         return 200.0;  /* m3  */
    if (strcmp(r, "gaz") == 0)         return 300.0;  /* m3  */
    return 1e9;
}


/* ------------------ Anomalies ------------------ */
int detecter_anomalies(Tableau *t) {
    int n = 0;
    for (int i = 0; i < t->taille; i++) {
        t->data[i].alerte = (t->data[i].valeur > seuil_pour(t->data[i].ressource)) ? 1 : 0;
        n += t->data[i].alerte;
    }
    return n;
}

/* ------------------ Statistiques ------------------ */
int calculer_stats(const Tableau *t, Stat *out, int max) {
    int n = 0;
    for (int i = 0; i < t->taille; i++) {
        const Mesure *m = &t->data[i];
        int k;
        for (k = 0; k < n; k++)
            if (!strcmp(out[k].batiment, m->batiment) && !strcmp(out[k].ressource, m->ressource)) break;
        if (k == n) {
            if (n == max) continue;
            strcpy(out[n].batiment, m->batiment);
            strcpy(out[n].ressource, m->ressource);
            out[n].nb = 0; out[n].total = 0;
            out[n].min = m->valeur; out[n].max = m->valeur;
            n++;
        }
        out[k].nb++;
        out[k].total += m->valeur;
        if (m->valeur < out[k].min) out[k].min = m->valeur;
        if (m->valeur > out[k].max) out[k].max = m->valeur;
    }
    for (int k = 0; k < n; k++) out[k].moyenne = out[k].total / out[k].nb;
    return n;
}

void afficher_stats(const Stat *s, int n) {
    printf("%-8s %-12s %3s %10s %10s %10s %10s\n", "Bat.", "Ressource", "Nb", "Total", "Moyenne", "Min", "Max");
    for (int i = 0; i < n; i++)
        printf("%-8s %-12s %3d %10.2f %10.2f %10.2f %10.2f\n", s[i].batiment, s[i].ressource,
               s[i].nb, s[i].total, s[i].moyenne, s[i].min, s[i].max);
}

/* ------------------ Export JSON ------------------ */
int exporter_json(const Tableau *t, const Stat *s, int nb_stats, const char *fichier) {
    FILE *f = fopen(fichier, "w");
    if (!f) { fprintf(stderr, "Erreur : impossible de creer %s\n", fichier); return -1; }

    fprintf(f, "{\n  \"mesures\": [\n");
    for (int i = 0; i < t->taille; i++) {
        const Mesure *m = &t->data[i];
        fprintf(f, "    {\"id\": %d, \"batiment\": \"%s\", \"ressource\": \"%s\", \"valeur\": %.2f, "
                   "\"unite\": \"%s\", \"date\": \"%s\", \"alerte\": %s}%s\n",
                m->id, m->batiment, m->ressource, m->valeur, m->unite, m->date,
                m->alerte ? "true" : "false", (i < t->taille - 1) ? "," : "");
    }
    fprintf(f, "  ],\n  \"statistiques\": [\n");
    for (int i = 0; i < nb_stats; i++) {
        fprintf(f, "    {\"batiment\": \"%s\", \"ressource\": \"%s\", \"nb\": %d, \"total\": %.2f, "
                   "\"moyenne\": %.2f, \"min\": %.2f, \"max\": %.2f}%s\n",
                s[i].batiment, s[i].ressource, s[i].nb, s[i].total, s[i].moyenne,
                s[i].min, s[i].max, (i < nb_stats - 1) ? "," : "");
    }
    fprintf(f, "  ]\n}\n");
    fclose(f);
    return 0;
}
