// =====================================================================
// app.js — Page principale (index.html)
// F1 afficher les données, F2 anomalies, F3 recherche,
// F4/F5/F6 filtres, statistiques, navigation, import/export.
// =====================================================================

// Ressources : code dans data.json -> texte affiché et unité
const LIBELLES = { electricite: "Électricité", eau: "Eau", gaz: "Gaz" };
const UNITES = { electricite: "kWh", eau: "m3", gaz: "m3" };

// Seuils d'alerte déduits de data.json (utilisés pour les nouvelles mesures)
const SEUILS = { electricite: 1000, eau: 200, gaz: 300 };

const TITRES_VUES = {
  "tableau-de-bord": "Tableau de bord",
  "anomalies": "Anomalies",
  "gestion": "Gestion des données",
  "profil": "Mon profil",
};

// Liste des mesures (partagée avec crud.js et graphique.js)
let donnees = [];

// ---------------------------------------------------------------------
// Démarrage
// ---------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
  const session = lireSession();
  if (!session) {
    window.location.href = "login.html";
    return;
  }

  document.getElementById("nom-utilisateur").textContent = session.nom;

  brancherEvenements();
  initialiserCrud();
  initialiserProfil();
  afficherAideSeuils();

  // data.json : lu au premier lancement, puis gardé dans le navigateur
  const contenu = await chargerDonnees();
  donnees = contenu.mesures || [];
  rafraichir();

  if (donnees.length === 0) {
    notifier("Aucune donnée chargée. Utilisez « Importer data.json » dans le menu.");
  }
});

function brancherEvenements() {
  // Navigation de la sidebar
  document.querySelectorAll("[data-vue]").forEach((bouton) => {
    bouton.addEventListener("click", () => afficherVue(bouton.dataset.vue));
  });

  // Filtres : chaque changement met à jour l'affichage
  ["filtre-texte", "filtre-batiment", "filtre-ressource", "filtre-debut", "filtre-fin"]
    .forEach((id) => document.getElementById(id).addEventListener("input", rafraichir));
  document.getElementById("reinitialiser").addEventListener("click", reinitialiserFiltres);

  // Menu mobile
  document.getElementById("bouton-menu").addEventListener("click", () => basculerMenu(true));
  document.getElementById("voile").addEventListener("click", () => basculerMenu(false));

  // Fichiers
  document.getElementById("import-donnees").addEventListener("change", importerDonnees);
  document.getElementById("export-donnees").addEventListener("click", () => exporterJSON(contenuFichier(donnees), "data.json"));

  // Déconnexion
  document.getElementById("deconnexion").addEventListener("click", () => {
    fermerSession();
    window.location.href = "login.html";
  });
}

// ---------------------------------------------------------------------
// Navigation entre les vues
// ---------------------------------------------------------------------
function afficherVue(nom) {
  document.querySelectorAll(".vue").forEach((vue) => {
    vue.hidden = vue.id !== "vue-" + nom;
  });
  document.querySelectorAll("[data-vue]").forEach((bouton) => {
    bouton.classList.toggle("actif", bouton.dataset.vue === nom);
  });
  document.getElementById("titre-vue").textContent = TITRES_VUES[nom];
  // Les filtres ne concernent pas la page profil
  document.querySelector(".filtres").hidden = nom === "profil";
  basculerMenu(false);
}

function basculerMenu(ouvrir) {
  document.getElementById("sidebar").classList.toggle("ouverte", ouvrir);
  document.getElementById("voile").classList.toggle("visible", ouvrir);
}

// ---------------------------------------------------------------------
// Outils d'affichage
// ---------------------------------------------------------------------
function libelleRessource(code) {
  return LIBELLES[code] || code;
}

function formaterUnite(unite) {
  return unite === "m3" ? "m³" : unite || "";
}

function formaterNombre(nombre) {
  return Number(nombre).toLocaleString("fr-FR", { maximumFractionDigits: 2 });
}

function formaterDate(dateISO) {
  return new Date(dateISO + "T00:00:00").toLocaleDateString("fr-FR");
}

function classeRessource(code) {
  return { electricite: "elec", eau: "eau", gaz: "gaz" }[code] || "autre";
}

// ---------------------------------------------------------------------
// F3 à F6 : recherche et filtres
// ---------------------------------------------------------------------
function lireFiltres() {
  return {
    texte: document.getElementById("filtre-texte").value.trim().toLowerCase(),
    batiment: document.getElementById("filtre-batiment").value,
    ressource: document.getElementById("filtre-ressource").value,
    debut: document.getElementById("filtre-debut").value,
    fin: document.getElementById("filtre-fin").value,
  };
}

function filtrerDonnees(liste) {
  const filtres = lireFiltres();

  return liste.filter((m) => {
    const texteMesure =
      `${m.batiment} ${m.ressource} ${libelleRessource(m.ressource)} ${m.date} ${m.valeur}`.toLowerCase();

    if (filtres.texte && !texteMesure.includes(filtres.texte)) return false;   // F3
    if (filtres.batiment && m.batiment !== filtres.batiment) return false;    // F4
    if (filtres.ressource && m.ressource !== filtres.ressource) return false; // F5
    // F6 : les dates au format AAAA-MM-JJ se comparent comme du texte
    if (filtres.debut && m.date < filtres.debut) return false;
    if (filtres.fin && m.date > filtres.fin) return false;
    return true;
  });
}

function reinitialiserFiltres() {
  ["filtre-texte", "filtre-batiment", "filtre-ressource", "filtre-debut", "filtre-fin"]
    .forEach((id) => (document.getElementById(id).value = ""));
  rafraichir();
}

// Remplit une liste déroulante en gardant le choix actuel
// options : [{ valeur: "eau", texte: "Eau" }, ...]
function remplirListe(idSelect, options, texteTous) {
  const select = document.getElementById(idSelect);
  const choixActuel = select.value;
  select.innerHTML = `<option value="">${texteTous}</option>` +
    options.map((o) => `<option value="${echapper(o.valeur)}">${echapper(o.texte)}</option>`).join("");
  if (options.some((o) => o.valeur === choixActuel)) select.value = choixActuel;
}

function listeBatiments() {
  return [...new Set(donnees.map((m) => m.batiment))].sort();
}

// Codes des ressources : celles connues d'abord, puis les éventuelles autres
function listeRessources() {
  return [...new Set([...Object.keys(LIBELLES), ...donnees.map((m) => m.ressource)])];
}

// ---------------------------------------------------------------------
// F2 : anomalies (champ "alerte" de data.json)
// ---------------------------------------------------------------------
function estAnomalie(mesure) {
  return mesure.alerte === true;
}

// Alerte d'une nouvelle mesure : valeur négative ou au-dessus du seuil
function calculerAlerte(ressource, valeur) {
  return valeur < 0 || (SEUILS[ressource] !== undefined && valeur > SEUILS[ressource]);
}

function raisonAnomalie(mesure) {
  const seuil = SEUILS[mesure.ressource];
  if (mesure.valeur < 0) return "Valeur négative";
  if (seuil !== undefined && mesure.valeur > seuil) {
    return `Dépasse le seuil de ${formaterNombre(seuil)} ${formaterUnite(UNITES[mesure.ressource])}`;
  }
  return "Alerte indiquée dans data.json";
}

function afficherAideSeuils() {
  const texte = Object.keys(SEUILS)
    .map((r) => `${LIBELLES[r]} : ${formaterNombre(SEUILS[r])} ${formaterUnite(UNITES[r])}`)
    .join(", ");
  document.getElementById("aide-seuils").textContent =
    `Mesures dont le champ alerte vaut true. Pour une mesure ajoutée ou modifiée, l’alerte est calculée avec les seuils (${texte}).`;
}

// ---------------------------------------------------------------------
// Statistiques par bâtiment et ressource (même format que data.json)
// ---------------------------------------------------------------------

// Arrondi à 2 décimales comme printf("%.2f") en C :
// un « 5 » exact est arrondi au chiffre pair (245.125 -> 245.12).
function arrondir(nombre) {
  const centimes = nombre * 100;
  const entier = Math.floor(centimes);
  if (centimes - entier === 0.5) {
    return (entier % 2 === 0 ? entier : entier + 1) / 100;
  }
  return Math.round(centimes) / 100;
}

function calculerStatistiques(mesures) {
  // 1. Regrouper les valeurs par bâtiment + ressource
  const groupes = {};
  mesures.forEach((m) => {
    const cle = m.batiment + "|" + m.ressource;
    if (!groupes[cle]) groupes[cle] = { batiment: m.batiment, ressource: m.ressource, valeurs: [] };
    groupes[cle].valeurs.push(m.valeur);
  });

  // 2. Trier : bâtiment, puis ressource (électricité, eau, gaz)
  const ordre = listeRessources();
  const liste = Object.values(groupes).sort((a, b) =>
    a.batiment.localeCompare(b.batiment) || ordre.indexOf(a.ressource) - ordre.indexOf(b.ressource)
  );

  // 3. Calculer nb, total, moyenne, min, max
  return liste.map((g) => {
    const total = g.valeurs.reduce((somme, v) => somme + v, 0);
    return {
      batiment: g.batiment,
      ressource: g.ressource,
      nb: g.valeurs.length,
      total: arrondir(total),
      moyenne: arrondir(total / g.valeurs.length),
      min: Math.min(...g.valeurs),
      max: Math.max(...g.valeurs),
    };
  });
}

// Contenu complet de data.json, statistiques recalculées
function contenuFichier(mesures) {
  return { mesures: mesures, statistiques: calculerStatistiques(mesures) };
}

// Enregistre la nouvelle liste de mesures dans le navigateur.
// « Exporter data.json » permet ensuite de mettre à jour le fichier.
function enregistrerMesures(nouvelleListe) {
  sauvegarderDonnees(contenuFichier(nouvelleListe));
  donnees = nouvelleListe;
}

// ---------------------------------------------------------------------
// Mise à jour de tout l'affichage
// ---------------------------------------------------------------------
function rafraichir() {
  remplirListe("filtre-batiment", listeBatiments().map((b) => ({ valeur: b, texte: b })), "Tous");
  remplirListe("filtre-ressource", listeRessources().map((r) => ({ valeur: r, texte: libelleRessource(r) })), "Toutes");

  const mesures = filtrerDonnees(donnees).sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  const anomalies = mesures.filter(estAnomalie);

  afficherResume(mesures, anomalies);
  afficherStatistiques(mesures);
  afficherTableauDonnees(mesures);
  afficherTableauAnomalies(anomalies);
  afficherTableauGestion(mesures);
  dessinerGraphique(mesures);

  document.getElementById("nombre-anomalies").textContent = anomalies.length;
}

// ---------------------------------------------------------------------
// F1 : affichage des données
// ---------------------------------------------------------------------

// Cellules communes aux trois tableaux
function cellulesMesure(m) {
  return `
    <td>${formaterDate(m.date)}</td>
    <td>${echapper(m.batiment)}</td>
    <td><span class="ressource ressource-${classeRessource(m.ressource)}">${echapper(libelleRessource(m.ressource))}</span></td>
    <td class="nombre">${formaterNombre(m.valeur)} ${echapper(formaterUnite(m.unite))}</td>`;
}

function ligneVide(colonnes) {
  return `<tr><td colspan="${colonnes}" class="vide">Aucune mesure ne correspond aux filtres.</td></tr>`;
}

function afficherTableauDonnees(mesures) {
  const lignes = mesures.map((m) => `
    <tr class="${estAnomalie(m) ? "ligne-anomalie" : ""}">
      ${cellulesMesure(m)}
      <td>${estAnomalie(m) ? '<span class="etat etat-alerte">Anomalie</span>' : '<span class="etat">Normal</span>'}</td>
    </tr>`);
  document.getElementById("tableau-donnees").innerHTML = lignes.join("") || ligneVide(5);
}

function afficherTableauAnomalies(anomalies) {
  const lignes = anomalies.map((m) => `
    <tr>
      ${cellulesMesure(m)}
      <td class="raison">${raisonAnomalie(m)}</td>
    </tr>`);
  document.getElementById("tableau-anomalies").innerHTML = lignes.join("") || ligneVide(5);
}

function afficherTableauGestion(mesures) {
  const lignes = mesures.map((m) => `
    <tr>
      ${cellulesMesure(m)}
      <td class="actions">
        <button class="bouton-lien" data-action="modifier" data-id="${m.id}">Modifier</button>
        <button class="bouton-lien bouton-danger" data-action="supprimer" data-id="${m.id}">Supprimer</button>
      </td>
    </tr>`);
  document.getElementById("tableau-gestion").innerHTML = lignes.join("") || ligneVide(5);
}

// Statistiques calculées sur les mesures filtrées
function afficherStatistiques(mesures) {
  const lignes = calculerStatistiques(mesures).map((s) => {
    const unite = formaterUnite(UNITES[s.ressource]);
    return `
      <tr>
        <td>${echapper(s.batiment)}</td>
        <td><span class="ressource ressource-${classeRessource(s.ressource)}">${echapper(libelleRessource(s.ressource))}</span></td>
        <td class="nombre">${s.nb}</td>
        <td class="nombre">${formaterNombre(s.total)} ${unite}</td>
        <td class="nombre">${formaterNombre(s.moyenne)} ${unite}</td>
        <td class="nombre">${formaterNombre(s.min)} ${unite}</td>
        <td class="nombre">${formaterNombre(s.max)} ${unite}</td>
      </tr>`;
  });
  document.getElementById("tableau-statistiques").innerHTML = lignes.join("") || ligneVide(7);
}

// Totaux par ressource + nombre d'anomalies
function afficherResume(mesures, anomalies) {
  const cartes = listeRessources().map((code) => {
    const total = mesures
      .filter((m) => m.ressource === code)
      .reduce((somme, m) => somme + m.valeur, 0);
    return `
      <div class="carte-resume bord-${classeRessource(code)}">
        <p>${echapper(libelleRessource(code))}</p>
        <strong>${formaterNombre(arrondir(total))} <small>${formaterUnite(UNITES[code])}</small></strong>
      </div>`;
  });

  cartes.push(`
    <button class="carte-resume bord-alerte" onclick="afficherVue('anomalies')">
      <p>Anomalies</p>
      <strong>${anomalies.length} <small>sur ${mesures.length} mesures</small></strong>
    </button>`);

  document.getElementById("resume").innerHTML = cartes.join("");
}

// ---------------------------------------------------------------------
// Import de data.json et messages
// ---------------------------------------------------------------------
async function importerDonnees(evenement) {
  const fichier = evenement.target.files[0];
  if (!fichier) return;
  try {
    const contenu = await importerJSON(fichier);
    if (!contenu || !Array.isArray(contenu.mesures)) {
      throw new Error("data.json doit contenir { \"mesures\": [ ... ] }.");
    }
    if (donnees.length && !confirm("Remplacer les données actuelles par ce fichier ?")) return;
    enregistrerMesures(contenu.mesures);
    rafraichir();
    notifier(`${donnees.length} mesures importées.`);
  } catch (erreur) {
    notifier("Fichier invalide : " + erreur.message);
  } finally {
    evenement.target.value = "";
  }
}

function notifier(texte) {
  const toast = document.getElementById("toast");
  toast.textContent = texte;
  toast.hidden = false;
  clearTimeout(notifier.minuteur);
  notifier.minuteur = setTimeout(() => (toast.hidden = true), 3500);
}
