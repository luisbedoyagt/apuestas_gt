const endpoint = "https://script.google.com/macros/s/AKfycbxSQts94sS2KilDwdqsWT7FVrj9PKUHCWqbdnQkyx8RAbgJ3SwkfKqHVAH7RJHn0OjXWg/exec";

async function cargarCalendario() {
  try {
    const response = await fetch(endpoint);
    const data = await response.json();

    const container = document.getElementById("calendario-container");
    container.innerHTML = ""; // Limpiar contenedor

    for (const liga in data) {
      const partidos = data[liga];
      if (!partidos || !partidos.length) continue;

      const ligaDiv = document.createElement("div");
      ligaDiv.classList.add("liga");

      const h2 = document.createElement("h2");
      h2.textContent = liga;
      ligaDiv.appendChild(h2);

      const table = document.createElement("table");
      table.classList.add("tabla-calendario");

      const thead = document.createElement("thead");
      const headerRow = document.createElement("tr");
      ["Fecha", "Hora", "Local", "Visitante", "Estadio", "Link"].forEach(text => {
        const th = document.createElement("th");
        th.textContent = text;
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);
      table.appendChild(thead);

      const tbody = document.createElement("tbody");
      partidos.forEach(partido => {
        const tr = document.createElement("tr");
        const link = partido.link ? `<a href="${partido.link}" target="_blank">Ver</a>` : "";
        [partido.fecha, partido.hora, partido.local, partido.visitante, partido.estadio, link].forEach(value => {
          const td = document.createElement("td");
          td.innerHTML = value;
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });

      table.appendChild(tbody);
      ligaDiv.appendChild(table);
      container.appendChild(ligaDiv);
    }
  } catch (error) {
    console.error("Error cargando calendario:", error);
  }
}

// Ejecutar al cargar la página
document.addEventListener("DOMContentLoaded", cargarCalendario);

