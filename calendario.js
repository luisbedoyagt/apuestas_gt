document.addEventListener("DOMContentLoaded", async () => {
  const contenedor = document.getElementById("contenedor");

  try {
    // Tu Web App que devuelve el JSON
    const response = await fetch("https://script.google.com/macros/s/AKfycby5_wcj6K30HuBiIFaTgnwWdv14uivd-A75qssuYOz2F8l0LEI45-_yCF19vHYwQ-4wgw/exec");
    const data = await response.json();

    for (const liga in data) {
      const partidos = data[liga];

      // Crear contenedor de liga
      const divLiga = document.createElement("div");
      divLiga.className = "liga";

      const titulo = document.createElement("h2");
      titulo.textContent = liga.replace(/_/g, " ");
      divLiga.appendChild(titulo);

      if (partidos.length && !partidos[0].error) {
        const tabla = document.createElement("table");

        const thead = document.createElement("thead");
        thead.innerHTML = `
          <tr>
            <th>Fecha</th>
            <th>Hora</th>
            <th>Local</th>
            <th>Visitante</th>
            <th>Estadio</th>
            <th>Link</th>
          </tr>
        `;
        tabla.appendChild(thead);

        const tbody = document.createElement("tbody");

        partidos.forEach(p => {
          const fila = document.createElement("tr");
          fila.innerHTML = `
            <td>${p.fecha}</td>
            <td>${p.hora}</td>
            <td>${p.local}</td>
            <td>${p.visitante}</td>
            <td>${p.estadio}</td>
            <td><a href="${p.link}" target="_blank">Ver</a></td>
          `;
          tbody.appendChild(fila);
        });

        tabla.appendChild(tbody);
        divLiga.appendChild(tabla);
      } else {
        const errorMsg = document.createElement("p");
        errorMsg.textContent = "❌ No se pudo cargar esta liga";
        divLiga.appendChild(errorMsg);
      }

      contenedor.appendChild(divLiga);
    }
  } catch (error) {
    contenedor.innerHTML = `<p style="color:red;">Error cargando datos: ${error}</p>`;
  }
});
