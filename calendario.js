// Aquí va tu link de Web App
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxSQts94sS2KilDwdqsWT7FVrj9PKUHCWqbdnQkyx8RAbgJ3SwkfKqHVAH7RJHn0OjXWg/exec";

async function cargarCalendario() {
  try {
    const response = await fetch(WEB_APP_URL);
    if (!response.ok) throw new Error("No se pudo obtener la información");
    
    const data = await response.json();
    const contenedor = document.getElementById("calendarios");
    
    for (const liga in data) {
      const divLiga = document.createElement("div");
      divLiga.classList.add("liga");
      divLiga.innerHTML = `<h2>${liga}</h2>`;
      
      data[liga].forEach(partido => {
        const divPartido = document.createElement("div");
        divPartido.classList.add("partido");
        divPartido.innerHTML = `
          <span>${partido.fecha} ${partido.hora}</span>
          <span>${partido.local} vs ${partido.visitante}</span>
          <span>${partido.estadio}</span>
          <a href="${partido.link}" target="_blank">Link</a>
        `;
        divLiga.appendChild(divPartido);
      });
      
      contenedor.appendChild(divLiga);
    }
  } catch (error) {
    console.error(error);
    document.getElementById("calendarios").innerText = "Error cargando los datos.";
  }
}

// Ejecutar al cargar
cargarCalendario();
