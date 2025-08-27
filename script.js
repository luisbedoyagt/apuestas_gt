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

// Normaliza datos de equipos
function normalizeTeam(raw) {
  if (!raw) return null;
  const r = {};
  r.name = raw.name || raw.Team || raw.team?.name || raw.teamName || raw.team_name || raw['Equipo'] || raw['team'] || '';
  r.pos = raw.pos || raw.position || raw.rank || raw['Pos'] || null;
  r.gf = parseNumberString(raw.gf || raw.goalsFor || raw.goals_for || raw.GF);
  r.ga = parseNumberString(raw.ga || raw.goalsAgainst || raw.goals_against || raw.GC);
  r.pj = parseNumberString(raw.PJ || raw.pj || raw.played || raw.matches);
  r.g = parseNumberString(raw.G || raw.won || raw.W);
  r.e = parseNumberString(raw.E || raw.draw || raw.D);
  r.p = parseNumberString(raw.P || raw.lost || raw.L);
  r.points = parseNumberString(raw.points || raw.Points || (r.g * 3 + r.e) || 0);
  r.form = raw.form || raw.Form || null;
  return r;
}

// Fetch de equipos
async function fetchTeams() {
  try {
    const res = await fetch(WEBAPP_URL);
    if (!res.ok) throw new Error('fetch falló ' + res.status);
    const data = await res.json();
    const normalized = {};
    for (const key in data) normalized[key] = (data[key] || []).map(x => normalizeTeam(x));
    return normalized;
  } catch (err) { 
    console.error('Error fetching teams:', err); 
    alert('No se pudieron cargar los datos de equipos desde la API. Usando datos mockeados.');
    return {
      "BSA": [
        { name: "CR Flamengo", pos: 1, gf: 44, ga: 9, pj: 20, g: 14, e: 4, p: 2, points: 46, form: "4-1-0" },
        { name: "SC Recife", pos: 20, gf: 12, ga: 30, pj: 19, g: 1, e: 7, p: 11, points: 10, form: "0-2-3" }
      ]
    };
  }
}

// Inicialización
async function init() {
  try {
    teamsByLeague = await fetchTeams();
    console.log("teamsByLeague:", teamsByLeague);

    const leagueSelectEl = $('leagueSelect');
    if (leagueSelectEl) {
      Object.keys(teamsByLeague).forEach(code => {
        const opt = document.createElement('option');
        opt.value = code;
        opt.textContent = leagueNames[code] || code;
        leagueSelectEl.appendChild(opt);
      });
      leagueSelectEl.addEventListener('change', onLeagueChange);
    }

    const safeAddListener = (id, fn) => { const el = $(id); if(el) el.addEventListener('click', fn); };
    safeAddListener('recalc', calculateAll);
    safeAddListener('reset', () => location.reload());
    safeAddListener('clearAll', clearAll);
    safeAddListener('saveBank', saveBankrollToStorage);

    ['homeAdvantage','formWeight','dixonColesParam','maxTeams','formHome','formAway'].forEach(id => {
      const el = $(id);
      if(el) el.addEventListener('change', calculateAll);
    });

    const saved = localStorage.getItem('bankroll');
    if (saved && $('bankroll')) $('bankroll').value = saved;

  } catch (err) {
    console.error("Error en init:", err);
    alert("Error al inicializar la aplicación.");
  }
}

document.addEventListener('DOMContentLoaded', init);

// Manejo de selección de liga
function onLeagueChange() {
  const code = $('leagueSelect')?.value;
  if (!code) return;
  const homeSel = $('teamHome');
  const awaySel = $('teamAway');
  if (!homeSel || !awaySel) return;

  homeSel.innerHTML = '<option value="">-- Selecciona equipo --</option>';
  awaySel.innerHTML = '<option value="">-- Selecciona equipo --</option>';

  if (!teamsByLeague[code]) return;

  teamsByLeague[code].forEach(t => {
    const opt1 = document.createElement('option'); opt1.value = t.name; opt1.textContent = t.name; homeSel.appendChild(opt1);
    const opt2 = document.createElement('option'); opt2.value = t.name; opt2.textContent = t.name; awaySel.appendChild(opt2);
  });
}

// Buscar equipo
function findTeam(leagueCode, teamName) {
  if (!teamsByLeague[leagueCode]) return null;
  return teamsByLeague[leagueCode].find(t => t.name === teamName) || null;
}

// Llenado de datos de equipo
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

// Guardar banca
function saveBankrollToStorage() {
  const bank = parseNumberString($('bankroll').value);
  if (bank <= 0) { alert('La banca debe ser mayor a 0.'); return; }
  localStorage.setItem('bankroll', bank);
  alert('Banca guardada: Q' + bank);
}

// Limpiar todo
function clearAll() {
  document.querySelectorAll('input').forEach(i => { if (i.id !== 'bankroll') i.value = ''; });
  document.querySelectorAll('select').forEach(s => s.selectedIndex = 0);
  ['pHome','pDraw','pAway','pBTTS','pO25','expectedBest','details','suggestion',
   'formHomeTeam','formAwayTeam','formHomeBox','formAwayBox',
   'homeAdvantageFactor','strengthFactor','recentFormFactor','dixonColesFactor',
   'kellyStake','betAmount'].forEach(id => {
     const el = $(id);
     if (el) el.textContent = id.includes('form') ? (id.includes('Team') ? (id.includes('Home') ? 'Local: —' : 'Visitante: —') : 'PJ: — | G: — | E: — | P: —') : '—';
  });
  $('suggestion').style.display = 'none';
  $('homeAdvantage').value = 15;
  $('formWeight').value = 30;
  $('dixonColesParam').value = -0.13;
  $('maxTeams').value = 20;
  $('formHome').value = '';
  $('formAway').value = '';
}

// Funciones matemáticas
function poissonPMF(lambda, k) { if (k<0) return 0; return Math.pow(lambda,k)*Math.exp(-lambda)/factorial(k); }
function factorial(n) { if (n<=1) return 1; let f=1; for(let i=2;i<=n;i++) f*=i; return f; }
function clamp01(x){ return Math.max(0,Math.min(1,x)); }

// Dixon-Coles
function dixonColesAdjustment(lambdaHome, lambdaAway, rho) {
  if(lambdaHome<0.01||lambdaAway<0.01) return 1;
  const prob00 = poissonPMF(lambdaHome,0)*poissonPMF(lambdaAway,0)*(1-(lambdaHome*lambdaAway*rho));
  const prob10 = poissonPMF(lambdaHome,1)*poissonPMF(lambdaAway,0)*(1+(lambdaAway*rho));
  const prob01 = poissonPMF(lambdaHome,0)*poissonPMF(lambdaAway,1)*(1+(lambdaHome*rho));
  const prob11 = poissonPMF(lambdaHome,1)*poissonPMF(lambdaAway,1)*(1-rho);
  const originalProbs = poissonPMF(lambdaHome,0)*poissonPMF(lambdaAway,0)+poissonPMF(lambdaHome,1)*poissonPMF(lambdaAway,0)+poissonPMF(lambdaHome,0)*poissonPMF(lambdaAway,1)+poissonPMF(lambdaHome,1)*poissonPMF(lambdaAway,1);
  const adjustedProbs = prob00 + prob10 + prob01 + prob11;
  return originalProbs>0 ? adjustedProbs/originalProbs : 1;
}

// Factor de fuerza mejorado
function calculateStrengthFactor(posHome,posAway,maxTeams,pointsHome,pointsAway,gamesHome,gamesAway){
  if(!posHome||!posAway||!maxTeams||!pointsHome||!pointsAway||!gamesHome||!gamesAway) return 1;
  const normalizedHome=(maxTeams-posHome+1)/maxTeams;
  const normalizedAway=(maxTeams-posAway+1)/maxTeams;
  const ppgHome=pointsHome/(gamesHome||1);
  const ppgAway=pointsAway/(gamesAway||1);
  const eloFactor=(normalizedHome/normalizedAway)*(ppgHome/(ppgAway||1));
  return Math.sqrt(eloFactor);
}

// Factor de forma mejorado
function calculateFormFactor(formHome,formAway,formWeight){
  if(!formHome||!formAway) return 1;
  const parseForm=f=>f.match(/\d+/g)?.map(x=>parseInt(x))||[0,0,0];
  const [homeW,homeD,homeL]=parseForm(formHome);
  const [awayW,awayD,awayL]=parseForm(formAway);
  const homePpg=(homeW*3+homeD)/Math.max(1,homeW+homeD+homeL);
  const awayPpg=(awayW*3+awayD)/Math.max(1,awayW+awayD+awayL);
  if(awayPpg===0) return 1;
  const formFactor=homePpg/awayPpg;
  const weight=formWeight/100;
  return 1+(formFactor-1)*weight;
}

// Cálculo de probabilidades
function computeProbabilities(lambdaHome,lambdaAway,pointsHome,pointsAway, gamesHome, gamesAway){
  const homeAdvFactor=1+(parseNumberString($('homeAdvantage')?.value)/100);
  const posHome=parseNumberString($('posHome')?.value);
  const posAway=parseNumberString($('posAway')?.value);
  const maxTeams=parseNumberString($('maxTeams')?.value);
  const strengthFactor=calculateStrengthFactor(posHome,posAway,maxTeams,pointsHome,pointsAway,gamesHome,gamesAway);
  const formHome=$('formHome')?.value;
  const formAway=$('formAway')?.value;
  const formWeight=parseNumberString($('formWeight')?.value);
  const recentFormFactor=calculateFormFactor(formHome,formAway,formWeight);
  const rho=parseNumberString($('dixonColesParam')?.value);
  const dixonColesFactor=dixonColesAdjustment(lambdaHome,lambdaAway,rho);

  $('homeAdvantageFactor').textContent=formatDec(homeAdvFactor)+'x';
  $('strengthFactor').textContent=formatDec(strengthFactor)+'x';
  $('recentFormFactor').textContent=formatDec(recentFormFactor)+'x';
  $('dixonColesFactor').textContent=formatDec(dixonColesFactor)+'x';

  const adjHome=Math.min(lambdaHome*homeAdvFactor*strengthFactor*recentFormFactor,3.0);
  const adjAway=Math.max(lambdaAway/strengthFactor/recentFormFactor,0.05);

  let pHome=0,pDraw=0,pAway=0;
  const maxGoals=8;
  for(let i=0;i<=maxGoals;i++){
    for(let j=0;j<=maxGoals;j++){
      const prob=poissonPMF(adjHome,i)*poissonPMF(adjAway,j)*dixonColesFactor;
      if(i>j) pHome+=prob;
      else if(i===j) pDraw+=prob;
      else pAway+=prob;
    }
  }

  const total=pHome+pDraw+pAway;
  if(total>0){pHome/=total;pDraw/=total;pAway/=total;}

  let pBTTS=0;
  for(let i=1;i<=maxGoals;i++){
    for(let j=1;j<=maxGoals;j++) pBTTS+=poissonPMF(adjHome,i)*poissonPMF(adjAway,j)*dixonColesFactor;
  }

  let pO25=0;
  for(let i=0;i<=maxGoals;i++){
    for(let j=0;j<=maxGoals;j++){
      if(i+j>2.5) pO25+=poissonPMF(adjHome,i)*poissonPMF(adjAway,j)*dixonColesFactor;
    }
  }

  return {pHome:clamp01(pHome),pDraw:clamp01(pDraw),pAway:clamp01(pAway),pBTTS:clamp01(pBTTS),pO25:clamp01(pO25)};
}

// Kelly stake
function calculateKellyStake(probability,odds,bankroll,kellyFraction=0.5){
  const b=odds-1;
  const p=probability;
  const q=1-p;
  const idealStake=(b*p-q)/b;
  const fractionalStake=Math.max(0,idealStake)*kellyFraction;
  return {stakePercent:fractionalStake*100,amount:bankroll*fractionalStake};
}

// Sugerencia de apuesta
function suggestBet(probObj,odds,bankroll,kellyFraction=parseNumberString($('kellyFraction')?.value||0.5),maxEV=parseNumberString($('maxEV')?.value||0.5)){
  const minProb=0.01;
  let bestBet=null,maxEvFound=-Infinity,bestStake=0,bestAmount=0,bestOdds=0;
  const bets=[
    {name:'Local',prob:probObj.pHome,odds:odds.oddsHome},
    {name:'Empate',prob:probObj.pDraw,odds:odds.oddsDraw},
    {name:'Visitante',prob:probObj.pAway,odds:odds.oddsAway},
    {name:'BTTS Sí',prob:probObj.pBTTS,odds:odds.oddsBTTS},
    {name:'Over 2.5',prob:probObj.pO25,odds:odds.oddsOver25}
  ];
  bets.forEach(bet=>{
    const ev=bet.prob*bet.odds-1;
    if(bet.prob>=minProb && ev>maxEvFound && ev<=maxEV){
      maxEvFound=ev;
      bestBet=bet.name;
      bestOdds=bet.odds;
      const kelly=calculateKellyStake(bet.prob,bet.odds,bankroll,kellyFraction);
      bestStake=kelly.stakePercent;
      bestAmount=kelly.amount;
    }
  });
  return {bestBet,stakePercent:bestStake,amount:bestAmount,ev:maxEvFound,odds:bestOdds};
}

// Función principal
function calculateAll(){
  const lambdaHome=parseNumberString($('gfHome')?.value);
  const lambdaAway=parseNumberString($('gfAway')?.value);
  const bankroll=parseNumberString($('bankroll')?.value);
  if(lambdaHome<=0 || lambdaAway<=0 || bankroll<=0){ alert('Ingrese valores válidos para goles y banca.'); return; }

  const odds={
    oddsHome:toDecimalOdds($('oddsHome')?.value),
    oddsDraw:toDecimalOdds($('oddsDraw')?.value),
    oddsAway:toDecimalOdds($('oddsAway')?.value),
    oddsBTTS:toDecimalOdds($('oddsBTTS')?.value),
    oddsOver25:toDecimalOdds($('oddsOver25')?.value)
  };

  if(odds.oddsHome<1||odds.oddsDraw<1||odds.oddsAway<1||odds.oddsBTTS<1||odds.oddsOver25<1){ alert('Las cuotas deben ser > 1.0'); return; }

  const teamHome=findTeam($('leagueSelect')?.value,$('teamHome')?.value);
  const teamAway=findTeam($('leagueSelect')?.value,$('teamAway')?.value);
  const pointsHome=teamHome?teamHome.points:0;
  const pointsAway=teamAway?teamAway.points:0;
  const gamesHome=teamHome?teamHome.pj:1;
  const gamesAway=teamAway?teamAway.pj:1;

  const probs=computeProbabilities(lambdaHome,lambdaAway,pointsHome,pointsAway,gamesHome,gamesAway);
  $('pHome').textContent=formatPct(probs.pHome);
  $('pDraw').textContent=formatPct(probs.pDraw);
  $('pAway').textContent=formatPct(probs.pAway);
  $('pBTTS').textContent=formatPct(probs.pBTTS);
  $('pO25').textContent=formatPct(probs.pO25);

  const suggestion=suggestBet(probs,odds,bankroll);
  $('expectedBest').textContent=suggestion.bestBet||'Ninguna';
  $('kellyStake').textContent=formatDec(suggestion.stakePercent)+'%';
  $('betAmount').textContent='Q'+formatDec(suggestion.amount);

  $('suggestion').textContent=suggestion.bestBet?`Apuesta sugerida → ${suggestion.bestBet} (Cuota: ${formatDec(suggestion.odds)}): ${formatDec(suggestion.stakePercent)}% de tu banca (EV: ${formatPct(suggestion.ev)})`:'No hay apuestas con valor esperado confiable.';
  $('suggestion').style.display=suggestion.bestBet?'block':'none';

  $('details').innerHTML=`<div><strong>Detalles del cálculo:</strong></div>
    <div>• Lambda Local ajustado: ${formatDec(lambdaHome*(parseNumberString($('homeAdvantage')?.value)/100+1))}</div>
    <div>• Lambda Visitante ajustado: ${formatDec(lambdaAway)}</div>
    <div>• Valor Esperado (EV) máximo: ${formatPct(suggestion.ev)}</div>`;
}
