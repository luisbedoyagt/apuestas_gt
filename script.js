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
  -- Selecciona liga --
  "WC": "FIFA World Cup", 
  "CL": "UEFA Champions League", 
  "BL1": "Bundesliga", 
  "DED": "Eredivisie", 
  "BSA": "Campeonato Brasileiro", 
  "PD": "Liga Española", 
  "FL1": "Ligue 1", 
  "ELC": "Championship", 
  "PPL": "Primeira Liga", 
  "EC": "European Championship", 
  "SA": "Serie A", 
  "PL": "Premier League" 
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
  r.pos = parseNumberString(raw.pos || raw.position || raw.rank || raw['Pos'] || raw['POS'] || 0);
  r.gf = parseNumberString(raw.gf || raw.goalsFor || raw.goals_for || raw.GF || raw['GF'] || raw['goals'] || raw['goals_for'] || 0);
  r.ga = parseNumberString(raw.ga || raw.goalsAgainst || raw.goals_against || raw.GC || raw['GC'] || raw['goals_against'] || 0);
  r.pj = parseNumberString(raw.PJ || raw.pj || raw.played || raw.playedGames || raw.matches || raw['Matches'] || raw['matches'] || 0);
  r.g = parseNumberString(raw.G || raw.g || raw.won || raw.W || raw.w || 0);
  r.e = parseNumberString(raw.E || raw.e || raw.draw || raw.D || raw.draws || raw.drawn || 0);
  r.p = parseNumberString(raw.P || raw.p || raw.lost || raw.L || raw.l || 0);
  r.points = parseNumberString(raw.points || raw.Points || (r.g * 3 + r.e) || 0);
  console.log('Equipo normalizado:', r);
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
    if ($('details')) {
      $('details').innerHTML = '<div><strong>Error:</strong> No se pudieron cargar los datos de la API. Usando datos de prueba.</div>';
    }
    return {
      "BSA": [
        { name: "CR Flamengo", pos: 1, gf: 44, ga: 9, pj: 20, g: 14, e: 4, p: 2, points: 46 },
        { name: "SC Recife", pos: 20, gf: 12, ga: 30, pj: 19, g: 1, e: 7, p: 11, points: 10 }
      ]
    };
  }
}

async function init() {
  try {
    teamsByLeague = await fetchTeams();
    const leagueCodes = Object.keys(teamsByLeague);
    console.log('Ligas disponibles:', leagueCodes);

    const leagueSelect = $('leagueSelect');
    const teamHomeSelect = $('teamHome');
    const teamAwaySelect = $('teamAway');
    
    if (!leagueSelect || !teamHomeSelect || !teamAwaySelect) {
      console.error('Elementos DOM no encontrados:', { leagueSelect: !!leagueSelect, teamHomeSelect: !!teamHomeSelect, teamAwaySelect: !!teamAwaySelect });
      if ($('details')) {
        $('details').innerHTML = '<div><strong>Error:</strong> Problema con la interfaz. Por favor, recarga la página.</div>';
      }
      return;
    }

    leagueSelect.innerHTML = '<option value="">-- Selecciona liga --</option>';
    leagueCodes.forEach(code => { 
      const opt = document.createElement('option'); 
      opt.value = code; 
      opt.textContent = leagueNames[code] || code; 
      leagueSelect.appendChild(opt); 
    });

    leagueSelect.addEventListener('change', onLeagueChange);
    teamHomeSelect.addEventListener('change', () => fillTeamData($('teamHome').value, $('leagueSelect').value, 'Home'));
    teamAwaySelect.addEventListener('change', () => fillTeamData($('teamAway').value, $('leagueSelect').value, 'Away'));
    $('recalc').addEventListener('click', calculateAll);
    $('reset').addEventListener('click', () => location.reload());
    $('clearAll').addEventListener('click', clearAll);

    // Seleccionar una liga y equipos por defecto para inicializar
    if (leagueCodes.length > 0) {
      leagueSelect.value = leagueCodes[0]; // Seleccionar la primera liga
      onLeagueChange(); // Llenar equipos
      if (teamsByLeague[leagueCodes[0]]?.length >= 2) {
        teamHomeSelect.value = teamsByLeague[leagueCodes[0]][0].name;
        teamAwaySelect.value = teamsByLeague[leagueCodes[0]][1].name;
        fillTeamData(teamHomeSelect.value, leagueCodes[0], 'Home');
        fillTeamData(teamAwaySelect.value, leagueCodes[0], 'Away');
        calculateAll(); // Calcular probabilidades iniciales
      }
    }
  } catch (err) {
    console.error("Error en init:", err);
    if ($('details')) {
      $('details').innerHTML = '<div><strong>Error:</strong> Error al inicializar. Selecciona una liga para continuar.</div>';
    }
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
    if ($('details')) {
      $('details').innerHTML = '<div><strong>Error:</strong> No hay equipos disponibles para la liga seleccionada.</div>';
    }
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
  if (!teamName || !leagueCode) {
    console.warn('teamName o leagueCode vacíos:', { teamName, leagueCode });
    return;
  }
  const t = findTeam(leagueCode, teamName);
  if (!t) {
    console.warn(`Equipo no encontrado: ${teamName} en liga ${leagueCode}`);
    return;
  }

  if (type === 'Home') {
    $('posHome').value = t.pos || '';
    $('gfHome').value = t.pj > 0 ? (t.gf / t.pj).toFixed(2) : '1.0';
    $('gaHome').value = t.pj > 0 ? (t.ga / t.pj).toFixed(2) : '1.0';
    $('formHomeTeam').textContent = `Local: ${t.name}`;
    $('formHomeBox').textContent = `PJ: ${t.pj || 0} | G: ${t.g || 0} | E: ${t.e || 0} | P: ${t.p || 0}`;
  } else {
    $('posAway').value = t.pos || '';
    $('gfAway').value = t.pj > 0 ? (t.gf / t.pj).toFixed(2) : '1.0';
    $('gaAway').value = t.pj > 0 ? (t.ga / t.pj).toFixed(2) : '1.0';
    $('formAwayTeam').textContent = `Visitante: ${t.name}`;
    $('formAwayBox').textContent = `PJ: ${t.pj || 0} | G: ${t.g || 0} | E: ${t.e || 0} | P: ${t.p || 0}`;
  }
  console.log(`fillTeamData ${type}:`, { teamName, pos: t.pos, gf: t.gf, ga: t.ga, pj: t.pj });
  calculateAll();
}

function clearAll() {
  document.querySelectorAll('input').forEach(i => i.value = '');
  document.querySelectorAll('select').forEach(s => s.selectedIndex = 0);
  ['pHome', 'pDraw', 'pAway', 'pBTTS', 'pO25', 'details', 
   'formHomeTeam', 'formAwayTeam', 'formHomeBox', 'formAwayBox', 
   'homeAdvantageFactor', 'strengthFactor', 'dixonColesFactor'].forEach(id => {
    const el = $(id);
    if (el) el.textContent = id.includes('form') ? 
      (id.includes('Team') ? (id.includes('Home') ? 'Local: —' : 'Visitante: —') : 'PJ: — | G: — | E: — | P: —') : '—';
  });
  console.log('clearAll ejecutado');
}

function poissonPMF(lambda, k) { 
  if (k < 0 || !isFinite(lambda) || lambda < 0) return 0;
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
  const rho = -0.15;
  if (!isFinite(lambdaHome) || !isFinite(lambdaAway) || lambdaHome < 0.01 || lambdaAway < 0.01) {
    console.warn('Valores inválidos para Dixon-Coles:', { lambdaHome, lambdaAway });
    return 1;
  }
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
  if (!posHome || !posAway || !maxTeams || !pointsHome || !pointsAway) {
    console.warn('Datos insuficientes para strengthFactor:', { posHome, posAway, maxTeams, pointsHome, pointsAway });
    return 1;
  }
  const normalizedHome = (maxTeams - posHome + 1) / maxTeams;
  const normalizedAway = (maxTeams - posAway + 1) / maxTeams;
  const ppgHome = pointsHome / ($('gfHome').value || 1);
  const ppgAway = pointsAway / ($('gfAway').value || 1);
  const eloFactor = (normalizedHome / normalizedAway) * (ppgHome / ppgAway || 1);
  const strengthFactor = Math.min(Math.max(Math.sqrt(eloFactor), 0.5), 2.0);
  console.log('strengthFactor calculado:', { posHome, posAway, maxTeams, pointsHome, pointsAway, strengthFactor });
  return strengthFactor;
}

function calculateHomeAdvantage(leagueCode) {
  const teams = teamsByLeague[leagueCode] || [];
  const avgGoals = teams.reduce((sum, t) => sum + (t.gf / (t.pj || 1)), 0) / (teams.length || 1);
  const factor = 1 + (avgGoals * 0.1);
  console.log('homeAdvantageFactor calculado:', { leagueCode, avgGoals, factor });
  return isFinite(factor) ? factor : 1.1;
}

function computeProbabilities(lambdaHome, lambdaAway, pointsHome, pointsAway, leagueCode) {
  if (!isFinite(lambdaHome) || !isFinite(lambdaAway) || lambdaHome <= 0 || lambdaAway <= 0) {
    console.warn('Lambdas inválidos:', { lambdaHome, lambdaAway });
    if ($('details')) {
      $('details').innerHTML = '<div><strong>Error:</strong> Valores de goles inválidos.</div>';
    }
    return { pHome: 0, pDraw: 0, pAway: 0, pBTTS: 0, pO25: 0 };
  }
  const homeAdvantageFactor = calculateHomeAdvantage(leagueCode);
  const posHome = parseNumberString($('posHome').value);
  const posAway = parseNumberString($('posAway').value);
  const strengthFactor = calculateStrengthFactor(posHome, posAway, leagueCode, pointsHome, pointsAway);
  const dixonColesFactor = dixonColesAdjustment(lambdaHome, lambdaAway);
  
  $('homeAdvantageFactor').textContent = formatDec(homeAdvantageFactor) + 'x';
  $('strengthFactor').textContent = formatDec(strengthFactor) + 'x';
  $('dixonColesFactor').textContent = formatDec(dixonColesFactor) + 'x';
  
  const adjHome = Math.min(lambdaHome * homeAdvantageFactor * strengthFactor, 3.0);
  const adjAway = Math.max(lambdaAway / strengthFactor, 0.1);
  
  console.log('computeProbabilities:', {
    lambdaHome, lambdaAway, adjHome, adjAway, homeAdvantageFactor, strengthFactor, dixonColesFactor
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
    if ($('details')) {
      $('details').innerHTML = '<div><strong>Error:</strong> Cálculo de probabilidades falló.</div>';
    }
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
  let lambdaHome = parseNumberString($('gfHome').value);
  let lambdaAway = parseNumberString($('gfAway').value);
  const leagueCode = $('leagueSelect').value;

  // Usar valores predeterminados si los inputs están vacíos
  if (!isFinite(lambdaHome) || lambdaHome <= 0) {
    console.warn('lambdaHome inválido, usando 1.0:', lambdaHome);
    lambdaHome = 1.0;
    $('gfHome').value = '1.0';
  }
  if (!isFinite(lambdaAway) || lambdaAway <= 0) {
    console.warn('lambdaAway inválido, usando 1.0:', lambdaAway);
    lambdaAway = 1.0;
    $('gfAway').value = '1.0';
  }

  if (!leagueCode) {
    console.warn('Liga no seleccionada');
    if ($('details')) {
      $('details').innerHTML = '<div><strong>Error:</strong> Selecciona una liga.</div>';
    }
    return;
  }

  const teamHome = findTeam(leagueCode, $('teamHome').value);
  const teamAway = findTeam(leagueCode, $('teamAway').value);
  const pointsHome = teamHome ? teamHome.points : 0;
  const pointsAway = teamAway ? teamAway.points : 0;

  console.log('calculateAll inputs:', {
    lambdaHome, lambdaAway, leagueCode, teamHome: teamHome?.name, teamAway: teamAway?.name, pointsHome, pointsAway
  });

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

  console.log('Resultados actualizados:', {
    pHome: probs.pHome, pDraw: probs.pDraw, pAway: probs.pAway, pBTTS: probs.pBTTS, pO25: probs.pO25
  });
}

