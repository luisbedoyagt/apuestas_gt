const appUrl = "https://script.google.com/macros/s/AKfycby5_wcj6K30HuBiIFaTgnwWdv14uivd-A75qssuYOz2F8l0LEI45-_yCF19vHYwQ-4wgw/exec";

let calendarios = {};
let ligaActual = "";

async function cargarDatos() {
  try {
    const resp = await fetch(appUrl);
    calendarios = await resp.json();
    crearMenuLigas();
  } catch (e) {
    document.getElementById("tabla-calendario").innerHTML = "<p style='text-align:center; color:red;'>Error cargando datos.</p>";
    console.error(e);
  }
}

function crearMenuLigas() {
  const menu = document.getElementById("menu-ligas");
  const select = document.createElement("select");
  select.addEventListener("change", () => {
    ligaActual = select.value;
    mostrarTabla(ligaActual);
  });

  const defaultOption = document.createElement("option");
  defaultOption.textContent = "Seleccione una liga";
  defaultOption.value = "";
  select.appendChild(defaultOption);

  Object.keys(calendarios).forEach(liga => {
    const option = document.createElement("option");
    option.value = liga;
    option.textContent = liga;
    select.appendChild(option);
  });

  menu.appendChild(select);
}

function mostrarTabla(liga) {
  const container = document.getElementById("tabla-calendario");
  container.innerHTML = "";

  if (!liga || !calendarios[liga]) return;

  const tabla = document.createElement("table");
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  const headers = ["Fecha", "Hora", "Local", "Visitante", "Estadio", "Link"];
  headers.forEach(text => {
    const th = document.createElement("th");
    th.textContent = text;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  tabla.appendChild(thead);

  const tbody = document.createElement("tbody");
  calendarios[liga].forEach(partido => {
    const tr = document.createElement("tr");

    tr.appendChild(crearCelda(partido.fecha, "Fecha"));
    tr.appendChild(crearCelda(partido.hora, "Hora"));
    tr.appendChild(crearCelda(partido.local, "Local"));
    tr.appendChild(crearCelda(partido.visitante, "Visitante"));
    tr.appendChild(crearCelda(partido.estadio, "Estadio"));

    const linkTd = document.createElement("td");
    linkTd.setAttribute("data-label", "Link");
    if (partido.link && partido.link !== "#") {
      const a = document.createElement("a");
      a.href = partido.link;
      a.textContent = "Ver partido";
      a.target = "_blank";
      linkTd.appendChild(a);
    } else {
      linkTd.textContent = "-";
    }
    tr.appendChild(linkTd);

    tbody.appendChild(tr);
  });

  tabla.appendChild(tbody);
  container.appendChild(tabla);
}

function crearCelda(texto, label) {
  const td = document.createElement("td");
  td.textContent = texto || "-";
  td.setAttribute("data-label", label);
  return td;
}

// Carga inicial
cargarDatos();
