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
  const r = {};
  r.name = raw.name || raw.Team || raw.team?.name || raw.teamName || raw.team_name || raw['Equipo'] || raw['team'] || '';
  if (!r.name) return null;
  r.pos = parseNumberString(raw.pos || raw.position || raw.rank || 0);
  r.gf = parseNumberString(raw.gf || raw.goalsFor || raw.gfHome || 0);
  r.ga = parseNumberString(raw.ga || raw.goalsAgainst || raw.gaHome || 0);
  r.pj = parseNumberString(raw.pj || raw.played || 0);
  r.g = parseNumberString(raw.g || raw.won || 0);
  r.e = parseNumberString(raw.e || raw.draw || 0);
  r.p = parseNumberString(raw.p || raw.lost || 0);
  r.points = parseNumberString(raw.points || (r.g*3 + r.e) || 0);
  r.gfHome = parseNumberString(raw.gfHome || 0);
  r.gfAway = parseNumberString(raw.gfAway || 0);
  r.recentGoals = parseNumberString(raw.recentGoals || 0);
  r.recentMatches = parseNumberString(raw.recentMatches || 0);
  r.possession = parseNumberString(raw.possession || 50);
  return r;
}

// ----------------------
// FETCH EQUIPOS
// ----------------------
async function fetchTeams() {
  console.time('fetchTeams');
  const leagueSelect = $('leagueSelect');
  if (leagueSelect) leagueSelect.innerHTML = '<option value="">Cargando ligas...</option>';

  const cachedData = localStorage.getItem('teamsByLeague');
  if (cachedData) {
    try {
      teamsByLeague = JSON.parse(cachedData);
      if (Object.keys(teamsByLeague).length > 0) {
        console.log('Datos cargados desde caché:', Object.keys(teamsByLeague));
        console.timeEnd('fetchTeams');
        return teamsByLeague;
      }
    } catch (e) {
      console.warn('Error al leer caché:', e);
    }
  }

  try {
    const res = await fetch(WEBAPP_URL);
    if (!res.ok) throw new Error(`Error HTTP ${res.status}: ${res.statusText}`);
    const data = await res.json();
    const normalized = {};
    for (const key in data) {
      normalized[key] = (data[key] || []).map(normalizeTeam).filter(t => t && t.name);
    }
    teamsByLeague = normalized;
    localStorage.setItem('teamsByLeague', JSON.stringify(normalized));
    console.log('Datos obtenidos de la API:', Object.keys(teamsByLeague));
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
    $('formHomeTeam').textContent = 'Local: —';
    $('formHomeBox').textContent = 'PJ: — | G: — | E: — | P: —';
  } else {
    $('posAway').value = '—';
    $('gfAway').value = '—';
    $('gaAway').value = '—';
    $('formAwayTeam').textContent = 'Visitante: —';
    $('formAwayBox').textContent = 'PJ: — | G: — | E: — | P: —';
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
  ['formHomeBox','formAwayBox'].forEach(id => $(id).textContent = 'PJ: — | G: — | E: — | P: —');
  updateCalcButton();
}

// ----------------------
// BÚSQUEDA Y LLENADO DE EQUIPO
// ----------------------
function findTeam(leagueCode, teamName) {
  if(!teamsByLeague[leagueCode]) return null;
  return teamsByLeague[leagueCode].find(t => t.name === teamName) || null;
}

function fillTeamData(teamName, leagueCode, type) {
  const t = findTeam(leagueCode, teamName);
  if(!t) return;

  const lambda = t.recentMatches > 0 ? t.recentGoals / t.recentMatches : t.gfHome/t.pj || t.gf/t.pj || 0;
  const gaAvg = t.pj > 0 ? t.ga/t.pj : 0;

  if(type==='Home') {
    $('posHome').value = t.pos;
    $('gfHome').value = formatDec(lambda);
    $('gaHome').value = formatDec(gaAvg);
    $('formHomeTeam').textContent = `Local: ${t.name}`;
    $('formHomeBox').textContent = `PJ: ${t.pj} | G: ${t.g} | E: ${t.e} | P: ${t.p}`;
  } else {
    $('posAway').value = t.pos;
    $('gfAway').value = formatDec(lambda);
    $('gaAway').value = formatDec(gaAvg);
    $('formAwayTeam').textContent = `Visitante: ${t.name}`;
    $('formAwayBox').textContent = `PJ: ${t.pj} | G: ${t.g} | E: ${t.e} | P: ${t.p}`;
  }
}

// ----------------------
// CÁLCULO PRINCIPAL
// ----------------------
function calculateAll() {
  const teamHome = $('teamHome').value;
  const teamAway = $('teamAway').value;
  const league = $('leagueSelect').value;
  if(!teamHome || !teamAway || !league) return;

  const tH = findTeam(league, teamHome);
  const tA = findTeam(league, teamAway);
  if(!tH || !tA) return;

  const lambdaH = tH.gf/tH.pj || 0.5;
  const lambdaA = tA.gf/tA.pj || 0.5;
  const muH = tH.ga/tH.pj || 0.5;
  const muA = tA.ga/tA.pj || 0.5;

  const pHome = lambdaH/(lambdaH+lambdaA);
  const pAway = lambdaA/(lambdaH+lambdaA);
  const pDraw = 1 - (pHome+pAway);

  $('pHome').textContent = formatPct(pHome);
  $('pAway').textContent = formatPct(pAway);
  $('pDraw').textContent = formatPct(pDraw);

  const btts = (tH.gf>0 && tA.gf>0) ? 0.65 : 0.35;
  const over25 = (lambdaH + lambdaA > 1.5) ? 0.7 : 0.3;

  $('pBTTS').textContent = formatPct(btts);
  $('pO25').textContent = formatPct(over25);
}

