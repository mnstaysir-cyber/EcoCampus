// =====================================================================
// crud.js — Ajouter, modifier et supprimer une mesure
// Chaque changement est gardé dans le navigateur.
// « Exporter data.json » permet ensuite de mettre à jour le fichier.
// =====================================================================

// id de la mesure en cours de modification (null = ajout)
let idEnModification = null;

function initialiserCrud() {
  const fenetre = document.getElementById("fenetre-formulaire");

  document.getElementById("bouton-ajouter").addEventListener("click", () => ouvrirFormulaire());
  document.getElementById("bouton-annuler").addEventListener("click", () => fenetre.close());
  document.getElementById("form-mesure").addEventListener("submit", enregistrerMesure);

  // L'unité affichée suit la ressource choisie
  document.getElementById("champ-ressource").addEventListener("change", (e) => {
    document.getElementById("champ-unite").textContent = formaterUnite(UNITES[e.target.value]);
  });

  // Boutons Modifier / Supprimer du tableau (un seul écouteur pour toutes les lignes)
  document.getElementById("tableau-gestion").addEventListener("click", (e) => {
    const bouton = e.target.closest("[data-action]");
    if (!bouton) return;
    const id = Number(bouton.dataset.id);
    if (bouton.dataset.action === "modifier") {
      ouvrirFormulaire(donnees.find((m) => m.id === id));
    } else {
      supprimerMesure(id);
    }
  });
}

// Ouvre le formulaire vide (ajout) ou rempli (modification)
function ouvrirFormulaire(mesure = null) {
  idEnModification = mesure ? mesure.id : null;

  document.getElementById("titre-formulaire").textContent =
    mesure ? "Modifier la mesure" : "Ajouter une mesure";

  // Propositions de bâtiments et liste des ressources
  document.getElementById("liste-batiments").innerHTML =
    listeBatiments().map((b) => `<option value="${echapper(b)}">`).join("");
  document.getElementById("champ-ressource").innerHTML =
    Object.keys(LIBELLES).map((code) => `<option value="${code}">${LIBELLES[code]}</option>`).join("");

  // Valeurs des champs
  const ressource = mesure ? mesure.ressource : "electricite";
  document.getElementById("champ-batiment").value = mesure ? mesure.batiment : "";
  document.getElementById("champ-ressource").value = ressource;
  document.getElementById("champ-date").value = mesure ? mesure.date : new Date().toISOString().slice(0, 10);
  document.getElementById("champ-valeur").value = mesure ? mesure.valeur : "";
  document.getElementById("champ-unite").textContent = formaterUnite(UNITES[ressource]);

  document.getElementById("fenetre-formulaire").showModal();
}

// Create / Update
function enregistrerMesure(evenement) {
  evenement.preventDefault();

  const ressource = document.getElementById("champ-ressource").value;
  const valeur = Number(document.getElementById("champ-valeur").value);
  const estAjout = idEnModification === null;
  const id = estAjout ? prochainId(donnees) : idEnModification;

  // Même ordre de champs que dans data.json
  const mesure = {
    id: id,
    batiment: document.getElementById("champ-batiment").value.trim(),
    ressource: ressource,
    valeur: valeur,
    unite: UNITES[ressource],
    date: document.getElementById("champ-date").value,
    alerte: calculerAlerte(ressource, valeur),
  };

  const nouvelleListe = estAjout
    ? [...donnees, mesure]
    : donnees.map((m) => (m.id === id ? mesure : m));

  enregistrerMesures(nouvelleListe); // sauvegarde + statistiques recalculées
  document.getElementById("fenetre-formulaire").close();
  rafraichir();
  notifier(estAjout ? "Mesure ajoutée." : "Mesure modifiée.");
}

// Delete
function supprimerMesure(id) {
  const mesure = donnees.find((m) => m.id === id);
  const texte = `Supprimer la mesure ${libelleRessource(mesure.ressource)} du ${formaterDate(mesure.date)} (${mesure.batiment}) ?`;
  if (!confirm(texte)) return;

  enregistrerMesures(donnees.filter((m) => m.id !== id));
  rafraichir();
  notifier("Mesure supprimée.");
}
