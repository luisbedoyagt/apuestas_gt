console.log("Script.js cargado correctamente");

const $ = id => document.getElementById(id);
const formatPct = x => (100 * (isFinite(x) ? x : 0)).toFixed(1) + '%';
const formatDec = x => (isFinite(x) ? x.toFixed(2) : '0.00');
function parseNumberString(val) { 
  const s = String(val || '').replace(/,/g, '.'); 
  const n = Number(s); 
  return isFinite(n) ? n : 0; 
}
function toDecimalOdds(v) { 
  const a = parseFloat(String(v).replace(/,/g, '.')); 
  return isNaN(a) || a <= 1 ? 1.01 : a; 
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
  if (!raw) return null;
  const r = {};
  r.name = raw.name || raw.Team || raw.team?.name || raw.teamName || raw.team_name || raw['Equipo'] || raw['team'] || raw['team_name'] || raw['team.shortName'] || '';
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
    const normalized = {};
    for (const key in data) { 
      const arr = data[key] || []; 
      normalized[key] = arr.map(x => normalizeTeam(x)); 
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
    leagueCodes.forEach(code => { 
      const opt = document.createElement('option'); 
      opt.value = code; 
      opt.textContent = leagueNames[code] || code; 
      $('leagueSelect').appendChild(opt); 
    });
    const saved = localStorage.getItem('bankroll');
    if (saved) $('bankroll').value = saved;
    $('leagueSelect').addEventListener('change', onLeagueChange);
    $('teamHome').addEventListener('change', () => fillTeamData($('teamHome').value, $('leagueSelect').value, 'Home'));
    $('teamAway').addEventListener('change', () => fillTeamData($('teamAway').value, $('leagueSelect').value, 'Away'));
    $('recalc').addEventListener('click', calculateAll);
    $('reset').addEventListener('click', () => location.reload());
    $('clearAll').addEventListener('click', clearAll);
    $('saveBank').addEventListener('click', saveBankrollToStorage);
    $('homeAdvantage').addEventListener('change', calculateAll);
    $('formWeight').addEventListener('change', calculateAll);
    $('dixonColesParam').addEventListener('change', calculateAll);
    $('maxTeams').addEventListener('change', calculateAll);
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
  $('teamHome').innerHTML = '<option value="">-- Selecciona equipo --</option>';
  $('teamAway').innerHTML = '<option value="">-- Selecciona equipo --</option>';
  if (!teamsByLeague[code]) return;
  teamsByLeague[code].forEach(t => {
    const opt1 = document.createElement('option'); opt1.value = t.name; opt1.textContent = t.name; $('teamHome').appendChild(opt1);
    const opt2 = document.createElement('option'); opt2.value = t.name; opt2.textContent = t.name; $('teamAway').appendChild(opt2);
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
    $('gfHome').value = Number.isFinite(t.gf) ? (t.gf / t.pj).toFixed(2) : '';
    $('gaHome').value = Number.isFinite(t.ga) ? (t.ga / t.pj).toFixed(2) : '';
    $('formHome').value = formString;
    $('formHomeTeam').textContent = `Local: ${t.name}`;
    $('formHomeBox').textContent = `PJ: ${t.pj || 0} | G: ${t.g || 0} | E: ${t.e || 0} | P: ${t.p || 0}`;
  } else {
    $('posAway').value = t.pos || '';
    $('gfAway').value = Number.isFinite(t.gf) ? (t.gf / t.pj).toFixed(2) : '';
    $('gaAway').value = Number.isFinite(t.ga) ? (t.ga / t.pj).toFixed(2) : '';
    $('formAway').value = formString;
    $('formAwayTeam').textContent = `Visitante: ${t.name}`;
    $('formAwayBox').textContent = `PJ: ${t.pj || 0} | G: ${t.g || 0} | E: ${t.e || 0} | P: ${t.p || 0}`;
  }
  calculateAll();
}

function saveBankrollToStorage() {
  const bank = parseNumberString($('bankroll').value);
  if (bank <= 0) {
    alert('La banca debe ser mayor a 0.');
    return;
  }
  localStorage.setItem('bankroll', bank);
  alert('Banca guardada: Q' + bank);
}

function clearAll() {
  document.querySelectorAll('input').forEach(i => {
    if (i.id !== 'bankroll') i.value = '';
  });
  document.querySelectorAll('select').forEach(s => s.selectedIndex = 0);
  ['pHome', 'pDraw', 'pAway', 'pBTTS', 'pO25', 'expectedBest', 'details', 'suggestion', 
   'formHomeTeam', 'formAwayTeam', 'formHomeBox', 'formAwayBox', 
   'homeAdvantageFactor', 'strengthFactor', 'recentFormFactor', 'dixonColesFactor', 
   'kellyStake', 'betAmount'].forEach(id => {
    const el = $(id);
    if (el) el.textContent = id.includes('form') ? 
      (id.includes('Team') ? (id.includes('Home') ? 'Local: —' : 'Visitante: —') : 'PJ: — | G: — | E: — | P: —') : '—';
  });
  $('suggestion').style.display = 'none';
  $('homeAdvantage').value = 15;
  $('formWeight').value = 30;
  $('dixonColesParam').value = -0.13;
  $('maxTeams').value = 20;
  $('formHome').value = '4-1-0';
  $('formAway').value = '0-2-3';
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

function dixonColesAdjustment(lambdaHome, lambdaAway, rho) {
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

function calculateStrengthFactor(posHome, posAway, maxTeams, pointsHome, pointsAway) {
  if (!posHome || !posAway || !maxTeams || !pointsHome || !pointsAway) return 1;
  const normalizedHome = (maxTeams - posHome + 1) / maxTeams;
  const normalizedAway = (maxTeams - posAway + 1) / maxTeams;
  const ppgHome = pointsHome / ($('gfHome').value || 1); // Evitar división por cero
  const ppgAway = pointsAway / ($('gfAway').value || 1);
  const eloFactor = (normalizedHome / normalizedAway) * (ppgHome / ppgAway || 1);
  return Math.sqrt(eloFactor); // Suavizar el factor
}

function calculateFormFactor(formHome, formAway, formWeight) {
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
    const weight = formWeight / 100;
    return 1 + (formFactor - 1) * weight;
  } catch (e) {
    console.error("Error parsing form data:", e);
    return 1;
  }
}

function computeProbabilities(lambdaHome, lambdaAway, pointsHome, pointsAway) {
  const homeAdvantageFactor = 1 + (parseNumberString($('homeAdvantage').value) / 100);
  const posHome = parseNumberString($('posHome').value);
  const posAway = parseNumberString($('posAway').value);
  const maxTeams = parseNumberString($('maxTeams').value);
  const strengthFactor = calculateStrengthFactor(posHome, posAway, maxTeams, pointsHome, pointsAway);
  const formHome = $('formHome').value;
  const formAway = $('formAway').value;
  const formWeight = parseNumberString($('formWeight').value);
  const recentFormFactor = calculateFormFactor(formHome, formAway, formWeight);
  const rho = parseNumberString($('dixonColesParam').value);
  const dixonColesFactor = dixonColesAdjustment(lambdaHome, lambdaAway, rho);
  
  $('homeAdvantageFactor').textContent = formatDec(homeAdvantageFactor) + 'x';
  $('strengthFactor').textContent = formatDec(strengthFactor) + 'x';
  $('recentFormFactor').textContent = formatDec(recentFormFactor) + 'x';
  $('dixonColesFactor').textContent = formatDec(dixonColesFactor) + 'x';
  
  const adjHome = Math.min(lambdaHome * homeAdvantageFactor * strengthFactor * recentFormFactor, 3.0);
  const adjAway = Math.max(lambdaAway / strengthFactor / recentFormFactor, 0.05); // Límite inferior más estricto
  
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
  if (total > 0) {
    pHome /= total;
    pDraw /= total;
    pAway /= total;
  }
  
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

function calculateKellyStake(probability, odds, bankroll, kellyFraction = 0.5) {
  const b = odds - 1;
  const p = probability;
  const q = 1 - p;
  const idealStake = (b * p - q) / b;
  const fractionalStake = Math.max(0, idealStake) * kellyFraction;
  const amount = bankroll * fractionalStake;
  return {
    stakePercent: fractionalStake * 100,
    amount: amount
  };
}

function suggestBet(probObj, odds, bankroll) {
  let bestBet = null;
  let maxEV = -Infinity;
  let bestStake = 0;
  let bestAmount = 0;
  let bestOdds = 0;
  
  const bets = [
    { name: 'Local', prob: probObj.pHome, odds: odds.oddsHome },
    { name: 'Empate', prob: probObj.pDraw, odds: odds.oddsDraw },
    { name: 'Visitante', prob: probObj.pAway, odds: odds.oddsAway },
    { name: 'BTTS Sí', prob: probObj.pBTTS, odds: odds.oddsBTTS },
    { name: 'Over 2.5', prob: probObj.pO25, odds: odds.oddsOver25 }
  ];
  
  bets.forEach(bet => {
    const ev = bet.prob * bet.odds - 1;
    if (ev > maxEV) {
      maxEV = ev;
      bestBet = bet.name;
      bestOdds = bet.odds;
      const kelly = calculateKellyStake(bet.prob, bet.odds, bankroll);
      bestStake = kelly.stakePercent;
      bestAmount = kelly.amount;
    }
  });
  
  return {
    bestBet,
    stakePercent: bestStake,
    amount: bestAmount,
    ev: maxEV,
    odds: bestOdds
  };
}

function calculateAll() {
  const lambdaHome = parseNumberString($('gfHome').value);
  const lambdaAway = parseNumberString($('gfAway').value);
  const bankroll = parseNumberString($('bankroll').value);

  if (lambdaHome <= -1 || lambdaAway <= -1 || bankroll <= -1) {
    alert('Por favor, ingrese valores válidos para goles y banca.');
    return;
  }

  const odds = {
    oddsHome: toDecimalOdds($('oddsHome').value),
    oddsDraw: toDecimalOdds($('oddsDraw').value),
    oddsAway: toDecimalOdds($('oddsAway').value),
    oddsBTTS: toDecimalOdds($('oddsBTTS').value),
    oddsOver25: toDecimalOdds($('oddsOver25').value)
  };

  if (odds.oddsHome < 1 || odds.oddsDraw < 1 || odds.oddsAway < 1 || 
      odds.oddsBTTS < 1 || odds.oddsOver25 < 1) {
    alert('Las cuotas deben ser mayores a 1.0');
    return;
  }

  const teamHome = findTeam($('leagueSelect').value, $('teamHome').value);
  const teamAway = findTeam($('leagueSelect').value, $('teamAway').value);
  const pointsHome = teamHome ? teamHome.points : 0;
  const pointsAway = teamAway ? teamAway.points : 0;

  const probs = computeProbabilities(lambdaHome, lambdaAway, pointsHome, pointsAway);
  $('pHome').textContent = formatPct(probs.pHome);
  $('pDraw').textContent = formatPct(probs.pDraw);
  $('pAway').textContent = formatPct(probs.pAway);
  $('pBTTS').textContent = formatPct(probs.pBTTS);
  $('pO25').textContent = formatPct(probs.pO25);

  const suggestion = suggestBet(probs, odds, bankroll);
  $('expectedBest').textContent = suggestion.bestBet || 'Ninguna';
  $('kellyStake').textContent = formatDec(suggestion.stakePercent) + '%';
  $('betAmount').textContent = 'Q' + formatDec(suggestion.amount);
  
  $('suggestion').textContent = suggestion.bestBet 
    ? `Apuesta sugerida → ${suggestion.bestBet} (Cuota: ${formatDec(suggestion.odds)}): ${formatDec(suggestion.stakePercent)}% de tu banca (EV: ${formatPct(suggestion.ev)})`
    : 'No hay apuesta con valor esperado positivo.';
  $('suggestion').style.display = suggestion.bestBet ? 'block' : 'none';
  
  let details = `<div><strong>Detalles del cálculo:</strong></div>`;
  details += `<div>• Lambda Local ajustado: ${formatDec(lambdaHome * parseNumberString($('homeAdvantage').value / 100 + 1))}</div>`;
  details += `<div>• Lambda Visitante ajustado: ${formatDec(lambdaAway)}</div>`;
  details += `<div>• Valor Esperado (EV) máximo: ${formatPct(suggestion.ev)}</div>`;
  
  $('details').innerHTML = details;
}