const $ = id => document.getElementById(id);
const formatPct = x => (100 * (isFinite(x) ? x : 0)).toFixed(1) + '%';
const formatDec = x => (isFinite(x) ? x.toFixed(2) : '0.00');
const parseNumberString = val => {
  const s = String(val || '').replace(/,/g, '.');
  const n = Number(s);
  return isFinite(n) ? n : 0;
};

const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbxMy0n4GbjzkGxC8NksxW5xX700jhzWERVNhSY5FXjJHHzyYAlikq56c30Zl689Ecsy1Q/exec";
let teamsByLeague = {};
const leagueNames = {
  "WC": "FIFA World Cup", "CL": "UEFA Champions League", "BL1": "Bundesliga",
  "DED": "Eredivisie", "BSA": "Campeonato Brasileiro", "PD": "Liga Española",
  "FL1": "Ligue 1", "ELC": "Championship", "PPL": "Primeira Liga",
  "EC": "European Championship", "SA": "Serie A", "PL": "Premier League"
};

function normalizeTeam(raw) {
  if (!raw) return null;
  const r = {};
  r.name = raw.name || raw.Team || raw.team?.name || raw.teamName || raw.team_name || raw['Equipo'] || raw['team'] || raw['team_name'] || raw['team.shortName'] || '';
  if (!r.name) return null;
  r.pos = parseNumberString(raw.pos || raw.position || raw.rank || 0);
  r.gf = parseNumberString(raw.gf || raw.goalsFor || raw.goals_for || raw.GF || 0);
  r.ga = parseNumberString(raw.ga || raw.goalsAgainst || raw.goals_against || raw.GC || 0);
  r.pj = parseNumberString(raw.PJ || raw.pj || raw.played || raw.playedGames || raw.matches || 0);
  r.g = parseNumberString(raw.G || raw.g || raw.won || raw.W || 0);
  r.e = parseNumberString(raw.E || raw.e || raw.draw || raw.D || raw.draws || 0);
  r.p = parseNumberString(raw.P || raw.p || raw.lost || raw.L || 0);
  r.points = parseNumberString(raw.points || raw.Points || (r.g * 3 + r.e) || 0);
  return r;
}

async function fetchTeams() {
  try {
    const res = await fetch(WEBAPP_URL);
    if (!res.ok) throw new Error(`Error ${res.status}`);
    const data = await res.json();
    if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
      throw new Error('Datos vacíos');
    }
    const normalized = {};
    for (const key in data) {
      normalized[key] = (data[key] || []).map(normalizeTeam).filter(t => t && t.name);
    }
    return normalized;
  } catch (err) {
    $('details').innerHTML = '<div class="error"><strong>Error:</strong> No se pudieron cargar los datos de la API.</div>';
    return {};
  }
}

async function init() {
  teamsByLeague = await fetchTeams();
  const leagueSelect = $('leagueSelect');
  const teamHomeSelect = $('teamHome');
  const teamAwaySelect = $('teamAway');

  if (!leagueSelect || !teamHomeSelect || !teamAwaySelect) {
    $('details').innerHTML = '<div class="error"><strong>Error:</strong> Problema con la interfaz.</div>';
    return;
  }

  leagueSelect.innerHTML = '<option value="">-- Selecciona liga --</option>';
  Object.keys(teamsByLeague).forEach(code => {
    const opt = document.createElement('option');
    opt.value = code;
    opt.textContent = leagueNames[code] || code;
    leagueSelect.appendChild(opt);
  });

  leagueSelect.addEventListener('change', onLeagueChange);
  teamHomeSelect.addEventListener('change', () => {
    if (restrictSameTeam()) {
      fillTeamData($('teamHome').value, $('leagueSelect').value, 'Home');
    }
  });
  teamAwaySelect.addEventListener('change', () => {
    if (restrictSameTeam()) {
      fillTeamData($('teamAway').value, $('leagueSelect').value, 'Away');
    }
  });
  $('recalc').addEventListener('click', calculateAll);
  $('reset').addEventListener('click', clearAll);

  clearAll();
}
document.addEventListener('DOMContentLoaded', init);

function onLeagueChange() {
  const code = $('leagueSelect').value;
  const teamHomeSelect = $('teamHome');
  const teamAwaySelect = $('teamAway');
  teamHomeSelect.innerHTML = '<option value="">-- Selecciona equipo --</option>';
  teamAwaySelect.innerHTML = '<option value="">-- Selecciona equipo --</option>';
  if (!code || !teamsByLeague[code]) {
    $('details').innerHTML = '<div class="error"><strong>Error:</strong> No hay equipos disponibles para la liga seleccionada.</div>';
    return;
  }
  teamsByLeague[code].forEach(t => {
    const opt1 = document.createElement('option');
    opt1.value = t.name;
    opt1.textContent = t.name;
    teamHomeSelect.appendChild(opt1);
    const opt2 = document.createElement('option');
    opt2.value = t.name;
    opt2.textContent = t.name;
    teamAwaySelect.appendChild(opt2);
  });
}

function restrictSameTeam() {
  const teamHome = $('teamHome').value;
  const teamAway = $('teamAway').value;
  if (teamHome && teamAway && teamHome === teamAway) {
    $('details').innerHTML = '<div class="error"><strong>Error:</strong> No puedes seleccionar el mismo equipo para local y visitante.</div>';
    if (document.activeElement === $('teamHome')) {
      $('teamHome').value = '';
    } else {
      $('teamAway').value = '';
    }
    clearTeamData(document.activeElement === $('teamHome') ? 'Home' : 'Away');
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
    $('pHome').parentElement.querySelector('.small').textContent = 'Probabilidad: —';
  } else {
    $('posAway').value = '—';
    $('gfAway').value = '—';
    $('gaAway').value = '—';
    $('formAwayTeam').textContent = 'Visitante: —';
    $('formAwayBox').textContent = 'PJ: — | G: — | E: — | P: —';
    $('pAway').parentElement.querySelector('.small').textContent = 'Probabilidad: —';
  }
  $('pHome').textContent = '—';
  $('pDraw').textContent = '—';
  $('pAway').textContent = '—';
  $('pBTTS').textContent = '—';
  $('pO25').textContent = '—';
  $('pBTTS').parentElement.querySelector('.small').textContent = 'Probabilidad: Ambos anotan';
  $('pO25').parentElement.querySelector('.small').textContent = 'Probabilidad: Más de 2.5 goles';
  $('homeAdvantageFactor').textContent = '—';
  $('strengthFactor').textContent = '—';
  $('dixonColesFactor').textContent = '—';
  $('suggestion').innerHTML = 'Esperando datos para tu apuesta estelar...';
}

function findTeam(leagueCode, teamName) {
  if (!teamsByLeague[leagueCode]) return null;
  return teamsByLeague[leagueCode].find(t => t.name === teamName) || null;
}

function fillTeamData(teamName, leagueCode, type) {
  if (!teamName || !leagueCode) {
    $('details').innerHTML = '<div class="error"><strong>Error:</strong> Selecciona una liga y un equipo.</div>';
    return;
  }
  const t = findTeam(leagueCode, teamName);
  if (!t) {
    $('details').innerHTML = '<div class="error"><strong>Error:</strong> Equipo no encontrado.</div>';
    return;
  }

  if (type === 'Home') {
    $('posHome').value = t.pos || '—';
    $('gfHome').value = t.pj > 0 ? (t.gf / t.pj).toFixed(2) : '—';
    $('gaHome').value = t.pj > 0 ? (t.ga / t.pj).toFixed(2) : '—';
    $('formHomeTeam').textContent = `Local: ${t.name}`;
    $('formHomeBox').textContent = `PJ: ${t.pj || 0} | G: ${t.g || 0} | E: ${t.e || 0} | P: ${t.p || 0}`;
    $('pHome').parentElement.querySelector('.small').textContent = `Probabilidad: ${t.name}`;
  } else {
    $('posAway').value = t.pos || '—';
    $('gfAway').value = t.pj > 0 ? (t.gf / t.pj).toFixed(2) : '—';
    $('gaAway').value = t.pj > 0 ? (t.ga / t.pj).toFixed(2) : '—';
    $('formAwayTeam').textContent = `Visitante: ${t.name}`;
    $('formAwayBox').textContent = `PJ: ${t.pj || 0} | G: ${t.g || 0} | E: ${t.e || 0} | P: ${t.p || 0}`;
    $('pAway').parentElement.querySelector('.small').textContent = `Probabilidad: ${t.name}`;
  }
  $('pDraw').parentElement.querySelector('.small').textContent = 'Probabilidad: Empate';
  $('pBTTS').parentElement.querySelector('.small').textContent = 'Probabilidad: Ambos anotan';
  $('pO25').parentElement.querySelector('.small').textContent = 'Probabilidad: Más de 2.5 goles';

  // Solo calcular si ambos equipos están seleccionados
  const teamHome = $('teamHome').value;
  const teamAway = $('teamAway').value;
  if (teamHome && teamAway && restrictSameTeam()) {
    calculateAll();
  } else {
    $('details').innerHTML = '<div class="error"><strong>ALERTA:</strong> Selecciona ambos equipos para calcular las probabilidades.</div>';
    $('suggestion').innerHTML = 'Esperando datos para tu apuesta estelar...';
  }
}

function clearAll() {
  document.querySelectorAll('input').forEach(i => i.value = '—');
  document.querySelectorAll('select').forEach(s => s.selectedIndex = 0);
  ['pHome', 'pDraw', 'pAway', 'pBTTS', 'pO25', 'details', 'homeAdvantageFactor', 'strengthFactor', 'dixonColesFactor'].forEach(id => {
    const el = $(id);
    if (el) el.textContent = '—';
  });
  ['formHomeTeam', 'formAwayTeam'].forEach(id => $(id).textContent = id.includes('Home') ? 'Local: —' : 'Visitante: —');
  ['formHomeBox', 'formAwayBox'].forEach(id => $(id).textContent = 'PJ: — | G: — | E: — | P: —');
  ['pHome', 'pAway'].forEach(id => $(id).parentElement.querySelector('.small').textContent = 'Probabilidad: —');
  $('pDraw').parentElement.querySelector('.small').textContent = 'Probabilidad: Empate';
  $('pBTTS').parentElement.querySelector('.small').textContent = 'Probabilidad: Ambos anotan';
  $('pO25').parentElement.querySelector('.small').textContent = 'Probabilidad: Más de 2.5 goles';
  $('suggestion').innerHTML = 'Esperando datos para tu apuesta estelar...';
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

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

function dixonColesAdjustment(lambdaHome, lambdaAway, leagueCode) {
  const leagueRhoFactors = { BSA: -0.15, SA: -0.2, PL: -0.1, CL: -0.12 };
  const rho = leagueRhoFactors[leagueCode] || -0.15;
  if (!isFinite(lambdaHome) || !isFinite(lambdaAway) || lambdaHome < 0.01 || lambdaAway < 0.01) return 1;
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

function calculateHomeAdvantage(leagueCode) {
  const leagueHomeFactors = { BSA: 1.15, CL: 1.1, PL: 1.05, SA: 1.1 };
  const teams = teamsByLeague[leagueCode] || [];
  const avgGoals = teams.reduce((sum, t) => sum + (t.gf / (t.pj || 1)), 0) / (teams.length || 1);
  return leagueHomeFactors[leagueCode] || 1 + (avgGoals * 0.1);
}

function computeProbabilities(lambdaHome, lambdaAway, pointsHome, pointsAway, leagueCode) {
  if (!isFinite(lambdaHome) || !isFinite(lambdaAway) || lambdaHome <= 0 || lambdaAway <= 0) {
    $('details').innerHTML = '<div class="error"><strong>Error:</strong> Los datos de goles no son válidos. Verifica las estadísticas de los equipos.</div>';
    return { pHome: 0, pDraw: 0, pAway: 0, pBTTS: 0, pO25: 0 };
  }
  const homeAdvantageFactor = calculateHomeAdvantage(leagueCode);
  const posHome = parseNumberString($('posHome').value);
  const posAway = parseNumberString($('posAway').value);
  const strengthFactor = calculateStrengthFactor(posHome, posAway, leagueCode, pointsHome, pointsAway);
  const dixonColesFactor = dixonColesAdjustment(lambdaHome, lambdaAway, leagueCode);

  $('homeAdvantageFactor').textContent = formatDec(homeAdvantageFactor) + 'x';
  $('strengthFactor').textContent = formatDec(strengthFactor) + 'x';
  $('dixonColesFactor').textContent = formatDec(dixonColesFactor) + 'x';

  const adjHome = Math.min(lambdaHome * homeAdvantageFactor * strengthFactor, 3.0);
  const adjAway = Math.max(lambdaAway / strengthFactor, 0.1);

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
    $('details').innerHTML = '<div class="error"><strong>Error:</strong> Cálculo de probabilidades falló.</div>';
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

  return {
    pHome: clamp01(pHome),
    pDraw: clamp01(pDraw),
    pAway: clamp01(pAway),
    pBTTS: clamp01(pBTTS),
    pO25: clamp01(pO25)
  };
}

function calculateAll() {
  if (!restrictSameTeam()) return;
  const lambdaHome = parseNumberString($('gfHome').value);
  const lambdaAway = parseNumberString($('gfAway').value);
  const leagueCode = $('leagueSelect').value;
  const teamHomeName = $('teamHome').value || 'Local';
  const teamAwayName = $('teamAway').value || 'Visitante';

  if (!leagueCode) {
    $('details').innerHTML = '<div class="error"><strong>Error:</strong> Selecciona una liga.</div>';
    $('suggestion').innerHTML = 'Esperando datos para tu apuesta estelar...';
    return;
  }

  if (!teamHomeName || !teamAwayName) {
    $('details').innerHTML = '<div class="error"><strong>ALERTA:</strong> Selecciona ambos equipos para calcular las probabilidades.</div>';
    $('suggestion').innerHTML = 'Esperando datos para tu apuesta estelar...';
    return;
  }

  if (lambdaHome <= 0 || lambdaAway <= 0) {
    $('details').innerHTML = '<div class="error"><strong>Error:</strong> Los datos de goles no son válidos. Verifica las estadísticas de los equipos.</div>';
    $('suggestion').innerHTML = 'Esperando datos para tu apuesta estelar...';
    return;
  }

  const teamHome = findTeam(leagueCode, teamHomeName);
  const teamAway = findTeam(leagueCode, teamAwayName);
  const pointsHome = teamHome ? teamHome.points : 0;
  const pointsAway = teamAway ? teamAway.points : 0;

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

  const recommendations = [
    { name: `Gana ${teamHomeName}`, prob: probs.pHome },
    { name: 'Empate', prob: probs.pDraw },
    { name: `Gana ${teamAwayName}`, prob: probs.pAway },
    { name: 'BTTS Sí', prob: probs.pBTTS },
    { name: 'Over 2.5', prob: probs.pO25 }
  ];

  const maxProb = Math.max(...recommendations.map(r => r.prob));
  if (maxProb > 0) {
    const bestRecommendation = recommendations.find(r => r.prob === maxProb);
    $('suggestion').innerHTML = `<p><strong>${formatPct(bestRecommendation.prob)}</strong> de acierto<br>Recomendación: ${bestRecommendation.name}<br>Según el pronóstico<br><small>El fútbol es impredecible, ¡apuesta con cautela!</small></p>`;
  } else {
    $('suggestion').innerHTML = 'Esperando datos para tu apuesta estelar...';
  }
}
