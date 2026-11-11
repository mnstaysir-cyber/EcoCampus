// =====================================================================
// graphique.js — F7 : graphique de consommation par mois (ou par jour)
// ---------------------------------------------------------------------
// Dessiné avec l'API <canvas> du navigateur : aucune bibliothèque
// externe, aucun lien internet. Les couleurs viennent des variables
// CSS (--elec, --eau, --gaz...), donc suivent le mode clair / sombre.
// =====================================================================

// Variable CSS de chaque ressource
const VARIABLES_COULEUR = { electricite: "--elec", eau: "--eau", gaz: "--gaz" };

// Derniers éléments dessinés (pour redessiner et pour l'info-bulle)
let dernieresMesures = null; // null : données pas encore chargées
let barresDessinees = [];

// "2026-03" -> "mars 2026"
function nomMois(anneeMois) {
  return new Date(anneeMois + "-01T00:00:00")
    .toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

// Lit une variable CSS du thème actuel
function couleurTheme(variable) {
  return getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
}

// Graduation « ronde » de l'axe vertical : 1, 2, 2.5 ou 5 × 10^n
function pasGraduation(maximum, nbTraits) {
  const brut = maximum / nbTraits;
  const puissance = Math.pow(10, Math.floor(Math.log10(brut)));
  const pas = [1, 2, 2.5, 5, 10].find((p) => p * puissance >= brut);
  return pas * puissance;
}

// Prépare les données : périodes (axe X) et une série par ressource
function preparerSeries(mesures) {
  // Regroupement par jour (AAAA-MM-JJ) si un seul mois, sinon par mois (AAAA-MM)
  const nbMois = new Set(mesures.map((m) => m.date.slice(0, 7))).size;
  const parJour = nbMois <= 1;
  const periode = (m) => (parJour ? m.date : m.date.slice(0, 7));

  const periodes = [...new Set(mesures.map(periode))].sort();
  const ressources = listeRessources().filter((code) => mesures.some((m) => m.ressource === code));

  const series = ressources.map((code) => ({
    code,
    libelle: `${libelleRessource(code)} (${formaterUnite(UNITES[code])})`,
    valeurs: periodes.map((p) =>
      mesures
        .filter((m) => m.ressource === code && periode(m) === p)
        .reduce((somme, m) => somme + m.valeur, 0)
    ),
  }));

  const etiquettes = periodes.map((p) => (parJour ? formaterDate(p) : nomMois(p)));
  return { parJour, etiquettes, series };
}

function afficherLegende(series) {
  document.getElementById("legende-graphique").innerHTML = series
    .map((s) => `<li class="ressource ressource-${classeRessource(s.code)}">${echapper(s.libelle)}</li>`)
    .join("");
}

function dessinerGraphique(mesures) {
  dernieresMesures = mesures;
  const canvas = document.getElementById("graphique");
  if (!canvas) return;

  const { parJour, etiquettes, series } = preparerSeries(mesures);
  document.getElementById("titre-graphique").textContent =
    parJour ? "Consommation par jour" : "Consommation par mois";
  afficherLegende(series);

  // Taille réelle en pixels (écrans haute densité inclus)
  const largeur = canvas.clientWidth;
  const hauteur = canvas.clientHeight;
  if (!largeur || !hauteur) return; // vue cachée : on dessinera à l'affichage
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(largeur * ratio);
  canvas.height = Math.round(hauteur * ratio);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, largeur, hauteur);

  const police = getComputedStyle(document.body).fontFamily;
  const couleurTexte = couleurTheme("--encre-douce");
  const couleurLigne = couleurTheme("--ligne");
  barresDessinees = [];

  if (etiquettes.length === 0) {
    ctx.fillStyle = couleurTexte;
    ctx.font = `14px ${police}`;
    ctx.textAlign = "center";
    ctx.fillText("Aucune mesure pour ces filtres.", largeur / 2, hauteur / 2);
    return;
  }

  // Axe vertical : maximum arrondi à une graduation
  const maxValeur = Math.max(1, ...series.flatMap((s) => s.valeurs));
  const pas = pasGraduation(maxValeur, 5);
  const maxAxe = Math.ceil(maxValeur / pas) * pas;

  // Marges : à gauche selon la largeur du plus long nombre
  ctx.font = `12px ${police}`;
  const largeurNombres = Math.max(...[0, maxAxe].map((v) => ctx.measureText(formaterNombre(v)).width));
  const zone = { gauche: largeurNombres + 14, droite: largeur - 8, haut: 10, bas: hauteur - 28 };
  const hauteurZone = zone.bas - zone.haut;
  const y = (valeur) => zone.bas - (valeur / maxAxe) * hauteurZone;

  // Lignes horizontales et nombres de l'axe
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 1;
  for (let v = 0; v <= maxAxe + pas / 2; v += pas) {
    const yLigne = Math.round(y(v)) + 0.5;
    ctx.strokeStyle = couleurLigne;
    ctx.beginPath();
    ctx.moveTo(zone.gauche, yLigne);
    ctx.lineTo(zone.droite, yLigne);
    ctx.stroke();
    ctx.fillStyle = couleurTexte;
    ctx.fillText(formaterNombre(v), zone.gauche - 6, yLigne);
  }

  // Barres groupées : un groupe par période, une barre par ressource
  const largeurGroupe = (zone.droite - zone.gauche) / etiquettes.length;
  const largeurBarre = Math.min(42, (largeurGroupe * 0.75) / Math.max(1, series.length));
  const debutGroupe = (largeurGroupe - largeurBarre * series.length) / 2;

  etiquettes.forEach((etiquette, i) => {
    const xGroupe = zone.gauche + i * largeurGroupe;

    series.forEach((serie, j) => {
      const valeur = serie.valeurs[i];
      const x = xGroupe + debutGroupe + j * largeurBarre;
      const haut = y(valeur);
      ctx.fillStyle = couleurTheme(VARIABLES_COULEUR[serie.code] || "--encre-douce");
      ctx.fillRect(x + 1, haut, largeurBarre - 2, zone.bas - haut);
      barresDessinees.push({ x, largeur: largeurBarre, haut, bas: zone.bas, serie, etiquette, valeur });
    });

    // Étiquette de la période, sous le groupe
    ctx.fillStyle = couleurTexte;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(etiquette, xGroupe + largeurGroupe / 2, zone.bas + 8, largeurGroupe - 4);
  });
}

// ---------- Info-bulle au survol d'une barre ----------

function afficherInfoBulle(evenement) {
  const canvas = evenement.currentTarget;
  const bulle = document.getElementById("info-graphique");
  const cadre = canvas.getBoundingClientRect();
  const x = evenement.clientX - cadre.left;
  const yPos = evenement.clientY - cadre.top;

  const barre = barresDessinees.find((b) => x >= b.x && x <= b.x + b.largeur && yPos >= b.haut && yPos <= b.bas);
  if (!barre) {
    bulle.hidden = true;
    return;
  }
  bulle.textContent = `${barre.etiquette} — ${barre.serie.libelle} : ${formaterNombre(barre.valeur)}`;
  bulle.hidden = false;
  // Reste dans la zone du graphique
  const gauche = Math.min(x + 12, cadre.width - bulle.offsetWidth - 4);
  bulle.style.left = Math.max(4, gauche) + "px";
  bulle.style.top = Math.max(4, yPos - bulle.offsetHeight - 8) + "px";
}

// ---------- Branchements ----------

document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("graphique");
  if (!canvas) return;

  const bulle = document.createElement("div");
  bulle.id = "info-graphique";
  bulle.className = "info-graphique";
  bulle.hidden = true;
  canvas.parentElement.appendChild(bulle);

  canvas.addEventListener("mousemove", afficherInfoBulle);
  canvas.addEventListener("mouseleave", () => (bulle.hidden = true));

  // Redessiner quand la taille change (fenêtre, menu, retour sur la vue)
  new ResizeObserver(redessiner).observe(canvas);
});

// Redessiner avec les couleurs du nouveau thème
document.addEventListener("changement-theme", redessiner);

function redessiner() {
  if (dernieresMesures) dessinerGraphique(dernieresMesures);
}
