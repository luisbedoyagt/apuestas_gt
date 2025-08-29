const urlAppWeb = "https://script.google.com/macros/s/AKfycby5_wcj6K30HuBiIFaTgnwWdv14uivd-A75qssuYOz2F8l0LEI45-_yCF19vHYwQ-4wgw/exec";
let datosCalendario = {};

// Cargar los datos al iniciar
window.onload = function() {
  fetch(urlAppWeb)
    .then(res => res.json())
    .then(data => {
      datosCalendario = data;
      llenarSelectLigas();
      mostrarPartidos(); // Mostrar todos al inicio
    })
    .catch(err => {
      console.error("Error cargando datos:", err);
      alert("Error cargando datos.");
    });
};

// Llenar select de ligas
function llenarSelectLigas() {
  const select = document.getElementById("liga");
  for (let liga in datosCalendario) {
    const option = document.createElement("option");
    option.value = liga;
    option.text = liga;
    select.appendChild(option);
  }
}

// Mostrar los partidos según liga seleccionada y fecha
function mostrarPartidos() {
  const tbody = document.getElementById("tabla-partidos").querySelector("tbody");
  tbody.innerHTML = "";

  const ligaSel = document.getElementById("liga").value;
  const fechaSel = document.getElementById("fecha").value;

  for (let liga in datosCalendario) {
    if (ligaSel !== "todas" && liga !== ligaSel) continue;

    datosCalendario[liga].forEach(p => {
      if (fechaSel && p.fecha !== fechaSel) return; // Filtrar por fecha

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${liga}</td>
        <td>${p.fecha}</td>
        <td>${p.hora}</td>
        <td>${p.local}</td>
        <td>${p.visitante}</td>
        <td>${p.estadio}</td>
      `;
      tbody.appendChild(tr);
    });
  }
}

// Filtrar por fecha (botón)
function filtrarPorFecha() {
  mostrarPartidos();
}
