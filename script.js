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
const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbzwunZZXmvchjXKs6Wkh3XHOIzRKzRqsH8U6XtOIqrOGWYOdM0AWGW-56zXrDAmhlUedQ/exec";
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
  console.log('Datos crudos del equipo:', raw); // Depuración
  const r = {};
  r.name = raw.name || raw['Equipo'] || '';
  if (!r.name) return null;
  r.pos = parseNumberString(raw.rank || raw.pos || 0);
  r.gf = parseNumberString(raw.goalsFor || raw.gf || 0);
  r.ga = parseNumberString(raw.goalsAgainst || raw.ga || 0);
  r.pj = parseNumberString(raw.gamesPlayed || raw.pj || 0);
  r.g = parseNumberString(raw.wins || raw.g || 0);
  r.e = parseNumberString(raw.ties || raw.e || 0);
  r.p = parseNumberString(raw.losses || raw.p || 0);
  r.points = parseNumberString(raw.points || (r.g*3 + r.e) || 0);
  r.gfHome = parseNumberString(raw.goalsForHome || raw.gfHome || 0);
  r.gfAway = parseNumberString(raw.goalsForAway || raw.gfAway || 0);
  r.gaHome = parseNumberString(raw.goalsAgainstHome || raw.gaHome || 0);
  r.gaAway = parseNumberString(raw.goalsAgainstAway || raw.gaAway || 0);
  r.pjHome = parseNumberString(raw.gamesPlayedHome || raw.pjHome || 0);
  r.pjAway = parseNumberString(raw.gamesPlayedAway || raw.pjAway || 0);
  r.winsHome = parseNumberString(raw.winsHome || raw.gHome || 0);
  r.winsAway = parseNumberString(raw.winsAway || raw.gAway || 0);
  r.recentGoals = parseNumberString(raw.recentGoals || 0);
  r.recentMatches = parseNumberString(raw.recentMatches || 0);
  console.log('Equipo normalizado:', r); // Depuración
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
    if (!res.ok) throw new Error(`Error HTTP ${res.status}: ${res.statusText}`);
    const data = await res.json();
    console.log('Datos crudos de la API:', data);
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
    $('details').innerHTML = '<div class="error"><strong>Error:</strong> No se pudieron cargar los datos de la API.</div>';
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
  if (type === 'Home') {
    $('posHome').value = '—';
    $('gfHome').value = '—';
    $('gaHome').value = '—';
    $('winRateHome').value = '—';
    $('formHomeTeam').textContent = 'Local: —';
    $('formHomeBox').textContent = 'PJ: — | Victorias: — | GF: — | GC: —';
  } else {
    $('posAway').value = '—';
    $('gfAway').value = '—';
    $('gaAway').value = '—';
    $('winRateAway').value = '—';
    $('formAwayTeam').textContent = 'Visitante: —';
    $('formAwayBox').textContent = 'PJ: — | Victorias: — | GF: — | GC: —';
  }
}

function clearAll() {
  document.querySelectorAll('input').forEach(i => i.value = '—');
  document.querySelectorAll('select').forEach(s => s.selectedIndex = 0);
  ['pHome','pDraw','pAway','pBTTS','pO25','details','homeAdvantageFactor','strengthFactor','dixonColesFactor','suggestion'].forEach(id => {
    const el = $(id);
    if(el) el.textContent = '—';
  });
  ['formHomeTeam','formAwayTeam'].forEach(id => $(id).textContent = id.includes('Home') ? 'Local: —' : 'Visitante: —');
  ['formHomeBox','formAwayBox'].forEach(id => $(id).textContent = 'PJ: — | Victorias: — | GF: — | GC: —');
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
  if (!t) return;

  const lambda = t.recentMatches > 0 ? t.recentGoals / t.recentMatches : (type === 'Home' ? t.gfHome / (t.pjHome || t.pj || 1) : t.gfAway / (t.pjAway || t.pj || 1));
  const gaAvg = type === 'Home' ? t.gaHome / (t.pjHome || t.pj || 1) : t.gaAway / (t.pjAway || t.pj || 1);

  // Depuración
  console.log(`fillTeamData (${type}, ${teamName}):`, {
    winsHome: t.winsHome,
    pjHome: t.pjHome,
    winsAway: t.winsAway,
    pjAway: t.pjAway,
    winRateHome: t.winsHome / (t.pjHome || 1),
    winRateAway: t.winsAway / (t.pjAway || 1),
    gfHome: t.gfHome,
    gaHome: t.gaHome,
    gfAway: t.gfAway,
    gaAway: t.gaAway,
    totalWins: t.g
  });

  if (type === 'Home') {
    $('posHome').value = t.pos;
    $('gfHome').value = formatDec(lambda);
    $('gaHome').value = formatDec(gaAvg);
    $('winRateHome').value = formatPct(t.winsHome / (t.pjHome || 1));
    $('formHomeTeam').textContent = `Local: ${t.name}`;
    $('formHomeBox').textContent = `PJ: ${t.pjHome} | Victorias: ${t.winsHome} | GF: ${t.gfHome} | GC: ${t.gaHome}`;
  } else {
    $('posAway').value = t.pos;
    $('gfAway').value = formatDec(lambda);
    $('gaAway').value = formatDec(gaAvg);
    $('winRateAway').value = formatPct(t.winsAway / (t.pjAway || 1));
    $('formAwayTeam').textContent = `Visitante: ${t.name}`;
    $('formAwayBox').textContent = `PJ: ${t.pjAway} | Victorias: ${t.winsAway} | GF: ${t.gfAway} | GC: ${t.gaAway}`;
  }
}

// ----------------------
// FUNCIONES PARA POISSON
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

// ----------------------
// CÁLCULO PRINCIPAL
// ----------------------
function calculateAll() {
  const teamHome = $('teamHome').value;
  const teamAway = $('teamAway').value;
  const league = $('leagueSelect').value;
  if (!teamHome || !teamAway || !league) return;

  const tH = findTeam(league, teamHome);
  const tA = findTeam(league, teamAway);
  if (!tH || !tA) return;

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

  // Calcular probabilidades usando Poisson
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

  $('pHome').textContent = formatPct(pHome);
  $('pAway').textContent = formatPct(pAway);
  $('pDraw').textContent = formatPct(pDraw);
  $('pBTTS').textContent = formatPct(pBTTS);
  $('pO25').textContent = formatPct(pO25);

  // Factores de corrección
  const homeAdvantage = formatDec(avgGh / (avgGa || 1));
  const strengthDiff = formatDec((tH.points / (tH.pj || 1)) - (tA.points / (tA.pj || 1)));
  const dixonColes = '0.00';

  $('homeAdvantageFactor').textContent = homeAdvantage;
  $('strengthFactor').textContent = strengthDiff;
  $('dixonColesFactor').textContent = dixonColes;

  // Recomendación
  const outcomes = [
    { name: `${teamHome} gana`, prob: pHome },
    { name: 'Empate', prob: pDraw },
    { name: `${teamAway} gana`, prob: pAway }
  ];
  const maxOutcome = outcomes.reduce((max, curr) => curr.prob > max.prob ? curr : max, { prob: 0 });

  let suggestionText = `<span class="star">★</span><span class="main-bet">🏆 Apuesta principal: <strong>${maxOutcome.name} (${formatPct(maxOutcome.prob)})</strong></span>`;
  const others = [
    `✔ Ambos anotan (${formatPct(pBTTS)})`,
    `✔ +2.5 goles (${formatPct(pO25)})`
  ];
  suggestionText += `<ul class="other-bets">${others.map(bet => `<li>${bet}</li>`).join('')}</ul>`;

  $('details').textContent = `Basado en modelo Poisson con datos ajustados por rendimiento local/visitante.`;
  $('suggestion').innerHTML = suggestionText;

  // Animación
  const suggestionEl = $('suggestion');
  suggestionEl.classList.add('pulse');
  setTimeout(() => suggestionEl.classList.remove('pulse'), 1000);
}
