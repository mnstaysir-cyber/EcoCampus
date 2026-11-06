// EcoCampus – module Web : charge data.json (généré par le module C) et construit le tableau de bord.
"use strict";

const COULEURS = { electricite: "#e0a100", eau: "#1e88c9", gaz: "#d1581f" };
const NOMS = { electricite: "Électricité", eau: "Eau", gaz: "Gaz" };
// Mêmes seuils que seuil_pour() dans analyse.c (affichage uniquement ; l'alerte vient du module C)
const SEUILS = { electricite: 1000, eau: 200, gaz: 300 };
const $ = (id) => document.getElementById(id);

let mesures = [];

// Échappe le texte venant du fichier avant insertion dans le DOM
function esc(s) {
  const d = document.createElement("div");
  d.textContent = String(s);
  return d.innerHTML;
}

// ---------- Chargement ----------
async function charger() {
  try {
    const rep = await fetch("../data.json");
    if (!rep.ok) throw new Error("Fichier data.json introuvable (HTTP " + rep.status + ")");
    traiter(await rep.json());
  } catch (e) {
    // fetch() est bloqué en double-clic (file://) : on propose de choisir le fichier à la main
    afficherMessage("Chargement automatique impossible (" + e.message + "). " +
      "Choisissez data.json ci-dessous, ou lancez le site avec un serveur local.", true);
    $("choix-fichier").hidden = false;
  }
}

// Lecture manuelle du fichier avec FileReader
$("f-fichier").addEventListener("change", (ev) => {
  const fichier = ev.target.files[0];
  if (!fichier) return;
  const lecteur = new FileReader();
  lecteur.onload = () => {
    try { traiter(JSON.parse(lecteur.result)); }
    catch (e) { afficherMessage("Fichier invalide : " + e.message, true); }
  };
  lecteur.onerror = () => afficherMessage("Lecture du fichier impossible.", true);
  lecteur.readAsText(fichier);
});

// Valide les données du module C puis met à jour l'affichage
function traiter(data) {
  try {
    if (!data || !Array.isArray(data.mesures)) throw new Error("Format invalide : tableau « mesures » attendu");
    mesures = data.mesures
      .filter((m) => m && m.batiment && m.ressource && Number.isFinite(Number(m.valeur)))
      .map((m) => ({
        id: m.id,
        batiment: String(m.batiment),
        type: String(m.ressource).toLowerCase(),   // champ « ressource » du JSON
        valeur: Number(m.valeur),
        unite: m.unite || "",
        date: m.date || "",
        alerte: m.alerte === true,                 // calculé par le module C
      }));
    mesures.forEach((m) => { m.seuil = SEUILS[m.type] || 0; });

    const ignorees = data.mesures.length - mesures.length;
    afficherMessage(ignorees > 0 ? ignorees + " mesure(s) invalide(s) ignorée(s)." : "", ignorees > 0);
    $("choix-fichier").hidden = true;
    const dates = mesures.map((m) => m.date).sort();
    if (dates.length) $("maj").textContent = "Mesures du " + dates[0] + " au " + dates[dates.length - 1];

    remplirBatiments();
    rafraichir();
  } catch (e) {
    afficherMessage("Données invalides : " + e.message, true);
  }
}

function afficherMessage(txt, erreur) {
  const el = $("message");
  el.textContent = txt;
  el.classList.toggle("erreur", !!erreur);
}

function remplirBatiments() {
  const noms = [...new Set(mesures.map((m) => m.batiment))].sort();
  $("f-batiment").innerHTML = '<option value="">Tous</option>' +
    noms.map((n) => `<option value="${esc(n)}">${esc(n)}</option>`).join("");
}

// ---------- Filtrage ----------
function filtrer() {
  const txt = $("f-texte").value.trim().toLowerCase();
  const bat = $("f-batiment").value;
  const type = $("f-type").value;
  const debut = $("f-debut").value;
  const fin = $("f-fin").value;
  const seulementAlertes = $("f-alertes").checked;

  return mesures.filter((m) => {
    const jour = m.date.slice(0, 10);
    return (!txt || m.batiment.toLowerCase().includes(txt)) &&
      (!bat || m.batiment === bat) &&
      (!type || m.type === type) &&
      (!debut || jour >= debut) &&
      (!fin || jour <= fin) &&
      (!seulementAlertes || m.alerte);
  });
}

function rafraichir() {
  const liste = filtrer();
  afficherResume(liste);
  afficherCartes(liste);
  afficherTableau(liste);
  dessinerGraphique(liste);
  if (!$("message").classList.contains("erreur")) {
    afficherMessage(liste.length ? "" : "Aucune mesure ne correspond aux filtres.", false);
  }
}

// ---------- Affichage ----------
function afficherResume(liste) {
  $("kpi-mesures").textContent = liste.length;
  $("kpi-batiments").textContent = new Set(liste.map((m) => m.batiment)).size;
  $("kpi-alertes").textContent = liste.filter((m) => m.alerte).length;
}

function statsParBatiment(liste) {
  const g = {};
  for (const m of liste) {
    const s = (g[m.batiment] ||= { nom: m.batiment, total: 0, n: 0, max: -Infinity, min: Infinity, alertes: 0, parType: {} });
    s.total += m.valeur; s.n++;
    s.max = Math.max(s.max, m.valeur); s.min = Math.min(s.min, m.valeur);
    if (m.alerte) s.alertes++;
    s.parType[m.type] = (s.parType[m.type] || 0) + m.valeur;
  }
  return Object.values(g).sort((a, b) => a.nom.localeCompare(b.nom));
}

const fmt = (n) => n.toLocaleString("fr-FR", { maximumFractionDigits: 1 });

function afficherCartes(liste) {
  $("cartes").innerHTML = statsParBatiment(liste).map((s) => `
    <article class="carte ${s.alertes ? "alerte" : ""}">
      <h3>${esc(s.nom)} ${s.alertes ? `<span class="badge">⚠ ${s.alertes} alerte(s)</span>` : ""}</h3>
      <dl>
        <dt>Total</dt><dd>${fmt(s.total)}</dd>
        <dt>Moyenne</dt><dd>${fmt(s.total / s.n)}</dd>
        <dt>Maximum</dt><dd>${fmt(s.max)}</dd>
        <dt>Minimum</dt><dd>${fmt(s.min)}</dd>
        <dt>Mesures</dt><dd>${s.n}</dd>
      </dl>
    </article>`).join("");
}

function afficherTableau(liste) {
  const tri = [...liste].sort((a, b) => b.date.localeCompare(a.date) || (b.id - a.id));
  $("corps").innerHTML = tri.map((m) => `
    <tr class="${m.alerte ? "alerte" : ""}">
      <td>${m.id ?? ""}</td>
      <td>${esc(m.batiment)}</td>
      <td>${esc(NOMS[m.type] || m.type)}</td>
      <td>${esc(m.date)}</td>
      <td class="num">${fmt(m.valeur)} ${esc(m.unite)}</td>
      <td class="num">${m.seuil ? fmt(m.seuil) : "–"}</td>
      <td>${m.alerte ? "⚠ Alerte" : "Normal"}</td>
    </tr>`).join("");
}

// ---------- Graphique (canvas natif : histogramme empilé par ressource) ----------
function dessinerGraphique(liste) {
  const cv = $("graph");
  const ratio = window.devicePixelRatio || 1;
  const L = cv.clientWidth, H = 320;
  cv.width = L * ratio; cv.height = H * ratio;
  const ctx = cv.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, L, H);

  const stats = statsParBatiment(liste);
  const types = Object.keys(COULEURS).filter((t) => stats.some((s) => s.parType[t]));
  $("legende").innerHTML = types.map((t) => `<li><i style="background:${COULEURS[t]}"></i>${NOMS[t]}</li>`).join("");

  ctx.font = "12px Segoe UI, sans-serif";
  if (!stats.length) { ctx.fillStyle = "#5b7470"; ctx.fillText("Aucune donnée à afficher", 20, 30); return; }

  const marge = { g: 55, d: 10, h: 15, b: 40 };
  const w = L - marge.g - marge.d, h = H - marge.h - marge.b;
  const maxVal = Math.max(...stats.map((s) => s.total)) * 1.1 || 1;

  // axe Y
  ctx.strokeStyle = "#d3dfdc"; ctx.fillStyle = "#5b7470"; ctx.textAlign = "right";
  for (let i = 0; i <= 4; i++) {
    const y = marge.h + h - (h * i) / 4;
    ctx.beginPath(); ctx.moveTo(marge.g, y); ctx.lineTo(L - marge.d, y); ctx.stroke();
    ctx.fillText(fmt((maxVal * i) / 4), marge.g - 6, y + 4);
  }

  // barres empilées
  const pas = w / stats.length, largeur = Math.min(pas * 0.6, 70);
  ctx.textAlign = "center";
  stats.forEach((s, i) => {
    const x = marge.g + pas * i + (pas - largeur) / 2;
    let y = marge.h + h;
    for (const t of types) {
      const bh = ((s.parType[t] || 0) / maxVal) * h;
      ctx.fillStyle = COULEURS[t];
      ctx.fillRect(x, y - bh, largeur, bh);
      y -= bh;
    }
    ctx.fillStyle = s.alertes ? "#c62828" : "#14302b";
    const nom = s.nom.length > 14 ? s.nom.slice(0, 13) + "…" : s.nom;
    ctx.fillText((s.alertes ? "⚠ " : "") + nom, x + largeur / 2, H - 15);
  });
}

// ---------- Événements ----------
["f-texte", "f-batiment", "f-type", "f-debut", "f-fin", "f-alertes"].forEach((id) =>
  $(id).addEventListener("input", rafraichir));
$("f-reset").addEventListener("click", () => {
  document.querySelectorAll(".filtres input, .filtres select").forEach((el) => {
    if (el.type === "checkbox") el.checked = false; else el.value = "";
  });
  rafraichir();
});
window.addEventListener("resize", () => dessinerGraphique(filtrer()));

charger();
