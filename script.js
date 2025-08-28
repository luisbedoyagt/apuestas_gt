const $ = id => document.getElementById(id);
const formatPct = x => (100 * (isFinite(x) ? x : 0)).toFixed(1) + '%';
const formatDec = x => (isFinite(x) ? x.toFixed(2) : '0.00');
const parseNumberString = val => {
const s = String(val || '').replace(/,/g, '.');
const n = Number(s);
return isFinite(n) ? n : 0;
};

const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbxU_lVAprIelInF7lBffqogTsQhyRlxmk0gjDEqa7VGR9OzxdJ50QQnrAX5r30IeXWN-Q/exec";
let teamsByLeague = {};
const sheetNames = {
  "LaLiga España": "España_LaLiga",
  "Liga MX México": "México_LigaMX",
  "MLS Estados Unidos": "EstadosUnidos_MLS",
  "Liga Nacional Guatemala": "Guatemala_LigaNacional",
  "Liga Promerica Costa Rica": "CostaRica_LigaPromerica",
  "Liga Nacional Honduras": "Honduras_LigaNacional",
  "Serie A Italia": "Italia_SerieA",
  "Bundesliga Alemania": "Alemania_Bundesliga",
  "Ligue 1 Francia": "Francia_Ligue1",
  "Eredivisie Países Bajos": "PaísesBajos_Eredivisie",
  "Premier League Inglaterra": "Inglaterra_PremierLeague",
  "Liga Portugal": "Portugal_LigaPortugal",
  "UEFA Champions League": "UEFA_Champions",
  "UEFA Europa League": "UEFA_Europa",
  "Brasileirão Brasil": "Brasil_Brasileirao"
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
r.gfHome = parseNumberString(raw.gfHome || raw.goalsForHome || 0); // Goles en casa
r.gfAway = parseNumberString(raw.gfAway || raw.goalsForAway || 0); // Goles fuera
r.recentGoals = parseNumberString(raw.recentGoals || 0); // Goles en últimos 5 partidos
r.recentMatches = parseNumberString(raw.recentMatches || 0); // Partidos recientes
r.possession = parseNumberString(raw.possession || 50); // Posesión promedio
return r;
}

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
if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
throw new Error('Datos vacíos o inválidos de la API');
}
const normalized = {};
for (const key in data) {
normalized[key] = (data[key] || []).map(normalizeTeam).filter(t => t && t.name);
if (normalized[key].length === 0) {
console.warn(`No se encontraron equipos válidos para la liga ${key}`);
}
}
teamsByLeague = normalized;
localStorage.setItem('teamsByLeague', JSON.stringify(normalized));
console.log('Datos obtenidos de la API:', Object.keys(teamsByLeague));
console.timeEnd('fetchTeams');
return normalized;
} catch (err) {
console.error('Error en fetchTeams:', err);
$('details').innerHTML = '<div class="error"><strong>Error:</strong> No se pudieron cargar los datos de la API. Verifica la conexión o la URL.</div>';
return {};
}
}

async function init() {
teamsByLeague = await fetchTeams();
const leagueSelect = $('leagueSelect');
const teamHomeSelect = $('teamHome');
const teamAwaySelect = $('teamAway');

if (!leagueSelect || !teamHomeSelect || !teamAwaySelect) {
$('details').innerHTML = '<div class="error"><strong>Error:</strong> Problema con la interfaz. Verifica los elementos HTML.</div>';
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

function onLeagueChange() {
console.time('onLeagueChange');
const code = $('leagueSelect').value;
const teamHomeSelect = $('teamHome');
const teamAwaySelect = $('teamAway');
teamHomeSelect.innerHTML = '<option value="">Cargando equipos...</option>';
teamAwaySelect.innerHTML = '<option value="">Cargando equipos...</option>';

if (!code || !teamsByLeague[code] || teamsByLeague[code].length === 0) {
$('details').innerHTML = '<div class="error"><strong>Error:</strong> No hay equipos disponibles para la liga seleccionada.</div>';
clearTeamData('Home');
clearTeamData('Away');
updateCalcButton();
console.timeEnd('onLeagueChange');
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
console.log(`Equipos cargados para la liga ${code}:`, teamsByLeague[code].map(t => t.name));
console.timeEnd('onLeagueChange');
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
$('pHome').parentElement.querySelector('.small').textContent = 'Probabilidad: —';
} else {
$('posAway').value = '—';
$('gfAway').value = '—';
$('gaAway').value = '—';
$('formAwayTeam').textContent = 'Visitante: —';
$('formAwayBox').textContent = 'PJ: — | G: — | E: — | P: —';
$('pAway').parentElement.querySelector('.small').textContent = 'Probabilidad: —';
}
['pHome', 'pDraw', 'pAway', 'pBTTS', 'pO25'].forEach(id => {
const el = $(id);
if (el) el.textContent = '—';
});
$('pDraw').parentElement.querySelector('.small').textContent = 'Probabilidad: Empate';
$('pBTTS').parentElement.querySelector('.small').textContent = 'Probabilidad: Ambos anotan';
$('pO25').parentElement.querySelector('.small').textContent = 'Probabilidad: Más de 2.5 goles';
$('homeAdvantageFactor').textContent = '—';
$('strengthFactor').textContent = '—';
$('dixonColesFactor').textContent = '—';
$('suggestion').innerHTML = 'Esperando datos para tu apuesta estelar...';
}

function findTeam(leagueCode, teamName) {
if (!teamsByLeague[leagueCode]) {
console.warn(`Liga ${leagueCode} no encontrada en teamsByLeague`);
return null;
}
const team = teamsByLeague[leagueCode].find(t => t.name === teamName);
if (!team) console.warn(`Equipo ${teamName} no encontrado en la liga ${leagueCode}`);
return team || null;
}

function fillTeamData(teamName, leagueCode, type) {
if (!teamName || !leagueCode) {
$('details').innerHTML = '<div class="error"><strong>Error:</strong> Selecciona una liga y un equipo válidos.</div>';
return;
}
const t = findTeam(leagueCode, teamName);
if (!t) {
$('details').innerHTML = '<div class="error"><strong>Error:</strong> Equipo no encontrado en los datos de la liga.</div>';
return;
}

console.log(`Llenando datos para ${type}:`, t);
const lambda = t.recentMatches > 0 ? t.recentGoals / t.recentMatches : (type === 'Home' && t.gfHome ? t.gfHome / t.pj : t.gfAway ? t.gfAway / t.pj : t.gf / t.pj) || 0;
const gaAvg = t.pj > 0 ? t.ga / t.pj : 0;
if (type === 'Home') {
$('posHome').value = t.pos || '—';
$('gfHome').value = formatDec(lambda);
$('gaHome').value = formatDec(gaAvg);
$('formHomeTeam').textContent = `Local: ${t.name}`;
$('formHomeBox').textContent = `PJ: ${t.pj || 0} | G: ${t.g || 0} | E: ${t.e || 0} | P: ${t.p || 0}`;
$('pHome').parentElement.querySelector('.small').textContent = `Probabilidad: ${t.name}`;
} else {
$('posAway').value = t.pos || '—';
$('gfAway').value = formatDec(lambda);
$('gaAway').value = formatDec(gaAvg);
$('formAwayTeam').textContent = `Visitante: ${t.name}`;
$('formAwayBox').textContent = `PJ: ${t.pj || 0} | G: ${t.g || 0} | E: ${t.e || 0} | P: ${t.p || 0}`;
$('pAway').parentElement.querySelector('.small').textContent = `Probabilidad: ${t.name}`;
}
$('pDraw').parentElement.querySelector('.small').textContent = 'Probabilidad: Empate';
$('pBTTS').parentElement.querySelector('.small').textContent = 'Probabilidad: Ambos anotan';
$('pO25').parentElement.querySelector('.small').textContent = 'Probabilidad: Más de 2.5 goles';
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
updateCalcButton();
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
const teams = teamsByLeague[leagueCode] || [];
const avgGoals = teams.length > 0 ? teams.reduce((sum, t) => sum + (t.gf / (t.pj || 1)), 0) / teams.length : 2.5;
const rho = Math.min(-0.05, Math.max(-0.2, -0.1 * (avgGoals / 2.5))); // Rango dinámico
if (!isFinite(lambdaHome) || !isFinite(lambdaAway) || lambdaHome < 0.01 || lambdaAway < 0.01) {
console.warn('Datos inválidos para Dixon-Coles:', { lambdaHome, lambdaAway });
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
const factor = originalProbs > 0 ? adjustedProbs / originalProbs : 1;
console.log('Dixon-Coles adjustment:', { prob00, adjustedProb00, prob10, adjustedProb10, prob01, adjustedProb01, prob11, adjustedProb11, factor, rho });
return factor;
}

function calculateStrengthFactor(posHome, posAway, leagueCode, pointsHome, pointsAway, recentWinsHome, recentWinsAway) {
const maxTeams = teamsByLeague[leagueCode]?.length || 20;
if (!posHome || !posAway || !maxTeams || !pointsHome || !pointsAway) {
console.warn('Datos insuficientes para calcular strengthFactor:', { posHome, posAway, maxTeams, pointsHome, pointsAway });
return 1;
}
const normalizedHome = (maxTeams - posHome + 1) / maxTeams;
const normalizedAway = (maxTeams - posAway + 1) / maxTeams;
const ppgHome = pointsHome / (parseNumberString($('gfHome').value) || 1);
const ppgAway = pointsAway / (parseNumberString($('gfAway').value) || 1);
const recentFormFactor = (recentWinsHome / 5) / (recentWinsAway / 5 || 1) || 1;
const eloFactor = (normalizedHome / normalizedAway) * (ppgHome / ppgAway || 1) * recentFormFactor;
const strengthFactor = Math.min(Math.max(Math.sqrt(eloFactor), 0.5), 2.0);
console.log('Strength factor calculation:', { normalizedHome, normalizedAway, ppgHome, ppgAway, recentFormFactor, eloFactor, strengthFactor });
return strengthFactor;
}

function calculateHomeAdvantage(leagueCode) {
const teams = teamsByLeague[leagueCode] || [];
const avgGoals = teams.length > 0 ? teams.reduce((sum, t) => sum + (t.gf / (t.pj || 1)), 0) / teams.length : 2.5;
const avgGoalsHome = teams.length > 0 ? teams.reduce((sum, t) => sum + (t.gfHome || t.gf * 1.2) / (t.pj || 1), 0) / teams.length : avgGoals * 1.2;
const avgGoalsAway = teams.length > 0 ? teams.reduce((sum, t) => sum + (t.gfAway || t.gf * 0.8) / (t.pj || 1), 0) / teams.length : avgGoals * 0.8;
const factor = 1 + (avgGoalsHome - avgGoalsAway) * 0.2;
console.log('Home advantage calculation:', { leagueCode, avgGoals, avgGoalsHome, avgGoalsAway, factor });
return factor;
}

function computeProbabilities(lambdaHome, lambdaAway, pointsHome, pointsAway, leagueCode, recentWinsHome, recentWinsAway, possessionHome, possessionAway) {
if (!isFinite(lambdaHome) || !isFinite(lambdaAway) || lambdaHome <= 0 || lambdaAway <= 0) {
$('details').innerHTML = '<div class="error"><strong>Error:</strong> Los datos de goles no son válidos. Verifica las estadísticas de los equipos.</div>';
console.error('Datos de goles inválidos:', { lambdaHome, lambdaAway });
return { pHome: 0, pDraw: 0, pAway: 0, pBTTS: 0, pO25: 0 };
}
const homeAdvantageFactor = calculateHomeAdvantage(leagueCode);
const posHome = parseNumberString($('posHome').value);
const posAway = parseNumberString($('posAway').value);
const strengthFactor = calculateStrengthFactor(posHome, posAway, leagueCode, pointsHome, pointsAway, recentWinsHome, recentWinsAway);
const dixonColesFactor = dixonColesAdjustment(lambdaHome, lambdaAway, leagueCode);

const possessionAdjustmentHome = possessionHome / 50;
const possessionAdjustmentAway = possessionAway / 50;

$('homeAdvantageFactor').textContent = formatDec(homeAdvantageFactor) + 'x';
$('strengthFactor').textContent = formatDec(strengthFactor) + 'x';
$('dixonColesFactor').textContent = formatDec(dixonColesFactor) + 'x';

const adjHome = Math.min(lambdaHome * homeAdvantageFactor * strengthFactor * possessionAdjustmentHome, 3.0);
const adjAway = Math.max(lambdaAway / strengthFactor * possessionAdjustmentAway, 0.1);

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
$('details').innerHTML = '<div class="error"><strong>Error:</strong> Cálculo de probabilidades falló debido a datos inválidos.</div>';
console.error('Cálculo de probabilidades falló:', { pHome, pDraw, pAway, total });
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

console.log('Probabilities calculated:', { pHome, pDraw, pAway, pBTTS, pO25, adjHome, adjAway });
return {
pHome: clamp01(pHome),
pDraw: clamp01(pDraw),
pAway: clamp01(pAway),
pBTTS: clamp01(pBTTS),
pO25: clamp01(pO25)
};
}

function calculateAll() {
console.time('calculateAll');
if (!restrictSameTeam()) {
console.timeEnd('calculateAll');
return;
}
const leagueCode = $('leagueSelect').value;
const teamHomeName = $('teamHome').value || 'Local';
const teamAwayName = $('teamAway').value || 'Visitante';
const teamHome = findTeam(leagueCode, teamHomeName);
const teamAway = findTeam(leagueCode, teamAwayName);

if (!leagueCode) {
$('details').innerHTML = '<div class="error"><strong>Error:</strong> Selecciona una liga válida.</div>';
$('suggestion').innerHTML = 'Esperando datos para tu apuesta estelar...';
console.timeEnd('calculateAll');
return;
}

if (!teamHome || !teamAway) {
$('details').innerHTML = '<div class="error"><strong>Error:</strong> Selecciona ambos equipos válidos para calcular las probabilidades.</div>';
$('suggestion').innerHTML = 'Esperando datos para tu apuesta estelar...';
console.timeEnd('calculateAll');
return;
}

if (teamHome.pj < 5 || teamAway.pj < 5) {
$('details').innerHTML = '<div class="error"><strong>Advertencia:</strong> Uno o ambos equipos tienen menos de 5 partidos jugados, lo que puede reducir la precisión de las probabilidades.</div>';
}

const lambdaHome = teamHome.recentMatches > 0 ? teamHome.recentGoals / teamHome.recentMatches : (teamHome.gfHome ? teamHome.gfHome / teamHome.pj : teamHome.gf / teamHome.pj) || 0;
const lambdaAway = teamAway.recentMatches > 0 ? teamAway.recentGoals / teamAway.recentMatches : (teamAway.gfAway ? teamAway.gfAway / teamAway.pj : teamAway.gf / teamAway.pj) || 0;

if (lambdaHome <= 0 || lambdaAway <= 0) {
$('details').innerHTML = '<div class="error"><strong>Error:</strong> Los datos de goles no son válidos. Verifica las estadísticas de los equipos.</div>';
$('suggestion').innerHTML = 'Esperando datos para tu apuesta estelar...';
console.timeEnd('calculateAll');
return;
}

const pointsHome = teamHome.points;
const pointsAway = teamAway.points;
const recentWinsHome = teamHome.g || 0; // Aproximación si no hay datos recientes
const recentWinsAway = teamAway.g || 0;
const possessionHome = teamHome.possession || 50;
const possessionAway = teamAway.possession || 50;

const probs = computeProbabilities(lambdaHome, lambdaAway, pointsHome, pointsAway, leagueCode, recentWinsHome, recentWinsAway, possessionHome, possessionAway);
$('pHome').textContent = formatPct(probs.pHome);
$('pDraw').textContent = formatPct(probs.pDraw);
$('pAway').textContent = formatPct(probs.pAway);
$('pBTTS').textContent = formatPct(probs.pBTTS);
$('pO25').textContent = formatPct(probs.pO25);

let details = `<div><strong>Detalles del cálculo:</strong></div>`;
details += `<div>• Equipo Local: ${teamHomeName} (Lambda: ${formatDec(lambdaHome)})</div>`;
details += `<div>• Equipo Visitante: ${teamAwayName} (Lambda: ${formatDec(lambdaAway)})</div>`;
details += `<div>• Lambda Local ajustado: ${formatDec(lambdaHome * calculateHomeAdvantage(leagueCode))}</div>`;
details += `<div>• Lambda Visitante ajustado: ${formatDec(lambdaAway)}</div>`;
details += `<div>• Posesión Local: ${possessionHome}% | Visitante: ${possessionAway}%</div>`;
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
console.log('Calculation completed:', recommendations);
console.timeEnd('calculateAll');
}



