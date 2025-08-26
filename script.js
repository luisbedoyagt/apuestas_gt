// Datos de ejemplo para equipos por liga
const equiposPorLiga = {
  liga1: ["Equipo A1", "Equipo B1", "Equipo C1"],
  liga2: ["Equipo A2", "Equipo B2", "Equipo C2"]
};

const ligaSelect = document.getElementById("liga");
const localSelect = document.getElementById("equipoLocal");
const visitanteSelect = document.getElementById("equipoVisitante");
const calcularBtn = document.getElementById("calcularBtn");
const resultadoDiv = document.getElementById("resultado");

// Cuando selecciono liga, cargo equipos
ligaSelect.addEventListener("change", () => {
  const liga = ligaSelect.value;
  localSelect.innerHTML = "";
  visitanteSelect.innerHTML = "";

  if (liga && equiposPorLiga[liga]) {
    equiposPorLiga[liga].forEach(eq => {
      let option1 = document.createElement("option");
      option1.value = eq;
      option1.textContent = eq;
      localSelect.appendChild(option1);

      let option2 = document.createElement("option");
      option2.value = eq;
      option2.textContent = eq;
      visitanteSelect.appendChild(option2);
    });
  }
});

// Botón calcular (ejemplo simple)
calcularBtn.addEventListener("click", () => {
  const local = localSelect.value;
  const visitante = visitanteSelect.value;
  const stake = parseFloat(document.getElementById("stake").value);

  if (!local || !visitante || local === visitante) {
    resultadoDiv.innerHTML = `<p style="color:red">⚠️ Selecciona equipos diferentes</p>`;
    return;
  }

  // Ejemplo: probabilidad aleatoria solo para demo
  const probLocal = (Math.random() * 100).toFixed(2);
  const probVisitante = (100 - probLocal).toFixed(2);

  resultadoDiv.innerHTML = `
    <p><strong>${local}</strong> tiene ${probLocal}% de probabilidad.</p>
    <p><strong>${visitante}</strong> tiene ${probVisitante}% de probabilidad.</p>
    <p>Stake usado: ${stake}</p>
  `;
});
