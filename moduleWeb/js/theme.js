// =====================================================================
// theme.js — Mode clair / mode sombre
// ---------------------------------------------------------------------
// Chargé dans le <head> pour appliquer le thème avant l'affichage.
// Choix gardé dans le navigateur (localStorage, clé gc_theme).
// Sans choix enregistré : on suit le réglage du système.
// =====================================================================

const CLE_THEME = "gc_theme";

function themeEnregistre() {
  try {
    const theme = localStorage.getItem(CLE_THEME);
    return theme === "dark" || theme === "light" ? theme : null;
  } catch (erreur) {
    return null;
  }
}

function themeSysteme() {
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function themeActuel() {
  return document.documentElement.dataset.theme || "light";
}

function appliquerTheme(theme) {
  document.documentElement.dataset.theme = theme;
  // Met à jour le texte des boutons de thème présents dans la page
  document.querySelectorAll("[data-bouton-theme]").forEach((bouton) => {
    const sombre = theme === "dark";
    bouton.querySelector(".icone-theme").textContent = sombre ? "☀" : "☾";
    bouton.querySelector(".texte-theme").textContent = sombre ? "Mode clair" : "Mode sombre";
    bouton.setAttribute("aria-pressed", String(sombre));
  });
  // Le graphique est dessiné avec les couleurs du thème : on le redessine
  document.dispatchEvent(new CustomEvent("changement-theme"));
}

function basculerTheme() {
  const nouveau = themeActuel() === "dark" ? "light" : "dark";
  try {
    localStorage.setItem(CLE_THEME, nouveau);
  } catch (erreur) {
    // localStorage indisponible : le choix vaut pour cette page seulement
  }
  appliquerTheme(nouveau);
}

// 1. Tout de suite (avant l'affichage) : thème choisi, sinon celui du système
document.documentElement.dataset.theme = themeEnregistre() || themeSysteme();

// 2. Quand la page est prête : brancher les boutons
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-bouton-theme]").forEach((bouton) => {
    bouton.addEventListener("click", basculerTheme);
  });
  appliquerTheme(themeActuel());
});

// 3. Le système change de thème et l'utilisateur n'a rien choisi : on suit
if (window.matchMedia) {
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (!themeEnregistre()) appliquerTheme(themeSysteme());
  });
}
