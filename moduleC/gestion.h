#ifndef GESTION_H
#define GESTION_H

#define LEN_BAT 32
#define LEN_RES 16
#define LEN_UNITE 8
#define LEN_DATE 11

/* ---- Structure d'une mesure (Mansri Taysir) ---- */
typedef struct {
    int id;
    char batiment[LEN_BAT];
    char ressource[LEN_RES];   /* electricite, eau, gaz */
    double valeur;
    char unite[LEN_UNITE];
    char date[LEN_DATE];       /* AAAA-MM-JJ */
    int alerte;                /* 1 = anomalie, 0 = normal */
} Mesure;

/* Tableau dynamique */
typedef struct {
    Mesure *data;
    int taille;
    int capacite;
} Tableau;

/* ---- Statistiques par batiment et ressource (Talhaoui Ghofrane) ---- */
typedef struct {
    char batiment[LEN_BAT];
    char ressource[LEN_RES];
    int nb;
    double total, moyenne, min, max;
} Stat;

/* Gestion du tableau */
int  init_tableau(Tableau *t);
void liberer_tableau(Tableau *t);
int  ajouter_mesure(Tableau *t, Mesure m);          /* 0 = OK, -1 = erreur */
int  supprimer_mesure(Tableau *t, int id);          /* 0 = OK, -1 = introuvable */
int  charger_csv(Tableau *t, const char *fichier);  /* retourne nb lignes chargees, -1 si erreur */
void afficher_tableau(const Tableau *t);
void afficher_mesure(const Mesure *m);

/* Recherche : affiche et retourne le nombre de resultats */
int  rechercher_par_batiment(const Tableau *t, const char *batiment);
int  rechercher_par_ressource(const Tableau *t, const char *ressource);

/* Tri a bulles sur la valeur (croissant = 1, decroissant = 0) */
void trier_bulles(Tableau *t, int croissant);

/* Anomalies + statistiques */
double seuil_pour(const char *ressource);
int  detecter_anomalies(Tableau *t);                /* retourne le nb d'anomalies */
int  calculer_stats(const Tableau *t, Stat *out, int max);
void afficher_stats(const Stat *s, int n);

/* Export */
int  exporter_json(const Tableau *t, const Stat *s, int nb_stats, const char *fichier);

#endif
