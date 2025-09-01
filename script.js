/**
 * @fileoverview Script para interfaz web que muestra estadísticas de fútbol y calcula probabilidades de partidos
 *               usando datos de una API de Google Apps Script. Usa únicamente el método heurístico.
 */

// ----------------------
// UTILIDADES
// ----------------------
const $ = id => document.getElementById(id);
const formatPct = x => (100 * (isFinite(x) ? x : 0)).toFixed(1) + '%';
const formatDec = x => (isFinite(x) ? x.toFixed(2) : '0.00');
const parseNumberString = val => {
  const s = String(val || '').replace(/,/g, '.');
  const n = Number(s);
  return isFinite(n) ? n : 0;
};

// ----------------------
// CONFIGURACIÓN DE LIGAS
// ----------------------
const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbwSADRBlp8XhO4saDNPxb_CqnMNCTnXTUn4JTc-VLbleyV-AAFCY93tOhL7n-SjKWgXXw/exec"; 
let teamsByLeague = {};
let allData = {};

const leagueNames = {
  "esp.1": "LaLiga España",
  "esp.2": "Segunda España",
  "eng.1": "Premier League Inglaterra",
  "eng.2": "Championship Inglaterra",
  "ita.1": "Serie A Italia",
  "ger.1": "Bundesliga Alemania",
  "fra.1": "Ligue 1 Francia",
  "ned.1": "Eredivisie Países Bajos",
  "ned.2": "Eerste Divisie Países Bajos",
  "por.1": "Liga Portugal",
  "mex.1": "Liga MX México",
  "usa.1": "MLS Estados Unidos",
  "bra.1": "Brasileirão Brasil",
  "gua.1": "Liga Nacional Guatemala",
  "crc.1": "Liga Promerica Costa Rica",
  "hon.1": "Liga Nacional Honduras",
  "ksa.1": "Pro League Arabia Saudita"
};

const leagueCodeToName = {
  "esp.1": "España_LaLiga",
  "esp.2": "España_Segunda",
  "eng.1": "Inglaterra_PremierLeague",
  "eng.2": "Inglaterra_Championship",
  "ita.1": "Italia_SerieA",
  "ger.1": "Alemania_Bundesliga",
  "fra.1": "Francia_Ligue1",
  "ned.1": "PaísesBajos_Eredivisie",
  "ned.2": "PaísesBajos_EersteDivisie",
  "por.1": "Portugal_LigaPortugal",
  "mex.1": "México_LigaMX",
  "usa.1": "EstadosUnidos_MLS",
  "bra.1": "Brasil_Brasileirao",
  "gua.1": "Guatemala_LigaNacional",
  "crc.1": "CostaRica_LigaPromerica",
  "hon.1": "Honduras_LigaNacional",
  "ksa.1": "Arabia_Saudi_ProLeague"
};

// ----------------------
// NORMALIZACIÓN DE DATOS
// ----------------------
function normalizeTeam(raw) {
  if (!raw) return null;
  const r = {};
  r.name = raw.name || '';
  if (!r.name) return null;
  r.pos = parseNumberString(raw.rank || 0);
  r.gf = parseNumberString(raw.goalsFor || 0);
  r.ga = parseNumberString(raw.goalsAgainst || 0);
  r.pj = parseNumberString(raw.gamesPlayed || 0);
  r.g = parseNumberString(raw.wins || 0);
  r.e = parseNumberString(raw.ties || 0);
  r.p = parseNumberString(raw.losses || 0);
  r.points = parseNumberString(raw.points || (r.g * 3 + r.e) || 0);
  r.gfHome = parseNumberString(raw.goalsForHome || 0);
  r.gfAway = parseNumberString(raw.goalsForAway || 0);
  r.gaHome = parseNumberString(raw.goalsAgainstHome || 0);
  r.gaAway = parseNumberString(raw.goalsAgainstAway || 0);
  r.pjHome = parseNumberString(raw.gamesPlayedHome || 0);
  r.pjAway = parseNumberString(raw.gamesPlayedAway || 0);
  r.winsHome = parseNumberString(raw.winsHome || 0);
  r.winsAway = parseNumberString(raw.winsAway || 0);
  r.tiesHome = parseNumberString(raw.tiesHome || 0);
  r.tiesAway = parseNumberString(raw.tiesAway || 0);
  r.lossesHome = parseNumberString(raw.lossesHome || 0);
  r.lossesAway = parseNumberString(raw.lossesAway || 0);
  r.logoUrl = raw.logoUrl || '';
  return r;
}

// ----------------------
// FETCH DATOS COMPLETOS
// ----------------------
async function fetchAllData() {
  const leagueSelect = $('leagueSelect');
  if (leagueSelect) leagueSelect.innerHTML = '<option value="">Cargando datos...</option>';

  try {
    const res = await fetch(`${WEBAPP_URL}?tipo=todo&update=false`);
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Error HTTP ${res.status}: ${res.statusText}. Respuesta: ${errorText}`);
    }
    allData = await res.json();

    // Depuración: Mostrar datos crudos
    console.log('Datos recibidos de la API:', JSON.stringify(allData, null, 2));

    // Verificar estructura de datos
    if (!allData.calendario || !allData.ligas) {
      throw new Error('Estructura de datos inválida: faltan "calendario" o "ligas"');
    }

    const normalized = {};
    for (const key in allData.ligas) {
      normalized[key] = (allData.ligas[key] || []).map(normalizeTeam).filter(t => t && t.name);
    }
    teamsByLeague = normalized;

    localStorage.setItem('allData', JSON.stringify(allData));
    return allData;
  } catch (err) {
    console.error('Error en fetchAllData:', err);
    const errorMsg = `<div class="error"><strong>Error:</strong> No se pudieron cargar los datos de la API. Verifica la conexión a la hoja de Google Sheets o el endpoint de la API. Detalle: ${err.message}</div>`;
    $('details').innerHTML = errorMsg;
    if (leagueSelect) leagueSelect.innerHTML = '<option value="">Error al cargar ligas</option>';
    return {};
  }
}

// ----------------------
// MUESTRA DE EVENTOS FUTUROS
// ----------------------
function displayUpcomingEvents() {
  const upcomingEventsList = $('upcoming-events-list');
  if (!upcomingEventsList) return;

  const allEvents = [];
  if (allData.calendario) {
    for (const liga in allData.calendario) {
      allData.calendario[liga].forEach(event => {
        let eventDateTime;
        try {
          const parsedDate = new Date(event.fecha);
          if (isNaN(parsedDate.getTime())) {
            throw new Error("Fecha inválida");
          }
          const dateOptions = {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            timeZone: 'America/Guatemala'
          };
          const timeOptions = {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'America/Guatemala'
          };
          const formattedDate = parsedDate.toLocaleDateString('es-ES', dateOptions);
          const formattedTime = parsedDate.toLocaleTimeString('es-ES', timeOptions);
          eventDateTime = `${formattedDate} ${formattedTime} (GT)`;
        } catch (err) {
          console.warn(`Error parseando fecha para el evento: ${event.local} vs. ${event.visitante}`, err);
          eventDateTime = `${event.fecha} (Hora no disponible)`;
        }

        allEvents.push({
          liga: event.liga,
          teams: `${event.local} vs. ${event.visitante}`,
          estadio: event.estadio || 'Por confirmar',
          date: eventDateTime,
        });
      });
    }
  }

  if (allEvents.length > 0) {
    upcomingEventsList.innerHTML = '';
    allEvents.forEach(event => {
      const li = document.createElement('li');
      li.innerHTML = `
        <strong>${event.liga}</strong>: ${event.teams}
        <span>Estadio: ${event.estadio}</span>
        <small>${event.date}</small>
      `;
      upcomingEventsList.appendChild(li);
    });
  } else {
    upcomingEventsList.innerHTML = '<li>No hay eventos próximos disponibles.</li>';
  }

  displaySelectedLeagueEvents('');
}

// ----------------------
// MUESTRA DE EVENTOS DE LA LIGA SELECCIONADA
// ----------------------
function displaySelectedLeagueEvents(leagueCode) {
  const selectedEventsList = $('selected-league-events');
  if (!selectedEventsList) return;

  selectedEventsList.innerHTML = '';

  if (!leagueCode || !allData.calendario) {
    selectedEventsList.innerHTML = '<li class="event-box">Selecciona una liga para ver sus próximos eventos.</li>';
    return;
  }

  const ligaName = leagueCodeToName[leagueCode];
  const events = (allData.calendario[ligaName] || []).slice(0, 3);

  if (events.length === 0) {
    selectedEventsList.innerHTML = '<li class="event-box">No hay eventos próximos para esta liga.</li>';
    return;
  }

  events.forEach(event => {
    let eventDateTime;
    try {
      const parsedDate = new Date(event.fecha);
      if (isNaN(parsedDate.getTime())) {
        throw new Error("Fecha inválida");
      }
      const dateOptions = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'America/Guatemala'
      };
      const timeOptions = {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'America/Guatemala'
      };
      const formattedDate = parsedDate.toLocaleDateString('es-ES', dateOptions);
      const formattedTime = parsedDate.toLocaleTimeString('es-ES', timeOptions);
      eventDateTime = `${formattedDate} ${formattedTime} (GT)`;
    } catch (err) {
      console.warn(`Error parseando fecha para el evento: ${event.local} vs. ${event.visitante}`, err);
      eventDateTime = `${event.fecha} (Hora no disponible)`;
    }

    const li = document.createElement('li');
    li.className = 'event-box';
    li.innerHTML = `
      <strong>${event.local} vs. ${event.visitante}</strong>
      <span>Estadio: ${event.estadio || 'Por confirmar'}</span>
      <small>${eventDateTime}</small>
    `;
    selectedEventsList.appendChild(li);
  });
}

// ----------------------
// INICIALIZACIÓN
// ----------------------
async function init() {
  clearTeamData('Home');
  clearTeamData('Away');
  updateCalcButton();

  await fetchAllData();
  displayUpcomingEvents();

  const leagueSelect = $('leagueSelect');
  const teamHomeSelect = $('teamHome');
  const teamAwaySelect = $('teamAway');

  if (!leagueSelect || !teamHomeSelect || !teamAwaySelect) {
    $('details').innerHTML = '<div class="error"><strong>Error:</strong> Problema con la interfaz HTML.</div>';
    return;
  }

  leagueSelect.innerHTML = '<option value="">-- Selecciona liga --</option>';
  Object.keys(teamsByLeague).sort().forEach(code => {
    const opt = document.createElement('option');
    opt.value = code;
    opt.textContent = leagueNames[code] || code;
    leagueSelect.appendChild(opt);
  });

  leagueSelect.addEventListener('change', () => {
    onLeagueChange();
    displaySelectedLeagueEvents(leagueSelect.value);
  });
  teamHomeSelect.addEventListener('change', () => {
    if (restrictSameTeam()) {
      fillTeamData($('teamHome').value, $('leagueSelect').value, 'Home');
      updateCalcButton();
    }
  });
  teamAwaySelect.addEventListener('change', () => {
    if (restrictSameTeam()) {
      fillTeamData($('teamAway').value, $('leagueSelect').value, 'Away');
      updateCalcButton();
    }
  });

  $('recalc').addEventListener('click', calculateAll);
  $('reset').addEventListener('click', clearAll);
}
document.addEventListener('DOMContentLoaded', init);

// ----------------------
// FUNCIONES AUXILIARES
// ----------------------
function onLeagueChange() {
  const code = $('leagueSelect').value;
  const teamHomeSelect = $('teamHome');
  const teamAwaySelect = $('teamAway');
  teamHomeSelect.innerHTML = '<option value="">Cargando equipos...</option>';
  teamAwaySelect.innerHTML = '<option value="">Cargando equipos...</option>';

  if (!code || !teamsByLeague[code] || teamsByLeague[code].length === 0) {
    clearTeamData('Home');
    clearTeamData('Away');
    updateCalcButton();
    $('details').innerHTML = '<div class="warning"><strong>Advertencia:</strong> No hay datos disponibles para esta liga.</div>';
    return;
  }

  const fragmentHome = document.createDocumentFragment();
  const fragmentAway = document.createDocumentFragment();
  const defaultOptionHome = document.createElement('option');
  defaultOptionHome.value = '';
  defaultOptionHome.textContent = '-- Selecciona equipo --';
  fragmentHome.appendChild(defaultOptionHome);
  const defaultOptionAway = document.createElement('option');
  defaultOptionAway.value = '';
  defaultOptionAway.textContent = '-- Selecciona equipo --';
  fragmentAway.appendChild(defaultOptionAway);

  teamsByLeague[code].forEach(t => {
    const opt1 = document.createElement('option');
    opt1.value = t.name;
    opt1.textContent = t.name;
    fragmentHome.appendChild(opt1);

    const opt2 = document.createElement('option');
    opt2.value = t.name;
    opt2.textContent = t.name;
    fragmentAway.appendChild(opt2);
  });

  teamHomeSelect.innerHTML = '';
  teamAwaySelect.innerHTML = '';
  teamHomeSelect.appendChild(fragmentHome);
  teamAwaySelect.appendChild(fragmentAway);

  clearTeamData('Home');
  clearTeamData('Away');
  updateCalcButton();
}

function updateCalcButton() {
  const teamHome = $('teamHome').value;
  const teamAway = $('teamAway').value;
  const leagueCode = $('leagueSelect').value;
  $('recalc').disabled = !(leagueCode && teamHome && teamAway && teamHome !== teamAway);
}

function restrictSameTeam() {
  const teamHome = $('teamHome').value;
  const teamAway = $('teamAway').value;
  if (teamHome && teamAway && teamHome === teamAway) {
    $('details').innerHTML = '<div class="error"><strong>Error:</strong> No puedes seleccionar el mismo equipo para local y visitante.</div>';
    if (document.activeElement === $('teamHome')) {
      $('teamHome').value = '';
      clearTeamData('Home');
    } else {
      $('teamAway').value = '';
      clearTeamData('Away');
    }
    updateCalcButton();
    return false;
  }
  return true;
}

function clearTeamData(type) {
  const box = $(type === 'Home' ? 'formHomeBox' : 'formAwayBox');
  box.innerHTML = `
    <div class="stat-section" data-testid="general-${type.toLowerCase()}">
      <span class="section-title">Rendimiento General</span>
      <div class="stat-metrics">
        <span>PJ: 0</span>
        <span>Puntos: 0</span>
        <span>DG: 0</span>
      </div>
    </div>
    <div class="stat-section" data-testid="local-${type.toLowerCase()}">
      <span class="section-title">Rendimiento de Local</span>
      <div class="stat-metrics">
        <span>PJ: 0</span>
        <span>PG: 0</span>
        <span>DG: 0</span>
      </div>
    </div>
    <div class="stat-section" data-testid="visitante-${type.toLowerCase()}">
      <span class="section-title">Rendimiento de Visitante</span>
      <div class="stat-metrics">
        <span>PJ: 0</span>
        <span>PG: 0</span>
        <span>DG: 0</span>
      </div>
    </div>
    <div class="stat-legend-text">PJ: Partidos Jugados, Puntos: Puntos Totales, PG: Partidos Ganados, DG: Diferencia de Goles</div>
  `;
  if (type === 'Home') {
    $('posHome').value = '0';
    $('gfHome').value = '0';
    $('gaHome').value = '0';
    $('winPctHome').textContent = '0%';
  } else {
    $('posAway').value = '0';
    $('gfAway').value = '0';
    $('gaAway').value = '0';
    $('winPctAway').textContent = '0%';
  }
}

function clearAll() {
  $('leagueSelect').value = '';
  $('teamHome').innerHTML = '';
  $('teamAway').innerHTML = '';
  clearTeamData('Home');
  clearTeamData('Away');
  $('details').innerHTML = '';
  updateCalcButton();
}

// ----------------------
// FUNCIÓN CALCULAR
// ----------------------
function calculateAll() {
  const leagueCode = $('leagueSelect').value;
  const teamHomeName = $('teamHome').value;
  const teamAwayName = $('teamAway').value;

  if (!leagueCode || !teamHomeName || !teamAwayName) return;

  const leagueTeams = teamsByLeague[leagueCode];
  const tH = leagueTeams.find(t => t.name === teamHomeName);
  const tA = leagueTeams.find(t => t.name === teamAwayName);

  if (!tH || !tA) return;

  // Método heurístico
  const heuristicProbabilities = (home, away) => {
    const totalGoals = home.gf + away.gf;
    const totalGA = home.ga + away.ga;
    const homeFactor = (home.gf / (home.gf + home.ga || 1));
    const awayFactor = (away.gf / (away.gf + away.ga || 1));
    const pHome = homeFactor / (homeFactor + awayFactor);
    const pAway = awayFactor / (homeFactor + awayFactor);
    const pDraw = 1 - pHome - pAway;
    const pBTTS = (home.gf / (home.gf + home.ga || 1) + away.gf / (away.gf + away.ga || 1)) / 2;
    const pO25 = (home.gf + away.gf) / 3;
    return { finalHome: pHome, finalDraw: pDraw, finalAway: pAway, pBTTSH: pBTTS, pO25H: pO25 };
  };

  const { finalHome, finalDraw, finalAway, pBTTSH, pO25H } = heuristicProbabilities(tH, tA);

  $('details').innerHTML = `
    <h3>Probabilidades del Partido</h3>
    <ul>
      <li>${tH.name} gana: ${formatPct(finalHome)}</li>
      <li>Empate: ${formatPct(finalDraw)}</li>
      <li>${tA.name} gana: ${formatPct(finalAway)}</li>
      <li>Ambos anotan: ${formatPct(pBTTSH)}</li>
      <li>Más de 2.5 goles: ${formatPct(pO25H)}</li>
    </ul>
  `;
}

// ----------------------
// MÉTODO POISSON (OPCIONAL)
// ----------------------
function poissonProbabilities(tH, tA) {
  const lambdaHome = tH.pjHome ? tH.gfHome / tH.pjHome : tH.gf / (tH.pj || 1);
  const lambdaAway = tA.pjAway ? tA.gfAway / tA.pjAway : tA.gf / (tA.pj || 1);
  const muHome = tA.pjAway ? tA.gaAway / tA.pjAway : tA.ga / (tA.pj || 1);
  const muAway = tH.pjHome ? tH.gaHome / tH.pjHome : tH.ga / (tH.pj || 1);

  const expHome = lambdaHome * muAway;
  const expAway = lambdaAway * muHome;

  const poisson = (k, lambda) => Math.pow(lambda, k) * Math.exp(-lambda) / factorial(k);
  const factorial = n => n <= 1 ? 1 : n * factorial(n - 1);

  let pHome = 0, pDraw = 0, pAway = 0;
  for (let i = 0; i <= 10; i++) {
    for (let j = 0; j <= 10; j++) {
      const p = poisson(i, expHome) * poisson(j, expAway);
      if (i > j) pHome += p;
      else if (i === j) pDraw += p;
      else pAway += p;
    }
  }

  let pBTTS = 1 - (poisson(0, expHome) + poisson(0, expAway) - poisson(0, expHome) * poisson(0, expAway));
  let pO25 = 0;
  for (let i = 0; i <= 10; i++) {
    for (let j = 0; j <= 10; j++) {
      if (i + j > 2) pO25 += poisson(i, expHome) * poisson(j, expAway);
    }
  }

  return { pHome, pDraw, pAway, pBTTS, pO25 };
}
