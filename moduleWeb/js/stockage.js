// =====================================================================
// stockage.js — Lecture et sauvegarde des données
// ---------------------------------------------------------------------
// data.json : produit par le module C (moduleC/data.json), lu au premier
// lancement puis gardé dans le navigateur (localStorage), avec import / export.
// Comptes utilisateurs : gardés dans le navigateur (localStorage).
// =====================================================================

const CLE_DONNEES = "gc_donnees_v2"; // v2 : nouveau format { mesures, statistiques }
const CLE_SESSION = "gc_session";
const CLE_UTILISATEURS = "gc_utilisateurs";

// Page ouverte en double-clic (adresse file:///) au lieu de http://localhost:3000
const OUVERTE_SANS_SERVEUR = window.location.protocol === "file:";

// ---------- Outils localStorage ----------

function lireLocal(cle) {
  try {
    const texte = localStorage.getItem(cle);
    return texte ? JSON.parse(texte) : null;
  } catch (erreur) {
    return null;
  }
}

function ecrireLocal(cle, valeur) {
  localStorage.setItem(cle, JSON.stringify(valeur));
}

// Charge le contenu d'un fichier : d'abord depuis le navigateur,
// sinon depuis le fichier JSON du projet (premier lancement).
async function chargerFichier(cle, cheminFichier, valeurVide) {
  const sauvegarde = lireLocal(cle);
  if (sauvegarde) return sauvegarde;

  // Sans serveur, on ne tente pas la lecture : l'utilisateur importera le fichier.
  if (OUVERTE_SANS_SERVEUR) return valeurVide;

  try {
    const reponse = await fetch(cheminFichier);
    const contenu = await reponse.json();
    ecrireLocal(cle, contenu);
    return contenu;
  } catch (erreur) {
    // Fichier absent ou JSON invalide
    return valeurVide;
  }
}

// ---------- Données de consommation : { mesures: [...], statistiques: [...] } ----------

// Fichier généré par le module C : ../moduleC/data.json (servi par server.ps1 / server.js)
const CHEMIN_DONNEES = "../moduleC/data.json";

function chargerDonnees() {
  return chargerFichier(CLE_DONNEES, CHEMIN_DONNEES, { mesures: [], statistiques: [] });
}

function sauvegarderDonnees(contenu) {
  ecrireLocal(CLE_DONNEES, contenu);
}

// ---------- Session (utilisateur connecté) ----------

function lireSession() {
  return lireLocal(CLE_SESSION);
}

function ouvrirSession(utilisateur) {
  ecrireLocal(CLE_SESSION, { nom: utilisateur.nom, email: utilisateur.email });
}

function fermerSession() {
  localStorage.removeItem(CLE_SESSION);
}

// ---------- Comptes utilisateurs (localStorage) ----------

// Comptes créés au premier lancement, quand le navigateur n'en a encore aucun
const COMPTES_INITIAUX = [
  { id: 1, nom: "Administrateur", email: "admin@exemple.com", motDePasse: "admin123" },
  { id: 2, nom: "ghofrane mraihi", email: "ghofranemraihi@gmail.com", motDePasse: "ghofrane123" },
];

function lireUtilisateurs() {
  const liste = lireLocal(CLE_UTILISATEURS);
  if (Array.isArray(liste)) return liste;
  ecrireLocal(CLE_UTILISATEURS, COMPTES_INITIAUX);
  return COMPTES_INITIAUX.map((compte) => ({ ...compte }));
}

function ecrireUtilisateurs(liste) {
  ecrireLocal(CLE_UTILISATEURS, liste);
}

function normaliserEmail(email) {
  return String(email || "").trim().toLowerCase();
}

// Connexion : renvoie { nom, email } ou lance une erreur
function connecterUtilisateur(email, motDePasse) {
  const adresse = normaliserEmail(email);
  const utilisateur = lireUtilisateurs().find(
    (u) => normaliserEmail(u.email) === adresse && u.motDePasse === motDePasse
  );
  if (!utilisateur) throw new Error("Email ou mot de passe incorrect.");
  return { nom: utilisateur.nom, email: utilisateur.email };
}

// Inscription : ajoute le compte et renvoie { nom, email }
function inscrireUtilisateur(nom, email, motDePasse) {
  nom = String(nom || "").trim();
  email = normaliserEmail(email);
  motDePasse = String(motDePasse || "");

  if (!nom || !email || motDePasse.length < 6) {
    throw new Error("Nom, email et mot de passe (6 caractères minimum) sont obligatoires.");
  }

  const utilisateurs = lireUtilisateurs();
  if (utilisateurs.some((u) => normaliserEmail(u.email) === email)) {
    throw new Error("Un compte existe déjà avec cet email.");
  }

  utilisateurs.push({ id: prochainId(utilisateurs), nom, email, motDePasse });
  ecrireUtilisateurs(utilisateurs);
  return { nom, email };
}

// Profil : modifie le nom, l'email et / ou le mot de passe.
// Le mot de passe actuel est obligatoire pour enregistrer.
function modifierUtilisateur({ emailActuel, motDePasseActuel, nom, email, nouveauMotDePasse }) {
  nom = String(nom || "").trim();
  email = normaliserEmail(email);
  nouveauMotDePasse = String(nouveauMotDePasse || "");

  const utilisateurs = lireUtilisateurs();
  const utilisateur = utilisateurs.find(
    (u) => normaliserEmail(u.email) === normaliserEmail(emailActuel) && u.motDePasse === motDePasseActuel
  );

  if (!utilisateur) throw new Error("Mot de passe actuel incorrect.");
  if (!nom || !email) throw new Error("Le nom et l'email sont obligatoires.");
  if (nouveauMotDePasse && nouveauMotDePasse.length < 6) {
    throw new Error("Le nouveau mot de passe doit faire 6 caractères minimum.");
  }
  if (utilisateurs.some((u) => normaliserEmail(u.email) === email && u.id !== utilisateur.id)) {
    throw new Error("Un autre compte utilise déjà cet email.");
  }

  utilisateur.nom = nom;
  utilisateur.email = email;
  if (nouveauMotDePasse) utilisateur.motDePasse = nouveauMotDePasse;
  ecrireUtilisateurs(utilisateurs);
  return { nom, email };
}

// ---------- Outils communs ----------

// Prochain identifiant libre : le plus grand id + 1
function prochainId(liste) {
  const ids = liste.map((element) => Number(element.id) || 0);
  return Math.max(0, ...ids) + 1;
}

// Télécharge un contenu sous forme de fichier JSON
function exporterJSON(contenu, nomFichier) {
  const texte = JSON.stringify(contenu, null, 2);
  const fichier = new Blob([texte], { type: "application/json" });
  const lien = document.createElement("a");
  lien.href = URL.createObjectURL(fichier);
  lien.download = nomFichier;
  lien.click();
  setTimeout(() => URL.revokeObjectURL(lien.href), 1000);
}

// Lit un fichier JSON choisi par l'utilisateur et renvoie son contenu
function importerJSON(fichier) {
  return new Promise((resolve, reject) => {
    const lecteur = new FileReader();
    lecteur.onload = () => {
      try {
        resolve(JSON.parse(lecteur.result));
      } catch (erreur) {
        reject(new Error("le fichier n'est pas un JSON valide."));
      }
    };
    lecteur.onerror = () => reject(lecteur.error);
    lecteur.readAsText(fichier);
  });
}

// Protège le texte avant de l'insérer dans le HTML
function echapper(texte) {
  const div = document.createElement("div");
  div.textContent = texte;
  return div.innerHTML;
}
