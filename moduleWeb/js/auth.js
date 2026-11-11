// =====================================================================
// auth.js — Connexion et inscription (page login.html)
// Les comptes sont lus et écrits dans le localStorage (voir stockage.js).
// =====================================================================

document.addEventListener("DOMContentLoaded", () => {
  // Déjà connecté ? On va directement au tableau de bord.
  if (lireSession()) {
    window.location.href = "index.html";
    return;
  }

  document.getElementById("form-connexion").addEventListener("submit", seConnecter);
  document.getElementById("form-inscription").addEventListener("submit", sInscrire);
  document.querySelectorAll("[data-onglet]").forEach((bouton) => {
    bouton.addEventListener("click", () => changerOnglet(bouton.dataset.onglet));
  });
});

// ---------------------------------------------------------------------
// Affichage
// ---------------------------------------------------------------------
function changerOnglet(nom) {
  document.getElementById("form-connexion").hidden = nom !== "connexion";
  document.getElementById("form-inscription").hidden = nom !== "inscription";
  document.querySelectorAll("[data-onglet]").forEach((bouton) => {
    bouton.classList.toggle("actif", bouton.dataset.onglet === nom);
  });
  document.getElementById("message").hidden = true;
}

function afficherMessage(texte, type) {
  const zone = document.getElementById("message");
  zone.textContent = texte;
  zone.className = "message " + type;
  zone.hidden = false;
}

function valeur(id) {
  return document.getElementById(id).value.trim();
}

// ---------------------------------------------------------------------
// Connexion : vérifie l'email et le mot de passe dans le localStorage
// ---------------------------------------------------------------------
function seConnecter(evenement) {
  evenement.preventDefault();
  try {
    const utilisateur = connecterUtilisateur(
      valeur("connexion-email"),
      document.getElementById("connexion-mdp").value
    );
    ouvrirSession(utilisateur);
    window.location.href = "index.html";
  } catch (erreur) {
    afficherMessage(erreur.message, "erreur");
  }
}

// ---------------------------------------------------------------------
// Inscription : ajoute le compte dans le localStorage
// ---------------------------------------------------------------------
function sInscrire(evenement) {
  evenement.preventDefault();
  const email = valeur("inscription-email");
  const motDePasse = document.getElementById("inscription-mdp").value;

  if (motDePasse !== document.getElementById("inscription-confirmation").value) {
    afficherMessage("Les deux mots de passe ne sont pas identiques.", "erreur");
    return;
  }

  try {
    inscrireUtilisateur(valeur("inscription-nom"), email, motDePasse);
    evenement.target.reset();
    changerOnglet("connexion");
    document.getElementById("connexion-email").value = email;
    afficherMessage("Compte créé. Connectez-vous.", "succes");
  } catch (erreur) {
    afficherMessage(erreur.message, "erreur");
  }
}
