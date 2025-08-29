// URL de tu Web App (debe devolver JSON con todos los partidos)
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxSQts94sS2KilDwdqsWT7FVrj9PKUHCWqbdnQkyx8RAbgJ3SwkfKqHVAH7RJHn0OjXWg/exec";

let datosCalendario = {}; // Guardamos todo aquí

// Cargar datos del WebApp
async function cargarDatos() {
  try {
    const resp = await fetch(WEB_APP_URL);
    datosCalendario = await resp.json();
    crearMenuLigas(Object.keys(datosCalendario));
  } catch (err) {
    console.error(err);
    document.getElementById("calendarios").innerHTML = "Error cargando datos.";
  }
}

// Crear menú lateral de ligas
function crearMenuLigas(ligas) {
  const menu = document.getElementById("menu-ligas");
  menu.innerHTML = "";

  ligas.forEach(liga => {
    const btn = document.createElement("button");
    btn.textContent = liga;
    btn.onclick = () => mostrarLiga(liga);
    menu.appendChild(btn);
  });
}

// Mostrar partidos de una liga
function mostrarLiga(liga) {
  const contenedor = document.getElementById("calendarios");
  contenedor.innerHTML = `<h2>${liga}</h2>`;

  if (!datosCalendario[liga] || datosCalendario[liga].length === 0) {
    contenedor.innerHTML += "<p>No hay partidos disponibles.</p>";
    return;
  }

  datosCalendario[liga].forEach(p => {
    const div = document.createElement("div");
    div.className = "partido";
    div.innerHTML = `
      <span><strong>${p.fecha} ${p.hora}</strong></span>
      <span>${p.local} vs ${p.visitante}</span>
      <span>${p.estadio}</span>
      <a href="${p.link}" target="_blank">Ver más</a>
    `;
    contenedor.appendChild(div);
  });
}

// Ejecutar al cargar
cargarDatos();
