// =====================================================================
// profil.js — Vue « Mon profil »
// Affiche le nom et l'email du compte connecté, et permet de les
// modifier (ainsi que le mot de passe) dans le localStorage.
// =====================================================================

function initialiserProfil() {
  document.getElementById("form-profil").addEventListener("submit", enregistrerProfil);
  document.getElementById("profil-annuler").addEventListener("click", remplirProfil);
  remplirProfil();
}

// "Ghofrane Mraihi" -> "GM"
function initiales(nom) {
  const mots = nom.split(/\s+/).filter(Boolean).slice(0, 2);
  return mots.map((mot) => mot[0].toUpperCase()).join("") || "?";
}

// Affiche les informations du compte connecté et remet le formulaire à zéro
function remplirProfil() {
  const session = lireSession();

  document.getElementById("profil-initiales").textContent = initiales(session.nom);
  document.getElementById("profil-nom").textContent = session.nom;
  document.getElementById("profil-email").textContent = session.email;
  document.getElementById("nom-utilisateur").textContent = session.nom;

  document.getElementById("profil-champ-nom").value = session.nom;
  document.getElementById("profil-champ-email").value = session.email;
  ["profil-nouveau-mdp", "profil-confirmation", "profil-mdp-actuel"]
    .forEach((id) => (document.getElementById(id).value = ""));
  document.getElementById("profil-message").hidden = true;
}

function messageProfil(texte, type) {
  const zone = document.getElementById("profil-message");
  zone.textContent = texte;
  zone.className = "message " + type;
  zone.hidden = false;
}

// Enregistre les modifications du compte dans le localStorage
function enregistrerProfil(evenement) {
  evenement.preventDefault();
  const nouveauMotDePasse = document.getElementById("profil-nouveau-mdp").value;

  if (nouveauMotDePasse !== document.getElementById("profil-confirmation").value) {
    messageProfil("Les deux nouveaux mots de passe ne sont pas identiques.", "erreur");
    return;
  }

  try {
    const compte = modifierUtilisateur({
      emailActuel: lireSession().email,
      motDePasseActuel: document.getElementById("profil-mdp-actuel").value,
      nom: document.getElementById("profil-champ-nom").value.trim(),
      email: document.getElementById("profil-champ-email").value.trim(),
      nouveauMotDePasse: nouveauMotDePasse,
    });

    ouvrirSession(compte); // la session suit le nouveau nom / email
    remplirProfil();
    messageProfil("Profil mis à jour.", "succes");
  } catch (erreur) {
    messageProfil(erreur.message, "erreur");
  }
}
