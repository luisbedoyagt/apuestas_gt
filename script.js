/**
 * @fileoverview Script mejorado para interfaz web que muestra estadísticas de fútbol y calcula probabilidades de partidos
 * usando datos de una API de Google Apps Script. Ahora usa un modelo basado en la distribución de Poisson
 * con el ajuste de Dixon y Coles y "shrinkage" para una mejor predicción de empates y resultados realistas.
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

// Funciones auxiliares para Poisson y Dixon-Coles
function poissonProbability(lambda, k) {
    if (lambda <= 0 || k < 0) return 0;
    return (Math.exp(-lambda) * Math.pow(lambda, k)) / factorial(k);
}

function factorial(n) {
    if (n === 0 || n === 1) return 1;
    let res = 1;
    for (let i = 2; i <= n; i++) res *= i;
    return res;
}

// ----------------------
// CONFIGURACIÓN DE LIGAS (completa)
// ----------------------
const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbxPOHPGu05lHmZqU8rKswEsxyC8gJNBsZMj3_dNqhn76X93Wh5ys5eaeQlDDBGvpGbfUg/exec";
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
    "ksa.1": "Pro League Arabia Saudita",
    "conmebol.libertadores": "Conmebol Libertadores",
    "conmebol.sudamericana": "Conmebol Sudamericana",
    "arg.1": "Liga Profesional Argentina",
    "ecu.1": "Liga Pro Ecuador",
    "uru.1": "Primera División Uruguay",
    "ven.1": "Primera División Venezuela",
    "per.1": "Liga 1 Perú",
    "bol.1": "División Profesional Bolivia",
    "par.1": "Primera División Paraguay",
    "chi.1": "Primera División Chile",
    "col.1": "Primera A Colombia"
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
    "ksa.1": "Arabia_Saudi_ProLeague",
    "conmebol.libertadores": "Conmebol_Libertadores",
    "conmebol.sudamericana": "Conmebol_Sudamericana",
    "arg.1": "Argentina_LigaProfesional",
    "ecu.1": "Ecuador_LigaPro",
    "uru.1": "Uruguay_PrimeraDivisión",
    "ven.1": "Venezuela_PrimeraDivisión",
    "per.1": "Perú_Liga1",
    "bol.1": "Bolivia_DivisiónProfesional",
    "par.1": "Paraguay_PrimeraDivisión",
    "chi.1": "Chile_PrimeraDivisión",
    "col.1": "Colombia_PrimeraA"
};

// ----------------------
// NORMALIZACIÓN DE DATOS (sin cambios)
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
// FETCH DATOS COMPLETOS (sin cambios)
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
// MUESTRA DE EVENTOS FUTUROS (sin cambios)
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
// MUESTRA DE EVENTOS DE LA LIGA SELECCIONADA (sin cambios)
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
    const eventsForLeague = (allData.calendario[ligaName] || []);

    if (eventsForLeague.length > 0) {
        eventsForLeague.forEach(event => {
            const li = document.createElement('li');
            li.className = 'event-box';
            li.innerHTML = `
                <div class="team-names">${event.local} vs. ${event.visitante}</div>
                <div class="event-details">
                    <span>Estadio: ${event.estadio}</span>
                    <small>Fecha: ${event.fecha}</small>
                </div>
            `;
            selectedEventsList.appendChild(li);
        });
    } else {
        selectedEventsList.innerHTML = '<li class="event-box">No se encontraron eventos para esta liga.</li>';
    }
}

// ----------------------
// INICIALIZACIÓN (sin cambios)
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
// FUNCIONES AUXILIARES (sin cambios)
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
    const defaultOptionHome = document.createElement('option');
    defaultOptionHome.value = '';
    defaultOptionHome.textContent = '-- Selecciona equipo --';
    fragmentHome.appendChild(defaultOptionHome);
    const fragmentAway = document.createDocumentFragment();
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
        $('winRateHome').value = '0%';
        $('formHomeTeam').innerHTML = 'Local: —';
    } else {
        $('posAway').value = '0';
        $('gfAway').value = '0';
        $('gaAway').value = '0';
        $('winRateAway').value = '0%';
        $('formAwayTeam').innerHTML = 'Visitante: —';
    }
}

function clearAll() {
    document.querySelectorAll('input').forEach(i => i.value = '0');
    document.querySelectorAll('select').forEach(s => s.selectedIndex = 0);
    ['pHome', 'pDraw', 'pAway', 'pBTTS', 'pO25', 'details', 'homeAdvantageFactor', 'strengthFactor', 'dixonColesFactor', 'suggestion'].forEach(id => {
        const el = $(id);
        if (el) el.textContent = '—';
    });
    ['formHomeTeam', 'formAwayTeam'].forEach(id => $(id).innerHTML = id.includes('Home') ? 'Local: —' : 'Visitante: —');
    clearTeamData('Home');
    clearTeamData('Away');
    updateCalcButton();
    displaySelectedLeagueEvents('');
}

// ----------------------
// BÚSQUEDA Y LLENADO DE EQUIPO (sin cambios)
// ----------------------
function findTeam(leagueCode, teamName) {
    if (!teamsByLeague[leagueCode]) return null;
    return teamsByLeague[leagueCode].find(t => t.name === teamName) || null;
}

function fillTeamData(teamName, leagueCode, type) {
    const t = findTeam(leagueCode, teamName);
    if (!t) {
        console.error(`Equipo no encontrado: ${teamName} en liga ${leagueCode}`);
        $('details').innerHTML = `<div class="error"><strong>Error:</strong> Equipo ${teamName} no encontrado en la liga seleccionada.</div>`;
        return;
    }

    const lambda = type === 'Home' ? (t.pjHome ? t.gfHome / t.pjHome : t.gf / (t.pj || 1)) : (t.pjAway ? t.gfAway / t.pjAway : t.gf / (t.pj || 1));
    const gaAvg = type === 'Home' ? (t.pjHome ? t.gaHome / t.pjHome : t.ga / (t.pj || 1)) : (t.pjAway ? t.gaAway / t.pjAway : t.ga / (t.pj || 1));
    const dg = t.gf - t.ga;
    const dgHome = t.gfHome - t.gaHome;
    const dgAway = t.gfAway - t.gaAway;

    const box = $(type === 'Home' ? 'formHomeBox' : 'formAwayBox');
    box.innerHTML = `
    <div class="stat-section" data-testid="general-${type.toLowerCase()}">
      <span class="section-title">Rendimiento General</span>
      <div class="stat-metrics">
        <span>PJ: ${t.pj || 0}</span>
        <span>Puntos: ${t.points || 0}</span>
        <span>DG: ${dg >= 0 ? '+' + dg : dg || 0}</span>
      </div>
    </div>
    <div class="stat-section" data-testid="local-${type.toLowerCase()}">
      <span class="section-title">Rendimiento de Local</span>
      <div class="stat-metrics">
        <span>PJ: ${t.pjHome || 0}</span>
        <span>PG: ${t.winsHome || 0}</span>
        <span>DG: ${dgHome >= 0 ? '+' + dgHome : dgHome || 0}</span>
      </div>
    </div>
    <div class="stat-section" data-testid="visitante-${type.toLowerCase()}">
      <span class="section-title">Rendimiento de Visitante</span>
      <div class="stat-metrics">
        <span>PJ: ${t.pjAway || 0}</span>
        <span>PG: ${t.winsAway || 0}</span>
        <span>DG: ${dgAway >= 0 ? '+' + dgAway : dgAway || 0}</span>
      </div>
    </div>
    <div class="stat-legend-text">PJ: Partidos Jugados, Puntos: Puntos Totales, PG: Partidos Ganados, DG: Diferencia de Goles</div>
  `;

    if (type === 'Home') {
        $('posHome').value = t.pos || 0;
        $('gfHome').value = formatDec(lambda);
        $('gaHome').value = formatDec(gaAvg);
        $('winRateHome').value = formatPct(t.pjHome ? t.winsHome / t.pjHome : 0);
        $('formHomeTeam').innerHTML = t.logoUrl
            ? `<img src="${t.logoUrl}" alt="${t.name} logo" class="team-logo"> Local: ${t.name}`
            : `Local: ${t.name}`;
    } else {
        $('posAway').value = t.pos || 0;
        $('gfAway').value = formatDec(lambda);
        $('gaAway').value = formatDec(gaAvg);
        $('winRateAway').value = formatPct(t.pjAway ? t.winsAway / t.pjAway : 0);
        $('formAwayTeam').innerHTML = t.logoUrl
            ? `<img src="${t.logoUrl}" alt="${t.name} logo" class="team-logo"> Visitante: ${t.name}`
            : `Visitante: ${t.name}`;
    }
}

// ----------------------
// CÁLCULO DE PROBABILIDADES CON DIXON-COLES Y SHRINKAGE
// ----------------------
function dixonColesProbabilities(tH, tA, league) {
    const rho = -0.11;
    const shrinkageFactor = 1.0;

    const teams = teamsByLeague[league];
    let totalGames = 0, totalGf = 0, totalGa = 0, totalGfHome = 0, totalGaHome = 0, totalGfAway = 0, totalGaAway = 0;
    teams.forEach(t => {
        totalGames += t.pj || 0;
        totalGf += t.gf || 0;
        totalGa += t.ga || 0;
        totalGfHome += t.gfHome || 0;
        totalGaHome += t.gaHome || 0;
        totalGfAway += t.gfAway || 0;
        totalGaAway += t.gaAway || 0;
    });

    const leagueAvgGfHome = totalGfHome / (totalGames || 1);
    const leagueAvgGaAway = totalGaAway / (totalGames || 1);
    const leagueAvgGfAway = totalGfAway / (totalGames || 1);
    const leagueAvgGaHome = totalGaHome / (totalGames || 1);

    const homeAttackRaw = (tH.gfHome || 0) / (tH.pjHome || 1);
    const homeDefenseRaw = (tH.gaHome || 0) / (tH.pjHome || 1);
    const awayAttackRaw = (tA.gfAway || 0) / (tA.pjAway || 1);
    const awayDefenseRaw = (tA.gaAway || 0) / (tA.pjAway || 1);

    const homeAttackAdj = (homeAttackRaw + (leagueAvgGfHome * shrinkageFactor)) / (1 + shrinkageFactor);
    const homeDefenseAdj = (homeDefenseRaw + (leagueAvgGaHome * shrinkageFactor)) / (1 + shrinkageFactor);
    const awayAttackAdj = (awayAttackRaw + (leagueAvgGfAway * shrinkageFactor)) / (1 + shrinkageFactor);
    const awayDefenseAdj = (awayDefenseRaw + (leagueAvgGaAway * shrinkageFactor)) / (1 + shrinkageFactor);

    const homeAttackStrength = homeAttackAdj / (leagueAvgGfHome || 1);
    const homeDefenseStrength = homeDefenseAdj / (leagueAvgGaHome || 1);
    const awayAttackStrength = awayAttackAdj / (leagueAvgGfAway || 1);
    const awayDefenseStrength = awayDefenseAdj / (leagueAvgGaAway || 1);

    const lambdaHome = homeAttackStrength * awayDefenseStrength * (leagueAvgGfHome || 1);
    const lambdaAway = awayAttackStrength * homeDefenseStrength * (leagueAvgGfAway || 1);

    const maxGoals = 6;
    let pHome = 0, pDraw = 0, pAway = 0, pBTTS = 0, pO25 = 0;

    for (let h = 0; h <= maxGoals; h++) {
        for (let a = 0; a <= maxGoals; a++) {
            let prob;
            if (h === a) {
                prob = poissonProbability(lambdaHome, h) * poissonProbability(lambdaAway, a) * (1 + rho);
            } else {
                prob = poissonProbability(lambdaHome, h) * poissonProbability(lambdaAway, a);
            }

            if (h > a) pHome += prob;
            else if (h === a) pDraw += prob;
            else pAway += prob;

            if (h >= 1 && a >= 1) pBTTS += prob;
            if (h + a > 2) pO25 += prob;
        }
    }
    
    // Normalizar probabilidades principales para que sumen 1
    const total = pHome + pDraw + pAway;
    const finalHome = total > 0 ? pHome / total : 0.33;
    const finalDraw = total > 0 ? pDraw / total : 0.33;
    const finalAway = total > 0 ? pAway / total : 0.33;

    // Normalizar probabilidades de Ambos Anotan y Más de 2.5 Goles
    const finalBTTS = pBTTS / total;
    const finalO25 = pO25 / total;

    return { finalHome, finalDraw, finalAway, pBTTSH: finalBTTS, pO25H: finalO25, rho };
}

// ----------------------
// CÁLCULO PRINCIPAL
// ----------------------
function calculateAll() {
    const teamHome = $('teamHome').value;
    const teamAway = $('teamAway').value;
    const league = $('leagueSelect').value;
    if (!teamHome || !teamAway || !league) {
        $('details').innerHTML = '<div class="error"><strong>Error:</strong> Selecciona una liga y ambos equipos.</div>';
        return;
    }

    const tH = findTeam(league, teamHome);
    const tA = findTeam(league, teamAway);
    if (!tH || !tA) {
        $('details').innerHTML = '<div class="error"><strong>Error:</strong> Equipos no encontrados.</div>';
        return;
    }

    let warning = '';
    if (tH.pj < 5 || tA.pj < 5) {
        warning = '<div class="warning"><strong>Advertencia:</strong> Al menos un equipo tiene menos de 5 partidos jugados. Las predicciones pueden ser menos precisas.</div>';
    }

    const { finalHome, finalDraw, finalAway, pBTTSH, pO25H, rho } = dixonColesProbabilities(tH, tA, league);

    $('pHome').textContent = formatPct(finalHome);
    $('pDraw').textContent = formatPct(finalDraw);
    $('pAway').textContent = formatPct(finalAway);
    $('pBTTS').textContent = formatPct(pBTTSH);
    $('pO25').textContent = formatPct(pO25H);

    const teams = teamsByLeague[league];
    let totalGames = 0;
    let totalGfHome = 0;
    let totalGaHome = 0;
    teams.forEach(t => {
        totalGames += t.pjHome || t.pj || 0;
        totalGfHome += t.gfHome || t.gf || 0;
        totalGaHome += t.gaHome || t.ga || 0;
    });
    const avgGh = totalGames > 0 ? totalGfHome / totalGames : 1.2;
    const avgGa = totalGames > 0 ? totalGaHome / totalGames : 1.0;
    const homeAdvantage = formatDec(avgGh / (avgGa || 1));
    const ppgH = tH.points / (tH.pj || 1);
    const ppgA = tA.points / (tA.pj || 1);
    const strengthDiff = formatDec(ppgH - ppgA);

    $('homeAdvantageFactor').textContent = homeAdvantage;
    $('strengthFactor').textContent = strengthDiff;
    $('dixonColesFactor').textContent = rho;

    const outcomes = [
        { name: `${teamHome} gana`, prob: finalHome },
        { name: 'Empate', prob: finalDraw },
        { name: `${teamAway} gana`, prob: finalAway }
    ];
    const maxOutcome = outcomes.reduce((max, curr) => curr.prob > max.prob ? curr : max, outcomes[0] || { name: 'Empate', prob: 0.33 });

    let suggestionText = `<span class="star">★</span><span class="main-bet">🏆 Apuesta principal: <strong>${maxOutcome.name} (${formatPct(maxOutcome.prob)})</strong></span>`;

    const bttsText = pBTTSH > 0.55 ? `✔ Ambos anotan (${formatPct(pBTTSH)})` :
        pBTTSH < 0.45 ? `❌ No ambos anotan (${formatPct(1 - pBTTSH)})` :
        `— Ambos anotan equilibrado (${formatPct(pBTTSH)})`;
    const o25Text = pO25H > 0.55 ? `✔ +2.5 goles (${formatPct(pO25H)})` :
        pO25H < 0.45 ? `❌ -2.5 goles (${formatPct(1 - pO25H)})` :
        `— +2.5 goles equilibrado (${formatPct(pO25H)})`;

    const others = [bttsText, o25Text];
    suggestionText += `<ul class="other-bets">${others.map(bet => `<li>${bet}</li>`).join('')}</ul>`;

    if (maxOutcome.prob < 0.40) {
        suggestionText += `<div class="warning">No hay un claro favorito; considera evitar esta apuesta principal.</div>`;
    }

    $('details').innerHTML = `${warning}Basado en datos ajustados por rendimiento local/visitante y modelo de Dixon y Coles.`;
    $('suggestion').innerHTML = suggestionText;

    const suggestionEl = $('suggestion');
    suggestionEl.classList.add('pulse');
    setTimeout(() => suggestionEl.classList.remove('pulse'), 1000);
}
