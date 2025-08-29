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

// Caché para factorial
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
// CONFIGURACIÓN DE LIGAS
// ----------------------
const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbxc1RvHBPC6q9KDWCawzfZ65w7rzBxJl2aGSKFwyinJsgFM0FTmX6NKCoTMFIZKsxY-Fg/exec";
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
  r.logoUrl = raw.logoUrl || '';
  return r;
}

// ----------------------
// FETCH EQUIPOS
// ----------------------
async function fetchTeams() {
  const leagueSelect = $('leagueSelect');
  if (leagueSelect) leagueSelect.innerHTML = '<option value="">Cargando ligas...</option>';

  try {
    const res = await fetch(WEBAPP_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
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
    $('details').innerHTML = `<div class="error"><strong>Error:</strong> No se pudieron cargar los datos. Detalle: ${err.message}</div>`;
    if (leagueSelect) leagueSelect.innerHTML = '<option value="">Error al cargar ligas</option>';
    return {};
  }
}

// ----------------------
// GUARDAR APUESTA
// ----------------------
async function saveBet(betData) {
  try {
    const response = await fetch(WEBAPP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(betData)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = await response.json();
    $('details').innerHTML = result.status === 'success'
      ? `<div class="success">Apuesta guardada correctamente.</div>`
      : `<div class="error">${result.message || 'No se pudo guardar la apuesta'}</div>`;
  } catch (err) {
    console.error('Error en saveBet:', err);
    $('details').innerHTML = `<div class="error">No se pudo guardar la apuesta. Detalle: ${err.message}</div>`;
  }
}

// ----------------------
// AUXILIARES DE INTERFAZ
// ----------------------
function findTeam(leagueCode, teamName) {
  if (!teamsByLeague[leagueCode]) return null;
  return teamsByLeague[leagueCode].find(t => t.name === teamName) || null;
}

function clearTeamData(type) {
  const box = $(type === 'Home' ? 'formHomeBox' : 'formAwayBox');
  box.innerHTML = `
    <div class="stat-section">
      <span class="section-title">Rendimiento General</span>
      <div class="stat-metrics">
        <span>PJ: 0</span>
        <span>Puntos: 0</span>
        <span>DG: 0</span>
      </div>
    </div>`;
  if (type === 'Home') {
    $('posHome').value = '0'; $('gfHome').value = '0'; $('gaHome').value = '0'; $('winRateHome').value = '0%';
    $('formHomeTeam').innerHTML = 'Local: —';
  } else {
    $('posAway').value = '0'; $('gfAway').value = '0'; $('gaAway').value = '0'; $('winRateAway').value = '0%';
    $('formAwayTeam').innerHTML = 'Visitante: —';
  }
}

function clearAll() {
  document.querySelectorAll('input').forEach(i => i.value = '0');
  document.querySelectorAll('select').forEach(s => s.selectedIndex = 0);
  ['pHome','pDraw','pAway','pBTTS','pO25','details','homeAdvantageFactor','strengthFactor','dixonColesFactor','suggestion']
    .forEach(id => { const el = $(id); if(el) el.textContent = '—'; });
  ['formHomeTeam','formAwayTeam'].forEach(id => $(id).innerHTML = id.includes('Home') ? 'Local: —' : 'Visitante: —');
  clearTeamData('Home'); clearTeamData('Away'); updateCalcButton();
}

function updateCalcButton() {
  const tH = $('teamHome').value, tA = $('teamAway').value, l = $('leagueSelect').value;
  $('recalc').disabled = !(tH && tA && l && tH!==tA);
  const btn = $('saveBet'); if(btn) btn.disabled = true;
}

function restrictSameTeam() {
  const tH = $('teamHome').value, tA = $('teamAway').value;
  if(tH && tA && tH===tA){
    $('details').innerHTML='<div class="error">No puedes seleccionar el mismo equipo.</div>';
    if(document.activeElement===$('teamHome')){ $('teamHome').value=''; clearTeamData('Home'); } 
    else { $('teamAway').value=''; clearTeamData('Away'); }
    updateCalcButton(); return false;
  }
  return true;
}

function onLeagueChange() {
  const code = $('leagueSelect').value;
  const tHome = $('teamHome'); const tAway = $('teamAway');
  tHome.innerHTML = '<option>Cargando...</option>'; tAway.innerHTML = '<option>Cargando...</option>';
  if(!code || !teamsByLeague[code] || teamsByLeague[code].length===0){
    clearTeamData('Home'); clearTeamData('Away'); updateCalcButton();
    $('details').innerHTML='<div class="warning">No hay datos disponibles para esta liga.</div>'; return;
  }
  const fragHome = document.createDocumentFragment();
  const fragAway = document.createDocumentFragment();
  const defOptH = document.createElement('option'); defOptH.value=''; defOptH.textContent='-- Selecciona equipo --'; fragHome.appendChild(defOptH);
  const defOptA = document.createElement('option'); defOptA.value=''; defOptA.textContent='-- Selecciona equipo --'; fragAway.appendChild(defOptA);
  teamsByLeague[code].forEach(t=>{
    const oH=document.createElement('option'); oH.value=t.name; oH.textContent=t.name; fragHome.appendChild(oH);
    const oA=document.createElement('option'); oA.value=t.name; oA.textContent=t.name; fragAway.appendChild(oA);
  });
  tHome.innerHTML=''; tAway.innerHTML=''; tHome.appendChild(fragHome); tAway.appendChild(fragAway);
  clearTeamData('Home'); clearTeamData('Away'); updateCalcButton();
}

// ----------------------
// INICIALIZACIÓN
// ----------------------
async function init(){
  clearTeamData('Home'); clearTeamData('Away'); updateCalcButton();
  teamsByLeague = await fetchTeams();
  const leagueSelect=$('leagueSelect'), teamHome=$('teamHome'), teamAway=$('teamAway');
  if(!leagueSelect||!teamHome||!teamAway) return;
  leagueSelect.innerHTML='<option value="">-- Selecciona liga --</option>';
  Object.keys(teamsByLeague).sort().forEach(code=>{
    const opt=document.createElement('option'); opt.value=code; opt.textContent=leagueNames[code]||code; leagueSelect.appendChild(opt);
  });
  leagueSelect.addEventListener('change', onLeagueChange);
  teamHome.addEventListener('change',()=>{ if(restrictSameTeam()){ fillTeamData(teamHome.value, leagueSelect.value,'Home'); updateCalcButton(); } });
  teamAway.addEventListener('change',()=>{ if(restrictSameTeam()){ fillTeamData(teamAway.value, leagueSelect.value,'Away'); updateCalcButton(); } });
  $('recalc').addEventListener('click', calculateAll);
  $('reset').addEventListener('click', clearAll);
  
  // Event listener para el botón de guardar
  const saveButton = $('saveBet');
  if (saveButton) {
    saveButton.addEventListener('click', async () => {
      const betData = buildBetData();  // Función para armar los datos
      if (betData) {
        await saveBet(betData);
      } else {
        $('details').innerHTML = '<div class="error">No hay datos para guardar.</div>';
      }
    });
  }
}
document.addEventListener('DOMContentLoaded', init);

// Función para armar betData basada en tus cálculos (ajusta si tus IDs/divs son diferentes)
function buildBetData() {
  const league = $('leagueSelect').value;
  const homeTeam = $('teamHome').value;
  const awayTeam = $('teamAway').value;
  if (!league || !homeTeam || !awayTeam) return null;

  return {
    league: leagueNames[league] || league,
    homeTeam,
    awayTeam,
    homeProb: parseFloat($('pHome').textContent.replace('%', '')) || 0,
    drawProb: parseFloat($('pDraw').textContent.replace('%', '')) || 0,
    awayProb: parseFloat($('pAway').textContent.replace('%', '')) || 0,
    bttsProb: parseFloat($('pBTTS').textContent.replace('%', '')) || 0,
    o25Prob: parseFloat($('pO25').textContent.replace('%', '')) || 0,
    mainBet: $('suggestion').textContent || '',  // Asume que la sugerencia principal está aquí
    bttsRecommendation: 'Sí/No basado en calc',  // Ajusta con tu lógica real
    o25Recommendation: 'Over/Under basado en calc'  // Ajusta con tu lógica real
  };
}

// ----------------------
// FILL TEAM DATA
// ----------------------
function fillTeamData(teamName, leagueCode, type) {
  const team = findTeam(leagueCode, teamName);
  if (!team) {
    clearTeamData(type);
    return;
  }

  const isHome = type === 'Home';
  const boxId = isHome ? 'formHomeBox' : 'formAwayBox';
  const box = $(boxId);
  box.innerHTML = `
    <div class="stat-section">
      <span class="section-title">Rendimiento General</span>
      <div class="stat-metrics">
        <span>PJ: ${team.pj}</span>
        <span>Puntos: ${team.points}</span>
        <span>DG: ${team.gf - team.ga}</span>
      </div>
    </div>
    <div class="stat-section">
      <span class="section-title">${isHome ? 'Local' : 'Visitante'}</span>
      <div class="stat-metrics">
        <span>PJ: ${isHome ? team.pjHome : team.pjAway}</span>
        <span>Victorias: ${isHome ? team.winsHome : team.winsAway}</span>
        <span>GF: ${isHome ? team.gfHome : team.gfAway}</span>
        <span>GC: ${isHome ? team.gaHome : team.gaAway}</span>
      </div>
    </div>`;

  if (isHome) {
    $('posHome').value = team.pos;
    $('gfHome').value = (team.gfHome / team.pjHome) || 0;
    $('gaHome').value = (team.gaHome / team.pjHome) || 0;
    $('winRateHome').value = formatPct(team.winsHome / team.pjHome);
    $('formHomeTeam').innerHTML = `Local: ${teamName}`;
  } else {
    $('posAway').value = team.pos;
    $('gfAway').value = (team.gfAway / team.pjAway) || 0;
    $('gaAway').value = (team.gaAway / team.pjAway) || 0;
    $('winRateAway').value = formatPct(team.winsAway / team.pjAway);
    $('formAwayTeam').innerHTML = `Visitante: ${teamName}`;
  }
}

// ----------------------
// CALCULATE ALL
// ----------------------
function calculateAll() {
  // Asume que aquí haces tus cálculos de Poisson/Dixon-Coles basados en inputs
  // Ejemplo placeholder: calcula probs simples (reemplaza con tu lógica real)
  const homeGF = parseNumberString($('gfHome').value);
  const awayGA = parseNumberString($('gaAway').value);
  const awayGF = parseNumberString($('gfAway').value);
  const homeGA = parseNumberString($('gaHome').value);

  const lambdaHome = homeGF * awayGA;  // Ataque local * defensa visitante
  const lambdaAway = awayGF * homeGA;  // Ataque visitante * defensa local

  // Calcula probs de victoria/empate (simplificado, agrega tu Poisson full)
  let pHomeWin = 0, pDraw = 0, pAwayWin = 0, pBTTS = 0, pO25 = 0;
  for (let h = 0; h < 10; h++) {
    for (let a = 0; a < 10; a++) {
      const prob = dixonColesAdjustment(lambdaHome, lambdaAway, h, a);
      if (h > a) pHomeWin += prob;
      else if (h === a) pDraw += prob;
      else pAwayWin += prob;
      if (h >= 1 && a >= 1) pBTTS += prob;
      if (h + a > 2.5) pO25 += prob;
    }
  }

  // Actualiza interfaz
  $('pHome').textContent = formatPct(pHomeWin);
  $('pDraw').textContent = formatPct(pDraw);
  $('pAway').textContent = formatPct(pAwayWin);
  $('pBTTS').textContent = formatPct(pBTTS);
  $('pO25').textContent = formatPct(pO25);

  // Sugerencia ejemplo (ajusta)
  let mainBet = pHomeWin > 0.5 ? 'Victoria Local' : pAwayWin > 0.5 ? 'Victoria Visitante' : 'Empate';
  $('suggestion').textContent = mainBet;
  $('details').innerHTML = '<div class="success">Cálculos actualizados.</div>';

  // Habilita el botón de guardar después de calcular
  const saveBtn = $('saveBet');
  if (saveBtn) saveBtn.disabled = false;
}
