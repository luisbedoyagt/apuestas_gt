const appWeb = "https://script.google.com/macros/s/AKfycbw2yXHIfjmnvtMCP0m4KK2RdZJXPTpc0IQXXlYEIKbcdtb3FWMAUD8pfsPWyHwR-aUscQ/exec";
let datosCalendario = {};

// Cargar datos desde la app web
async function cargarDatos() {
  try {
    const response = await fetch(appWeb);
    datosCalendario = await response.json();
    llenarSelectorLigas();
    filtrarPorFecha();
  } catch (err) {
    document.getElementById("partidos-container").innerHTML = "<p>Error cargando datos.</p>";
    console.error(err);
  }
}

// Llenar selector de ligas
function llenarSelectorLigas() {
  const ligaSelect = document.getElementById("liga");
  Object.keys(datosCalendario).forEach(liga => {
    const option = document.createElement("option");
    option.value = liga;
    option.textContent = liga;
    ligaSelect.appendChild(option);
  });
}

// Filtrar partidos por fecha y liga
function filtrarPorFecha() {
  const fecha = document.getElementById("fecha").value;
  const liga = document.getElementById("liga").value;
  const container = document.getElementById("partidos-container");
  container.innerHTML = "";

  if (!fecha) {
    container.innerHTML = "<p>Selecciona una fecha para ver los partidos.</p>";
    return;
  }

  let partidos = [];
  for (let key in datosCalendario) {
    if (liga !== "todas" && key !== liga) continue;
    partidos = partidos.concat(datosCalendario[key].filter(p => p.fecha === fecha));
  }

  if (partidos.length === 0) {
    container.innerHTML = "<p>No hay partidos para esta fecha.</p>";
    return;
  }

  partidos.sort((a,b) => a.hora.localeCompare(b.hora));

  partidos.forEach(p => {
    const card = document.createElement("div");
    card.className = "partido-card";
    card.innerHTML = `
      <h3>${p.local} vs ${p.visitante}</h3>
      <p><strong>Hora:</strong> ${p.hora} | <strong>Estadio:</strong> ${p.estadio}</p>
    `;
    container.appendChild(card);
  });
}

// Inicializar
document.addEventListener("DOMContentLoaded", cargarDatos);
