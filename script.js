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
// Caché para factorial (mejora eficiencia)
const factorialCache = [1, 1];
function factorial(n) {
if (n < 0) return 0;
if (factorialCache[n] !== undefined) return factorialCache[n];
factorialCache[n] = n * factorial(n - 1);
return factorialCache[n];
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
// CONFIGURACIÓN DE LIGAS (igual)
// ----------------------
const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbwhxSccznUNIZFSfNKygHE--qPK4vn6KtxW5iyYrj0BmM_efw18_IWAUEcwNBzlFqBhcA/exec";
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
// NORMALIZACIÓN DE DATOS (igual, removí logs innecesarios)
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
r.logoUrl = raw.logoUrl || '';
return r;
}
// ----------------------
// FETCH EQUIPOS (igual, removí logs innecesarios)
// ----------------------
async function fetchTeams() {
const leagueSelect = $('leagueSelect');
if (leagueSelect) leagueSelect.innerHTML = '<option value="">Cargando ligas...</option>';
try {
const res = await fetch(WEBAPP_URL);
if (!res.ok) {
const errorText = await res.text();
throw new Error(Error HTTP ${res.status}: ${res.statusText}. Respuesta: ${errorText});
}
const data = await res.json();
const normalized = {};
for (const key in data) {
normalized[key] = (data[key] || []).map(normalizeTeam).filter(t => t && t.name);
}
teamsByLeague = normalized;
localStorage.setItem('teamsByLeague', JSON.stringify(normalized));
return normalized;
} catch (err) {
console.error('Error en fetchTeams:', err);
$('details').innerHTML = <div class="error"><strong>Error:</strong> No se pudieron cargar los datos de la API. Detalle: ${err.message}</div>;
return {};
}
}
// ----------------------
// INICIALIZACIÓN (igual)
// ----------------------
async function init() {
clearTeamData('Home');
clearTeamData('Away');
updateCalcButton();
teamsByLeague = await fetchTeams();
const leagueSelect = $('leagueSelect');
const teamHomeSelect = $('teamHome');
const teamAwaySelect = $('teamAway');
if (!leagueSelect || !teamHomeSelect || !teamAwaySelect) {
$('details').innerHTML = 'Error: Problema con la interfaz HTML.';
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
}
document.addEventListener('DOMContentLoaded', init);
// ----------------------
// FUNCIONES AUXILIARES (igual)
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
$('details').innerHTML = 'Error: No puedes seleccionar el mismo equipo para local y visitante.';
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
    
      Rendimiento General
      
        PJ: 0
        Puntos: 0
        DG: 0
      
    
    
      Rendimiento de Local
      
        PJ: 0
        PG: 0
        DG: 0
      
    
    
      Rendimiento de Visitante
      
        PJ: 0
        PG: 0
        DG: 0
      
    
    PJ: Partidos Jugados, Puntos: Puntos Totales, PG: Partidos Ganados, DG: Diferencia de Goles
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
['pHome','pDraw','pAway','pBTTS','pO25','details','homeAdvantageFactor','strengthFactor','dixonColesFactor','suggestion'].forEach(id => {
const el = $(id);
if (el) el.textContent = '—';
});
['formHomeTeam','formAwayTeam'].forEach(id => $(id).innerHTML = id.includes('Home') ? 'Local: —' : 'Visitante: —');
clearTeamData('Home');
clearTeamData('Away');
updateCalcButton();
}
// ----------------------
// BÚSQUEDA Y LLENADO DE EQUIPO (igual, removí logs)
// ----------------------
function findTeam(leagueCode, teamName) {
if (!teamsByLeague[leagueCode]) return null;
return teamsByLeague[leagueCode].find(t => t.name === teamName) || null;
}
function fillTeamData(teamName, leagueCode, type) {
const t = findTeam(leagueCode, teamName);
if (!t) {
console.error(Equipo no encontrado: ${teamName} en liga ${leagueCode});
return;
}
const lambda = type === 'Home' ? (t.pjHome ? t.gfHome / t.pjHome : t.gf / (t.pj || 1)) : (t.pjAway ? t.gfAway / t.pjAway : t.gf / (t.pj || 1));
const gaAvg = type === 'Home' ? (t.pjHome ? t.gaHome / t.pjHome : t.ga / (t.pj || 1)) : (t.pjAway ? t.gaAway / t.pjAway : t.ga / (t.pj || 1));
const dg = t.gf - t.ga;
const dgHome = t.gfHome - t.gaHome;
const dgAway = t.gfAway - t.gaAway;
const box = $(type === 'Home' ? 'formHomeBox' : 'formAwayBox');
box.innerHTML = `
    
      Rendimiento General
      
        PJ: ${t.pj || 0}
        Puntos: ${t.points || 0}
        DG: ${dg >= 0 ? '+' + dg : dg || 0}
      
    
    
      Rendimiento de Local
      
        PJ: ${t.pjHome || 0}
        PG: ${t.winsHome || 0}
        DG: ${dgHome >= 0 ? '+' + dgHome : dgHome || 0}
      
    
    
      Rendimiento de Visitante
      
        PJ: ${t.pjAway || 0}
        PG: ${t.winsAway || 0}
        DG: ${dgAway >= 0 ? '+' + dgAway : dgAway || 0}
      
    
    PJ: Partidos Jugados, Puntos: Puntos Totales, PG: Partidos Ganados, DG: Diferencia de Goles
  `;
if (type === 'Home') {
$('posHome').value = t.pos || 0;
$('gfHome').value = formatDec(lambda);
$('gaHome').value = formatDec(gaAvg);
$('winRateHome').value = formatPct(t.pjHome ? t.winsHome / t.pjHome : 0);
$('formHomeTeam').innerHTML = t.logoUrl
? <img src="${t.logoUrl}" alt="${t.name} logo" class="team-logo"> Local: ${t.name}
: Local: ${t.name};
} else {
$('posAway').value = t.pos || 0;
$('gfAway').value = formatDec(lambda);
$('gaAway').value = formatDec(gaAvg);
$('winRateAway').value = formatPct(t.pjAway ? t.winsAway / t.pjAway : 0);
$('formAwayTeam').innerHTML = t.logoUrl
? <img src="${t.logoUrl}" alt="${t.name} logo" class="team-logo"> Visitante: ${t.name}
: Visitante: ${t.name};
}
}
// ----------------------
// CÁLCULO PRINCIPAL (mejorado: removí Elo, agregué BTTS/O25 en DC, check PJ, maxGoals=15)
// ----------------------
function calculateAll() {
const teamHome = $('teamHome').value;
const teamAway = $('teamAway').value;
const league = $('leagueSelect').value;
if (!teamHome || !teamAway || !league) {
$('details').innerHTML = 'Error: Selecciona una liga y ambos equipos.';
return;
}
const tH = findTeam(league, teamHome);
const tA = findTeam(league, teamAway);
if (!tH || !tA) {
$('details').innerHTML = 'Error: Equipos no encontrados.';
return;
}
// Check de jornadas mínimas
let warning = '';
if (tH.pj < 5 || tA.pj < 5) {
warning = 'Advertencia: Al menos un equipo tiene menos de 5 partidos jugados. Las predicciones pueden ser menos precisas en etapas tempranas de la liga (ideal: 10+ jornadas).';
}
// Calcular promedios de la liga (agregué fallback si totalGames=0)
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
// Ataque y defensa ajustados (igual)
const attackH = (tH.pjHome || tH.pj) > 0 ? (tH.gfHome || tH.gf) / (tH.pjHome || tH.pj) / avgGh : 1;
const defenseA = (tA.pjAway || tA.pj) > 0 ? (tA.gaAway || tA.ga) / (tA.pjAway || tA.pj) / avgGh : 1;
const lambdaH = attackH * defenseA * avgGh;
const attackA = (tA.pjAway || tA.pj) > 0 ? (tA.gfAway || tA.gf) / (tA.pjAway || tA.pj) / avgGa : 1;
const defenseH = (tH.pjHome || tH.pj) > 0 ? (tH.gaHome || tH.ga) / (tH.pjHome || tH.pj) / avgGa : 1;
const lambdaA = attackA * defenseH * avgGa;
// Método 1: Poisson
let pHomeP = 0;
let pDrawP = 0;
let pAwayP = 0;
let pBTTSP = 0;
let pO25P = 0;
const maxGoals = 15; // Aumentado para mejor precisión
for (let h = 0; h <= maxGoals; h++) {
for (let a = 0; a <= maxGoals; a++) {
const prob = poissonProb(lambdaH, h) * poissonProb(lambdaA, a);
if (h > a) pHomeP += prob;
else if (h === a) pDrawP += prob;
else pAwayP += prob;
if (h >= 1 && a >= 1) pBTTSP += prob;
if (h + a > 2) pO25P += prob;
}
}
// Método 2: Dixon-Coles (agregué BTTS y O25 aquí)
let pHomeDC = 0;
let pDrawDC = 0;
let pAwayDC = 0;
let pBTTSDC = 0;
let pO25DC = 0;
for (let h = 0; h <= maxGoals; h++) {
for (let a = 0; a <= maxGoals; a++) {
const prob = dixonColesAdjustment(lambdaH, lambdaA, h, a, 0.9);
if (h > a) pHomeDC += prob;
else if (h === a) pDrawDC += prob;
else pAwayDC += prob;
if (h >= 1 && a >= 1) pBTTSDC += prob;
if (h + a > 2) pO25DC += prob;
}
}
// Normalizar Dixon-Coles
const totalDC = pHomeDC + pDrawDC + pAwayDC;
if (totalDC > 0) {
pHomeDC /= totalDC;
pDrawDC /= totalDC;
pAwayDC /= totalDC;
pBTTSDC /= totalDC; // Normalizar también
pO25DC /= totalDC;
}
// Promediar probabilidades (solo Poisson + DC)
const avgHome = (tH.pj && tA.pj) ? (pHomeP + pHomeDC) / 2 : 0.33;
const avgDraw = (tH.pj && tA.pj) ? (pDrawP + pDrawDC) / 2 : 0.33;
const avgAway = (tH.pj && tA.pj) ? (pAwayP + pAwayDC) / 2 : 0.33;
const avgBTTS = (tH.pj && tA.pj) ? (pBTTSP + pBTTSDC) / 2 : 0.5;
const avgO25 = (tH.pj && tA.pj) ? (pO25P + pO25DC) / 2 : 0.5;
// Normalizar resultados principales
const totalAvg = avgHome + avgDraw + avgAway;
const finalHome = totalAvg > 0 ? avgHome / totalAvg : 0.33;
const finalDraw = totalAvg > 0 ? avgDraw / totalAvg : 0.33;
const finalAway = totalAvg > 0 ? avgAway / totalAvg : 0.33;
// Mostrar probabilidades
$('pHome').textContent = formatPct(finalHome);
$('pDraw').textContent = formatPct(finalDraw);
$('pAway').textContent = formatPct(finalAway);
$('pBTTS').textContent = formatPct(avgBTTS);
$('pO25').textContent = formatPct(avgO25);
// Factores de corrección (removí strength de Elo, mantengo diff PPG simple)
const homeAdvantage = formatDec(avgGh / (avgGa || 1));
const ppgH = tH.points / (tH.pj || 1);
const ppgA = tA.points / (tA.pj || 1);
const strengthDiff = formatDec(ppgH - ppgA);
const dixonColes = '0.90';
$('homeAdvantageFactor').textContent = homeAdvantage;
$('strengthFactor').textContent = strengthDiff;
$('dixonColesFactor').textContent = dixonColes;
// Recomendación (agregué warning)
const outcomes = [
{ name: ${teamHome} gana, prob: finalHome },
{ name: 'Empate', prob: finalDraw },
{ name: ${teamAway} gana, prob: finalAway }
];
const maxOutcome = outcomes.reduce((max, curr) => curr.prob > max.prob ? curr : max, outcomes[0] || { name: 'Empate', prob: 0.33 });
let suggestionText = <span class="star">★</span><span class="main-bet">🏆 Apuesta principal: <strong>${maxOutcome.name} (${formatPct(maxOutcome.prob)})</strong></span>;
const others = [
✔ Ambos anotan (${formatPct(avgBTTS)}),
✔ +2.5 goles (${formatPct(avgO25)})
];
suggestionText += <ul class="other-bets">${others.map(bet => ${bet}).join('')}</ul>;
$('details').innerHTML = ${warning}Basado en datos ajustados por rendimiento local/visitante y métodos Poisson + Dixon-Coles.;
$('suggestion').innerHTML = suggestionText;
// Animación (igual)
const suggestionEl = $('suggestion');
suggestionEl.classList.add('pulse');
setTimeout(() => suggestionEl.classList.remove('pulse'), 1000);
}
