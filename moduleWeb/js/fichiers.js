// =====================================================================
// fichiers.js — Lire et écrire directement user.json et data.json
// ---------------------------------------------------------------------
// Utilise l'API « File System Access » (Chrome et Edge) :
// 1. la première fois, l'utilisateur choisit le dossier data/ du projet ;
// 2. le lien vers ce dossier (la « poignée ») est gardé dans IndexedDB ;
// 3. ensuite, l'application lit et écrit les fichiers JSON de ce dossier,
//    comme une petite base de données locale.
// =====================================================================

const API_FICHIERS_DISPONIBLE = "showDirectoryPicker" in window;

// ---------- Mémoriser le dossier choisi (IndexedDB) ----------

function ouvrirBase() {
  return new Promise((resolve, reject) => {
    const requete = indexedDB.open("gc_fichiers", 1);
    requete.onupgradeneeded = () => requete.result.createObjectStore("poignees");
    requete.onsuccess = () => resolve(requete.result);
    requete.onerror = () => reject(requete.error);
  });
}

async function lirePoignee() {
  const base = await ouvrirBase();
  return new Promise((resolve) => {
    const requete = base.transaction("poignees").objectStore("poignees").get("dossier-data");
    requete.onsuccess = () => resolve(requete.result || null);
    requete.onerror = () => resolve(null);
  });
}

async function memoriserPoignee(poignee) {
  const base = await ouvrirBase();
  return new Promise((resolve, reject) => {
    const transaction = base.transaction("poignees", "readwrite");
    transaction.objectStore("poignees").put(poignee, "dossier-data");
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

// ---------- Choisir le dossier et obtenir l'autorisation ----------

// Ouvre la fenêtre de choix du dossier (doit suivre un clic de l'utilisateur)
async function choisirDossierData() {
  const dossier = await window.showDirectoryPicker({ id: "dossier-data", mode: "readwrite" });

  // Vérifie qu'il s'agit bien du dossier data/ du projet
  if (!(await contientFichier(dossier, "user.json")) && !(await contientFichier(dossier, "data.json"))) {
    throw new Error("Ce dossier ne contient ni user.json ni data.json. Choisissez le dossier data du projet.");
  }

  await memoriserPoignee(dossier);
  return dossier;
}

async function contientFichier(dossier, nom) {
  try {
    await dossier.getFileHandle(nom);
    return true;
  } catch (erreur) {
    return false;
  }
}

// Vérifie le droit de lire et modifier le dossier.
// avecDemande = true : affiche la demande d'autorisation (après un clic seulement).
async function autoriserDossier(dossier, avecDemande) {
  const options = { mode: "readwrite" };
  if ((await dossier.queryPermission(options)) === "granted") return true;
  if (!avecDemande) return false;
  return (await dossier.requestPermission(options)) === "granted";
}

// ---------- Lire et écrire un fichier JSON du dossier ----------

async function lireJSON(dossier, nom, valeurVide) {
  if (!(await contientFichier(dossier, nom))) return valeurVide;
  const fichier = await (await dossier.getFileHandle(nom)).getFile();
  const texte = await fichier.text();
  return texte.trim() ? JSON.parse(texte) : valeurVide;
}

async function ecrireJSON(dossier, nom, contenu) {
  const poignee = await dossier.getFileHandle(nom, { create: true });
  const flux = await poignee.createWritable();
  await flux.write(JSON.stringify(contenu, null, 2));
  await flux.close();
}
