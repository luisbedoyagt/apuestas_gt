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
const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbyZ5SMSRzgO-PFGfQ6DkOwuLhxg8vMOffKNW5fRAzWiJTvQMfilrh1xF008XgGFzUR8NA/exec";
let teamsByLeague = {};

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
  console.log(`Equipo normalizado: ${r.name}`, {
    pjAway: r.pjAway,
    winsAway: r.winsAway,
    gfAway: r.gfAway,
    gaAway: r.gaAway,
    rawGamesPlayedAway: raw.gamesPlayedAway,
    rawWinsAway: raw.winsAway,
    rawGoalsForAway: raw.goalsForAway,
    rawGoalsAgainstAway: raw.goalsAgainstAway
  }); // Log temporal para depuración
  return r;
}

// ----------------------
// FETCH EQUIPOS
// ----------------------
async function fetchTeams() {
  console.time('fetchTeams');
  const leagueSelect = $('leagueSelect');
  if (leagueSelect) leagueSelect.innerHTML = '<option value="">Cargando ligas...</option>';

  try {
    const res = await fetch(WEBAPP_URL);
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Error HTTP ${res.status}: ${res.statusText}. Respuesta: ${errorText}`);
    }
    const data = await res.json();
    console.log('JSON recibido:', data); // Log temporal para depuración
    const normalized = {};
    for (const key in data) {
      normalized[key] = (data[key] || []).map(normalizeTeam).filter(t => t && t.name);
    }
    teamsByLeague = normalized;
    localStorage.setItem('teamsByLeague', JSON.stringify(normalized));
    console.log('Datos normalizados:', Object.keys(teamsByLeague));
    console.timeEnd('fetchTeams');
    return normalized;
  } catch (err) {
    console.error('Error en fetchTeams:', err);
    $('details').innerHTML = `<div class="error"><strong>Error:</strong> No se pudieron cargar los datos de la API. Detalle: ${err.message}</div>`;
    return {};
  }
}

// ----------------------
// INICIALIZACIÓN
// ----------------------
async function init() {
  teamsByLeague = await fetchTeams();
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

  leagueSelect.addEventListener('change', onLeagueChange);
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

  clearAll();
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
    $('winRateHome').value = '0%';
    $('formHomeTeam').textContent = 'Local: —';
  } else {
    $('posAway').value = '0';
    $('gfAway').value = '0';
    $('gaAway').value = '0';
    $('winRateAway').value = '0%';
    $('formAwayTeam').textContent = 'Visitante: —';
  }
}

function clearAll() {
  document.querySelectorAll('input').forEach(i => i.value = '0');
  document.querySelectorAll('select').forEach(s => s.selectedIndex = 0);
  ['pHome','pDraw','pAway','pBTTS','pO25','details','homeAdvantageFactor','strengthFactor','dixonColesFactor','suggestion'].forEach(id => {
    const el = $(id);
    if (el) el.textContent = '—';
  });
  ['formHomeTeam','formAwayTeam'].forEach(id => $(id).textContent = id.includes('Home') ? 'Local: —' : 'Visitante: —');
  clearTeamData('Home');
  clearTeamData('Away');
  updateCalcButton();
}

// ----------------------
// BÚSQUEDA Y LLENADO DE EQUIPO
// ----------------------
function findTeam(leagueCode, teamName) {
  if (!teamsByLeague[leagueCode]) return null;
  return teamsByLeague[leagueCode].find(t => t.name === teamName) || null;
}

function fillTeamData(teamName, leagueCode, type) {
  const t = findTeam(leagueCode, teamName);
  if (!t) {
    console.error(`Equipo no encontrado: ${teamName} en liga ${leagueCode}`);
    return;
  }

  console.log(`Llenando datos para ${type}: ${teamName}`, {
    pjAway: t.pjAway,
    winsAway: t.winsAway,
    gfAway: t.gfAway,
    gaAway: t.gaAway,
    pjHome: t.pjHome,
    winsHome: t.winsHome,
    gfHome: t.gfHome,
    gaHome: t.gaHome
  }); // Log temporal para depuración

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
    $('formHomeTeam').textContent = `Local: ${t.name}`;
  } else {
    $('posAway').value = t.pos || 0;
    $('gfAway').value = formatDec(lambda);
    $('gaAway').value = formatDec(gaAvg);
    $('winRateAway').value = formatPct(t.pjAway ? t.winsAway / t.pjAway : 0);
    $('formAwayTeam').textContent = `Visitante: ${t.name}`;
  }
}

// ----------------------
// FUNCIONES PARA CÁLCULOS
// ----------------------
function factorial(n) {
  if (n === 0 || n === 1) return 1;
  let f = 1;
  for (let i = 2; i <= n; i++) f *= i;
  return f;
}

function poissonProb(lambda, k) {
  return Math.exp(-lambda) * Math.pow(lambda, k) / factorial(k);
}

function dixonColesAdjustment(lambdaH, lambdaA, h, a, tau = 0.9) {
  if (h === 0 && a === 0) return tau * poissonProb(lambdaH, 0) * poissonProb(lambdaA, 0);
  if (h === 0 && a === 1) return tau * poissonProb(lambdaH, 0) * poissonProb(lambdaA, 1);
  if (h === 1 && a === 0) return tau * poissonProb(lambdaH, 1) * poissonProb(lambdaA, 0);
  if (h === 1 && a === 1) return tau * poissonProb(lambdaH, 1) * poissonProb(lambdaA, 1);
  return poissonProb(lambdaH, h) * poissonProb(lambdaA, a);
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

  console.log('Calculando para:', { tH, tA }); // Log temporal para depuración

  // Calcular promedios de la liga
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

  // Ataque y defensa ajustados
  const attackH = (tH.pjHome || tH.pj) > 0 ? (tH.gfHome || tH.gf) / (tH.pjHome || tH.pj) / avgGh : 1;
  const defenseA = (tA.pjAway || tA.pj) > 0 ? (tA.gaAway || tA.ga) / (tA.pjAway || tA.pj) / avgGh : 1;
  const lambdaH = attackH * defenseA * avgGh;

  const attackA = (tA.pjAway || tA.pj) > 0 ? (tA.gfAway || tA.gf) / (tA.pjAway || tA.pj) / avgGa : 1;
  const defenseH = (tH.pjHome || tH.pj) > 0 ? (tH.gaHome || tH.ga) / (tH.pjHome || tH.pj) / avgGa : 1;
  const lambdaA = attackA * defenseH * avgGa;

  // Método 1: Poisson
  let pHome = 0;
  let pDraw = 0;
  let pAway = 0;
  let pBTTS = 0;
  let pO25 = 0;
  const maxGoals = 10;

  for (let h = 0; h <= maxGoals; h++) {
    for (let a = 0; a <= maxGoals; a++) {
      const prob = poissonProb(lambdaH, h) * poissonProb(lambdaA, a);
      if (h > a) pHome += prob;
      else if (h === a) pDraw += prob;
      else pAway += prob;

      if (h >= 1 && a >= 1) pBTTS += prob;
      if (h + a > 2) pO25 += prob;
    }
  }

  // Método 2: Elo
  const ppgH = tH.points / (tH.pj || 1);
  const ppgA = tA.points / (tA.pj || 1);
  const eloH = 1500 + 100 * (ppgH - 1.5);
  const eloA = 1500 + 100 * (ppgA - 1.5);
  const homeAdv = 100;
  const expectedH = 1 / (1 + Math.pow(10, (eloA - (eloH + homeAdv)) / 400));
  const expectedA = 1 - expectedH;
  const pHomeElo = expectedH * 0.7;
  const pAwayElo = expectedA * 0.7;
  const pDrawElo = 0.3;

  // Método 3: Dixon-Coles
  let pHomeDC = 0;
  let pDrawDC = 0;
  let pAwayDC = 0;
  for (let h = 0; h <= maxGoals; h++) {
    for (let a = 0; a <= maxGoals; a++) {
      const prob = dixonColesAdjustment(lambdaH, lambdaA, h, a, 0.9);
      if (h > a) pHomeDC += prob;
      else if (h === a) pDrawDC += prob;
      else pAwayDC += prob;
    }
  }

  // Normalizar Dixon-Coles
  const totalDC = pHomeDC + pDrawDC + pAwayDC;
  if (totalDC > 0) {
    pHomeDC /= totalDC;
    pDrawDC /= totalDC;
    pAwayDC /= totalDC;
  }

  // Promediar probabilidades
  const avgHome = (tH.pj && tA.pj) ? (pHome + pHomeElo + pHomeDC) / 3 : 0.33;
  const avgDraw = (tH.pj && tA.pj) ? (pDraw + pDrawElo + pDrawDC) / 3 : 0.33;
  const avgAway = (tH.pj && tA.pj) ? (pAway + pAwayElo + pAwayDC) / 3 : 0.33;

  // Normalizar probabilidades
  const totalAvg = avgHome + avgDraw + avgAway;
  const finalHome = totalAvg > 0 ? avgHome / totalAvg : 0.33;
  const finalDraw = totalAvg > 0 ? avgDraw / totalAvg : 0.33;
  const finalAway = totalAvg > 0 ? avgAway / totalAvg : 0.33;

  // Mostrar probabilidades unificadas
  $('pHome').textContent = formatPct(finalHome);
  $('pDraw').textContent = formatPct(finalDraw);
  $('pAway').textContent = formatPct(finalAway);
  $('pBTTS').textContent = formatPct(pBTTS);
  $('pO25').textContent = formatPct(pO25);

  // Factores de corrección
  const homeAdvantage = formatDec(avgGh / (avgGa || 1));
  const strengthDiff = formatDec(ppgH - ppgA);
  const dixonColes = '0.90';

  $('homeAdvantageFactor').textContent = homeAdvantage;
  $('strengthFactor').textContent = strengthDiff;
  $('dixonColesFactor').textContent = dixonColes;

  // Recomendación
  const outcomes = [
    { name: `${teamHome} gana`, prob: finalHome },
    { name: 'Empate', prob: finalDraw },
    { name: `${teamAway} gana`, prob: finalAway }
  ];
  const maxOutcome = outcomes.reduce((max, curr) => curr.prob > max.prob ? curr : max, outcomes[0] || { name: 'Empate', prob: 0.33 });

  let suggestionText = `<span class="star">★</span><span class="main-bet">🏆 Apuesta principal: <strong>${maxOutcome.name} (${formatPct(maxOutcome.prob)})</strong></span>`;
  const others = [
    `✔ Ambos anotan (${formatPct(pBTTS)})`,
    `✔ +2.5 goles (${formatPct(pO25)})`
  ];
  suggestionText += `<ul class="other-bets">${others.map(bet => `<li>${bet}</li>`).join('')}</ul>`;

  $('details').textContent = `Basado en datos ajustados por rendimiento local/visitante y múltiples métodos predictivos.`;
  $('suggestion').innerHTML = suggestionText;

  // Animación
  const suggestionEl = $('suggestion');
  suggestionEl.classList.add('pulse');
  setTimeout(() => suggestionEl.classList.remove('pulse'), 1000);
}
