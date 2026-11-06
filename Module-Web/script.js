
let allMeasurements = [];
let chart = null;

const searchInput = document.getElementById("searchInput");
const resourceFilter = document.getElementById("resourceFilter");
const dateFilter = document.getElementById("dateFilter");

// Chargement du fichier JSON
async function loadData() {
    try {
        const response = await fetch("data.json");

        if (!response.ok) {
            throw new Error("Fichier data.json introuvable");
        }

        const data = await response.json();

        if (!Array.isArray(data.mesures)) {
            throw new Error("Format des mesures invalide");
        }

        allMeasurements = data.mesures;

        populateResourceFilter();
        updateDashboard();

    } catch (error) {
        document.getElementById("buildingsContainer").textContent =
            "Erreur : " + error.message;

        console.error(error);
    }
}

// Remplir le filtre des ressources
function populateResourceFilter() {
    const resources = [
        ...new Set(
            allMeasurements.map(item => item.ressource)
        )
    ];

    resourceFilter.innerHTML =
        '<option value="all">Toutes les ressources</option>';

    resources.forEach(resource => {
        const option = document.createElement("option");
        option.value = resource;
        option.textContent = resource;
        resourceFilter.appendChild(option);
    });
}

// Vérifier une anomalie
function isAnomaly(item) {
    const value = item.alerte;

    return value === true ||
           value === 1 ||
           value === "true" ||
           value === "1" ||
           value === "oui" ||
           value === "OUI";
}

// Filtrage des données
function getFilteredData() {
    const search = searchInput.value.toLowerCase().trim();
    const resource = resourceFilter.value;
    const date = dateFilter.value;

    return allMeasurements.filter(item => {

        const matchesBuilding =
            String(item.batiment || "")
                .toLowerCase()
                .includes(search);

        const matchesResource =
            resource === "all" ||
            item.ressource === resource;

        const matchesDate =
            !date || String(item.date || "").startsWith(date);

        return matchesBuilding &&
               matchesResource &&
               matchesDate;
    });
}

// Actualisation du dashboard
function updateDashboard() {
    const data = getFilteredData();

    updateStatistics(data);
    displayBuildings(data);
    displayTable(data);
    updateChart(data);
}

// Statistiques
function updateStatistics(data) {
    const buildings = new Set(
        data.map(item => item.batiment)
    );

    const electricity = data
        .filter(item => item.ressource === "electricite")
        .reduce((sum, item) => sum + Number(item.valeur || 0), 0);

    const alerts = data.filter(isAnomaly).length;

    document.getElementById("buildingCount").textContent =
        buildings.size;

    document.getElementById("measurementCount").textContent =
        data.length;

    document.getElementById("electricityTotal").textContent =
        electricity.toFixed(2);

    document.getElementById("alertCount").textContent =
        alerts;
}

// Afficher les bâtiments
function displayBuildings(data) {
    const container =
        document.getElementById("buildingsContainer");

    const grouped = {};

    data.forEach(item => {
        const name = item.batiment || "Inconnu";

        if (!grouped[name]) {
            grouped[name] = [];
        }

        grouped[name].push(item);
    });

    const entries = Object.entries(grouped);

    if (entries.length === 0) {
        container.textContent = "Aucun résultat trouvé.";
        return;
    }

    container.innerHTML = entries.map(([name, items]) => {

        const alerts = items.filter(isAnomaly).length;

        const resources = [
            ...new Set(items.map(item => item.ressource))
        ];

        return `
            <article class="building-card">
                <h3>🏢 ${escapeHTML(name)}</h3>

                <p><strong>Mesures :</strong> ${items.length}</p>

                <p><strong>Ressources :</strong>
                    ${resources.map(escapeHTML).join(", ")}
                </p>

                <span class="${alerts ? "alert" : "normal"}">
                    ${alerts
                        ? "⚠️ " + alerts + " anomalie(s)"
                        : "✓ Aucune anomalie"}
                </span>
            </article>
        `;
    }).join("");
}

// Protection de l'affichage HTML
function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

// Afficher le tableau
function displayTable(data) {
    const tbody =
        document.getElementById("measurementsTable");

    if (data.length === 0) {
        tbody.innerHTML =
            '<tr><td colspan="6">Aucune donnée disponible</td></tr>';
        return;
    }

    tbody.innerHTML = data.map(item => {

        const anomaly = isAnomaly(item);

        return `
            <tr>
                <td>${escapeHTML(item.batiment ?? "")}</td>
                <td>${escapeHTML(item.ressource ?? "")}</td>
                <td>${escapeHTML(item.valeur ?? "")}</td>
                <td>${escapeHTML(item.unite ?? "")}</td>
                <td>${escapeHTML(item.date ?? "")}</td>
                <td>
                    <span class="${anomaly ? "alert" : "normal"}">
                        ${anomaly ? "⚠️ Anomalie" : "✓ Normal"}
                    </span>
                </td>
            </tr>
        `;
    }).join("");
}

// Graphique de consommation par bâtiment et ressource
function updateChart(data) {
    const grouped = {};

    data.forEach(item => {
        const building = item.batiment || "Inconnu";
        const resource = item.ressource || "Autre";
        const key = building + " - " + resource;

        grouped[key] = (grouped[key] || 0) +
                       Number(item.valeur || 0);
    });

    if (chart) {
        chart.destroy();
    }

    chart = new Chart(
        document.getElementById("consumptionChart"),
        {
            type: "bar",

            data: {
                labels: Object.keys(grouped),

                datasets: [{
                    label: "Consommation",
                    data: Object.values(grouped),
                    backgroundColor: "#24865f",
                    borderRadius: 6
                }]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,

                plugins: {
                    legend: {
                        display: false
                    }
                },

                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        }
    );
}

// Événements
searchInput.addEventListener("input", updateDashboard);

resourceFilter.addEventListener("change", updateDashboard);

dateFilter.addEventListener("change", updateDashboard);

document.getElementById("refreshBtn")
    .addEventListener("click", loadData);

// Démarrage
loadData();

