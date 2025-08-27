console.log("Script.js cargado correctamente");

const $ = id => document.getElementById(id);
const formatPct = x => (100 * (isFinite(x) ? x : 0)).toFixed(1) + '%';
const formatDec = x => (isFinite(x) ? x.toFixed(2) : '0.00');
function parseNumberString(val) { 
  const s = String(val || '').replace(/,/g, '.'); 
  const n = Number(s); 
  return isFinite(n) ? n : 0; 
}

const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbyP6dc9ww4I9kw26fQCc0gAyEtYbQVg6DsoAtlnxqhFFJClOrHoudM8PdnBnT9YBopSlA/exec";
let teamsByLeague = {};
const leagueNames = { 
  "WC": "FIFA World Cup", "CL": "UEFA Champions League", "BL1": "Bundesliga", 
  "DED": "Eredivisie", "BSA": "Campeonato Brasileiro", "PD": "Liga Española", 
  "FL1": "Ligue 1", "ELC": "Championship", "PPL": "Primeira Liga", 
  "EC": "European Championship", "SA": "Serie A", "PL": "Premier League" 
};

function normalizeTeam(raw) {
  if (!raw) {
    console.warn('Datos de equipo nulos:', raw);
    return null;
  }
  const r = {};
  r.name = raw.name || raw.Team || raw.team?.name || raw.teamName || raw.team_name || raw['Equipo'] || raw['team'] || raw['team_name'] || raw['team.shortName'] || '';
  if (!r.name) {
    console.warn('Equipo sin nombre válido:', raw);
    return null;
  }
  r.pos = raw.pos || raw.position || raw.rank || raw['Pos'] || raw['POS'] || null;
  r.gf = parseNumberString(raw.gf || raw.goalsFor || raw.goals_for || raw.GF || raw['GF'] || raw['goals'] || raw['goals_for']);
  r.ga = parseNumberString(raw.ga || raw.goalsAgainst || raw.goals_against || raw.GC || raw['GC'] || raw['goals_against']);
  r.pj = parseNumberString(raw.PJ || raw.pj || raw.played || raw.playedGames || raw.matches || raw['Matches'] || raw['matches']);
  r.g = parseNumberString(raw.G || raw.g || raw.won || raw.W || raw.w);
  r.e = parseNumberString(raw.E || raw.e || raw.draw || raw.D || raw.draws || raw.drawn);
  r.p = parseNumberString(raw.P || raw.p || raw.lost || raw.L || raw.l);
  r.points = parseNumberString(raw.points || raw.Points || (r.g * 3 + r.e) || 0);
  r.form = raw.form || raw.Form || null;
  return r;
}

async function fetchTeams() {
  try {
    const res = await fetch(WEBAPP_URL);
    if (!res.ok) throw new Error('fetch falló ' + res.status);
    const data = await res.json();
    if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
      throw new Error('Datos de la API vacíos o inválidos');
    }
    const normalized = {};
    for (const key in data) { 
      const arr = data[key] || []; 
      normalized[key] = arr.map(x => normalizeTeam(x)).filter(t => t && t.name); 
      console.log(`Liga ${key} normalizada:`, normalized[key]);
    }
    if (Object.keys(normalized).length === 0) {
      throw new Error('No se encontraron ligas válidas');
    }
    return normalized;
  } catch (err) { 
    console.error('Error fetching teams:', err); 
    alert('No se pudieron cargar los datos de equipos desde la API. Usando datos mockeados para pruebas.');
    return {
      "BSA": [
        { name: "CR Flamengo", pos: 1, gf: 44, ga: 9, pj: 20, g: 14, e: 4, p: 2, points: 46, form: "4-1-0" },
        { name: "SC Recife", pos: 20, gf: 12, ga: 30, pj: 19, g: 1, e: 7, p: 11, points: 10, form: "0-2-3" }
      ]
    };
  }
}

async function init() {
  try {
    teamsByLeague = await fetchTeams();
    const leagueCodes = Object.keys(teamsByLeague);
    console.log('Ligas disponibles:', leagueCodes);
    if (leagueCodes.length === 0) {
      alert('No se encontraron ligas para mostrar.');
      return;
    }
    const leagueSelect = $('leagueSelect');
    if (!leagueSelect) {
      console.error('Elemento #leagueSelect no encontrado');
      alert('Error: No se encontró el selector de ligas.');
      return;
    }
    leagueSelect.innerHTML = '<option value="">-- Selecciona liga --</option>';
    leagueCodes.forEach(code => { 
      const opt = document.createElement('option'); 
      opt.value = code; 
      opt.textContent = leagueNames[code] || code; 
      leagueSelect.appendChild(opt); 
    });
    const teamHomeSelect = $('teamHome');
    const teamAwaySelect = $('teamAway');
    if (!teamHomeSelect || !teamAwaySelect) {
      console.error('Elementos #teamHome o #teamAway no encontrados');
      alert('Error: No se encontraron los selectores de equipos.');
      return;
    }
    $('leagueSelect').addEventListener('change', onLeagueChange);
    teamHomeSelect.addEventListener('change', () => fillTeamData($('teamHome').value, $('leagueSelect').value, 'Home'));
    teamAwaySelect.addEventListener('change', () => fillTeamData($('teamAway').value, $('leagueSelect').value, 'Away'));
    $('recalc').addEventListener('click', calculateAll);
    $('reset').addEventListener('click', () => location.reload());
    $('clearAll').addEventListener('click', clearAll);
    $('formHome').addEventListener('change', calculateAll);
    $('formAway').addEventListener('change', calculateAll);
  } catch (err) {
    console.error("Error en init:", err);
    alert("Error al inicializar la aplicación. Por favor, recarga la página.");
  }
}
document.addEventListener('DOMContentLoaded', init);

function onLeagueChange() {
  const code = $('leagueSelect').value;
  console.log('Liga seleccionada:', code);
  const teamHomeSelect = $('teamHome');
  const teamAwaySelect = $('teamAway');
  teamHomeSelect.innerHTML = '<option value="">-- Selecciona equipo --</option>';
  teamAwaySelect.innerHTML = '<option value="">-- Selecciona equipo --</option>';
  if (!code || !teamsByLeague[code]) {
    console.warn(`No se encontraron equipos para la liga ${code}`);
    alert(`No hay equipos disponibles para la liga seleccionada (${code}).`);
    return;
  }
  teamsByLeague[code].forEach(t => {
    const opt1 = document.createElement('option'); opt1.value = t.name; opt1.textContent = t.name; teamHomeSelect.appendChild(opt1);
    const opt2 = document.createElement('option'); opt2.value = t.name; opt2.textContent = t.name; teamAwaySelect.appendChild(opt2);
  });
}

function findTeam(leagueCode, teamName) {
  if (!teamsByLeague[leagueCode]) return null;
  return teamsByLeague[leagueCode].find(t => t.name === teamName) || null;
}

function fillTeamData(teamName, leagueCode, type) {
  if (!teamName) return;
  const t = findTeam(leagueCode, teamName);
  if (!t) return;

  const formString = t.form || `${t.g || 0}-${t.e || 0}-${t.p || 0}`;
  if (type === 'Home') {
    $('posHome').value = t.pos || '';
    $('gfHome').value = Number.isFinite(t.gf) && t.pj > 0 ? (t.gf / t.pj).toFixed(2) : '';
    $('gaHome').value = Number.isFinite(t.ga) && t.pj > 0 ? (t.ga / t.pj).toFixed(2) : '';
    $('formHome').value = formString;
    $('formHomeTeam').textContent = `Local: ${t.name}`;
    $('formHomeBox').textContent = `PJ: ${t.pj || 0} | G: ${t.g || 0} | E: ${t.e || 0} | P: ${t.p || 0}`;
  } else {
    $('posAway').value = t.pos || '';
    $('gfAway').value = Number.isFinite(t.gf) && t.pj > 0 ? (t.gf / t.pj).toFixed(2) : '';
    $('gaHome').value = Number.isFinite(t.ga) && t.pj > 0 ? (t.ga / t.pj).toFixed(2) : '';
    $('formAway').value = formString;
    $('formAwayTeam').textContent = `Visitante: ${t.name}`;
    $('formAwayBox').textContent = `PJ: ${t.pj || 0} | G: ${t.g || 0} | E: ${t.e || 0} | P: ${t.p || 0}`;
  }
  calculateAll();
}

function clearAll() {
  document.querySelectorAll('input').forEach(i => i.value = '');
  document.querySelectorAll('select').forEach(s => s.selectedIndex = 0);
  ['pHome', 'pDraw', 'pAway', 'pBTTS', 'pO25', 'details', 
   'formHomeTeam', 'formAwayTeam', 'formHomeBox', 'formAwayBox', 
   'homeAdvantageFactor', 'strengthFactor', 'recentFormFactor', 'dixonColesFactor'].forEach(id => {
    const el = $(id);
    if (el) el.textContent = id.includes('form') ? 
      (id.includes('Team') ? (id.includes('Home') ? 'Local: —' : 'Visitante: —') : 'PJ: — | G: — | E: — | P: —') : '—';
  });
  $('formHome').value = '';
  $('formAway').value = '';
}

function poissonPMF(lambda, k) { 
  if (k < 0) return 0;
  return Math.pow(lambda, k) * Math.exp(-lambda) / factorial(k); 
}

function factorial(n) { 
  if (n <= 1) return 1; 
  let f = 1; 
  for (let i = 2; i <= n; i++) f *= i; 
  return f; 
}

function clamp01(x) { return Math.max(0, Math.min(1, x)); }

function dixonColesAdjustment(lambdaHome, lambdaAway) {
  const rho = -0.15; // Valor fijo basado en estudios típicos
  if (lambdaHome < 0.01 || lambdaAway < 0.01) return 1;
  const prob00 = poissonPMF(lambdaHome, 0) * poissonPMF(lambdaAway, 0);
  const adjustedProb00 = prob00 * (1 - (lambdaHome * lambdaAway * rho));
  const prob10 = poissonPMF(lambdaHome, 1) * poissonPMF(lambdaAway, 0);
  const adjustedProb10 = prob10 * (1 + (lambdaAway * rho));
  const prob01 = poissonPMF(lambdaHome, 0) * poissonPMF(lambdaAway, 1);
  const adjustedProb01 = prob01 * (1 + (lambdaHome * rho));
  const prob11 = poissonPMF(lambdaHome, 1) * poissonPMF(lambdaAway, 1);
  const adjustedProb11 = prob11 * (1 - rho);
  const originalProbs = prob00 + prob10 + prob01 + prob11;
  const adjustedProbs = adjustedProb00 + adjustedProb10 + adjustedProb01 + adjustedProb11;
  return originalProbs > 0 ? adjustedProbs / originalProbs : 1;
}

function calculateStrengthFactor(posHome, posAway, leagueCode, pointsHome, pointsAway) {
  const maxTeams = teamsByLeague[leagueCode]?.length || 20;
  if (!posHome || !posAway || !maxTeams || !pointsHome || !pointsAway) return 1;
  const normalizedHome = (maxTeams - posHome + 1) / maxTeams;
  const normalizedAway = (maxTeams - posAway + 1) / maxTeams;
  const ppgHome = pointsHome / ($('gfHome').value || 1);
  const ppgAway = pointsAway / ($('gfAway').value || 1);
  const eloFactor = (normalizedHome / normalizedAway) * (ppgHome / ppgAway || 1);
  return Math.min(Math.max(Math.sqrt(eloFactor), 0.5), 2.0);
}

function calculateFormFactor(formHome, formAway) {
  if (!formHome || !formAway) return 1;
  if (!formHome.match(/^\d+-\d+-\d+$/) || !formAway.match(/^\d+-\d+$/)) {
    console.warn("Formato de forma reciente inválido. Usando factor 1.");
    return 1;
  }
  try {
    const [homeW, homeD, homeL] = formHome.split('-').map(x => parseInt(x) || 0);
    const [awayW, awayD, awayL] = formAway.split('-').map(x => parseInt(x) || 0);
    const homePpg = (homeW * 3 + homeD) / (homeW + homeD + homeL || 1);
    const awayPpg = (awayW * 3 + awayD) / (awayW + awayD + awayL || 1);
    if (awayPpg === 0) return 1;
    const formFactor = homePpg / awayPpg;
    const weight = 0.3; // Peso fijo
    return Math.min(Math.max(1 + (formFactor - 1) * weight, 0.5), 2.0);
  } catch (e) {
    console.error("Error parsing form data:", e);
    return 1;
  }
}

function calculateHomeAdvantage(leagueCode) {
  const teams = teamsByLeague[leagueCode] || [];
  const avgGoals = teams.reduce((sum, t) => sum + (t.gf / t.pj || 0), 0) / (teams.length || 1);
  return 1 + (avgGoals * 0.1); // Aumentar 10% del promedio de goles
}

function computeProbabilities(lambdaHome, lambdaAway, pointsHome, pointsAway, leagueCode) {
  if (lambdaHome <= 0 || lambdaAway <= 0) {
    console.warn('Lambdas inválidos:', { lambdaHome, lambdaAway });
    return { pHome: 0, pDraw: 0, pAway: 0, pBTTS: 0, pO25: 0 };
  }
  const homeAdvantageFactor = calculateHomeAdvantage(leagueCode);
  const posHome = parseNumberString($('posHome').value);
  const posAway = parseNumberString($('posAway').value);
  const strengthFactor = calculateStrengthFactor(posHome, posAway, leagueCode, pointsHome, pointsAway);
  const formHome = $('formHome').value;
  const formAway = $('formAway').value;
  const recentFormFactor = calculateFormFactor(formHome, formAway);
  const dixonColesFactor = dixonColesAdjustment(lambdaHome, lambdaAway);
  
  $('homeAdvantageFactor').textContent = formatDec(homeAdvantageFactor) + 'x';
  $('strengthFactor').textContent = formatDec(strengthFactor) + 'x';
  $('recentFormFactor').textContent = formatDec(recentFormFactor) + 'x';
  $('dixonColesFactor').textContent = formatDec(dixonColesFactor) + 'x';
  
  const adjHome = Math.min(lambdaHome * homeAdvantageFactor * strengthFactor * recentFormFactor, 3.0);
  const adjAway = Math.max(lambdaAway / strengthFactor / recentFormFactor, 0.1);
  
  console.log('computeProbabilities:', {
    lambdaHome, lambdaAway, adjHome, adjAway, homeAdvantageFactor, strengthFactor, recentFormFactor, dixonColesFactor
  });
  
  let pHome = 0, pDraw = 0, pAway = 0;
  const maxGoals = 8;
  for (let i = 0; i <= maxGoals; i++) {
    for (let j = 0; j <= maxGoals; j++) {
      const prob = poissonPMF(adjHome, i) * poissonPMF(adjAway, j) * dixonColesFactor;
      if (i > j) pHome += prob;
      else if (i === j) pDraw += prob;
      else pAway += prob;
    }
  }
  
  const total = pHome + pDraw + pAway;
  if (total <= 0) {
    console.warn('Suma de probabilidades inválida:', total);
    return { pHome: 0, pDraw: 0, pAway: 0, pBTTS: 0, pO25: 0 };
  }
  
  pHome /= total;
  pDraw /= total;
  pAway /= total;
  
  let pBTTS = 0;
  for (let i = 1; i <= maxGoals; i++) {
    for (let j = 1; j <= maxGoals; j++) {
      pBTTS += poissonPMF(adjHome, i) * poissonPMF(adjAway, j) * dixonColesFactor;
    }
  }
  
  let pO25 = 0;
  for (let i = 0; i <= maxGoals; i++) {
    for (let j = 0; j <= maxGoals; j++) {
      if (i + j > 2.5) {
        pO25 += poissonPMF(adjHome, i) * poissonPMF(adjAway, j) * dixonColesFactor;
      }
    }
  }
  
  console.log('Probabilidades calculadas:', { pHome, pDraw, pAway, pBTTS, pO25 });
  
  return {
    pHome: clamp01(pHome),
    pDraw: clamp01(pDraw),
    pAway: clamp01(pAway),
    pBTTS: clamp01(pBTTS),
    pO25: clamp01(pO25)
  };
}

function calculateAll() {
  const lambdaHome = parseNumberString($('gfHome').value);
  const lambdaAway = parseNumberString($('gfAway').value);
  const leagueCode = $('leagueSelect').value;

  if (lambdaHome <= 0 || lambdaAway <= 0) {
    alert('Por favor, ingrese valores válidos para goles.');
    return;
  }

  const teamHome = findTeam(leagueCode, $('teamHome').value);
  const teamAway = findTeam(leagueCode, $('teamAway').value);
  const pointsHome = teamHome ? teamHome.points : 0;
  const pointsAway = teamAway ? teamHome.points : 0;

  const probs = computeProbabilities(lambdaHome, lambdaAway, pointsHome, pointsAway, leagueCode);
  $('pHome').textContent = formatPct(probs.pHome);
  $('pDraw').textContent = formatPct(probs.pDraw);
  $('pAway').textContent = formatPct(probs.pAway);
  $('pBTTS').textContent = formatPct(probs.pBTTS);
  $('pO25').textContent = formatPct(probs.pO25);

  let details = `<div><strong>Detalles del cálculo:</strong></div>`;
  details += `<div>• Lambda Local ajustado: ${formatDec(lambdaHome * calculateHomeAdvantage(leagueCode))}</div>`;
  details += `<div>• Lambda Visitante ajustado: ${formatDec(lambdaAway)}</div>`;
  
  $('details').innerHTML = details;
}
