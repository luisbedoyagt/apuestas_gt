// Script mejorado: detecta y corrige cuotas 1X2 inconsistentes (remapeo automático)
// Pegar/reemplazar en tu script existente

console.log("Script.js cargado correctamente");

const $ = id => document.getElementById(id);
const formatPct = x => (100 * (isFinite(x) ? x : 0)).toFixed(1) + '%';
const formatDec = x => (isFinite(x) ? x.toFixed(2) : '0.00');
const clamp = (x,min,max) => Math.max(min, Math.min(max, x));

function parseNumberString(val) { 
  const s = String(val || '').replace(/,/g, '.'); 
  const n = Number(s); 
  return isFinite(n) ? n : 0; 
}

function toDecimalOdds(v) { 
  const a = parseFloat(String(v).replace(/,/g, '.')); 
  return isNaN(a) || a <= 1 ? 1.01 : a; 
}

// ------------------ datos y utilidades de equipos (igual que antes) ------------------
const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbyP6dc9ww4I9kw26fQCc0gAyEtYbQVg6DsoAtlnxqhFFJClOrHoudM8PdnBnT9YBopSlA/exec";
let teamsByLeague = {};
const leagueNames = { "WC": "FIFA World Cup", "CL": "UEFA Champions League", "BL1": "Bundesliga", "DED": "Eredivisie", "BSA": "Campeonato Brasileiro", "PD": "Liga Española", "FL1": "Ligue 1", "ELC": "Championship", "PPL": "Primeira Liga", "EC": "European Championship", "SA": "Serie A", "PL": "Premier League" };

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
  r.points = parseNumberString(raw.points || raw.Points || (r.g*3+r.e) || 0);
  r.form = raw.form || raw.Form || null;
  return r;
}

async function fetchTeams() {
  try {
    const res = await fetch(WEBAPP_URL);
    if (!res.ok) throw new Error('fetch falló '+res.status);
    const data = await res.json();
    const normalized = {};
    for(const key in data) normalized[key] = (data[key]||[]).map(x => normalizeTeam(x));
    return normalized;
  } catch(e){
    console.error('Error fetching teams:', e);
    alert('No se pudieron cargar los datos. Usando mock.');
    return {"BSA":[
      {name:"CR Flamengo",pos:1,gf:44,ga:9,pj:20,g:14,e:4,p:2,points:46,form:"4-1-0"},
      {name:"SC Recife",pos:20,gf:12,ga:30,pj:19,g:1,e:7,p:11,points:10,form:"0-2-3"}
    ]};
  }
}

// ------------------ init y UI (igual) ------------------
async function init(){
  teamsByLeague = await fetchTeams();
  Object.keys(teamsByLeague).forEach(code=>{
    const opt=document.createElement('option');
    opt.value=code;
    opt.textContent=leagueNames[code]||code;
    $('leagueSelect').appendChild(opt);
  });
  const saved = localStorage.getItem('bankroll');
  if(saved) $('bankroll').value = saved;

  $('leagueSelect').addEventListener('change', onLeagueChange);
  $('teamHome').addEventListener('change', ()=>fillTeamData($('teamHome').value,$('leagueSelect').value,'Home'));
  $('teamAway').addEventListener('change', ()=>fillTeamData($('teamAway').value,$('leagueSelect').value,'Away'));
  $('recalc').addEventListener('click', calculateAll);
  $('reset').addEventListener('click', ()=>location.reload());
  $('clearAll').addEventListener('click', clearAll);
  $('saveBank').addEventListener('click', saveBankrollToStorage);
  $('homeAdvantage').addEventListener('change', calculateAll);
  $('formWeight').addEventListener('change', calculateAll);
  $('dixonColesParam').addEventListener('change', calculateAll);
  $('maxTeams').addEventListener('change', calculateAll);
  $('formHome').addEventListener('change', calculateAll);
  $('formAway').addEventListener('change', calculateAll);
}
document.addEventListener('DOMContentLoaded', init);

function onLeagueChange(){
  const code = $('leagueSelect').value;
  $('teamHome').innerHTML='<option value="">-- Selecciona equipo --</option>';
  $('teamAway').innerHTML='<option value="">-- Selecciona equipo --</option>';
  if(!teamsByLeague[code]) return;
  teamsByLeague[code].forEach(t=>{
    ['teamHome','teamAway'].forEach(id=>{
      const opt=document.createElement('option'); opt.value=t.name; opt.textContent=t.name; $(id).appendChild(opt);
    });
  });
}
function findTeam(leagueCode,teamName){
  if(!teamsByLeague[leagueCode]) return null;
  return teamsByLeague[leagueCode].find(t=>t.name===teamName)||null;
}
function fillTeamData(teamName,leagueCode,type){
  if(!teamName) return;
  const t=findTeam(leagueCode,teamName);
  if(!t) return;
  const formString = t.form||`${t.g||0}-${t.e||0}-${t.p||0}`;
  if(type==='Home'){
    $('posHome').value=t.pos||'';
    $('gfHome').value=Number.isFinite(t.gf)?(t.gf/t.pj).toFixed(2):'';
    $('gaHome').value=Number.isFinite(t.ga)?(t.ga/t.pj).toFixed(2):'';
    $('formHome').value=formString;
    $('formHomeTeam').textContent=`Local: ${t.name}`;
    $('formHomeBox').textContent=`PJ: ${t.pj||0} | G: ${t.g||0} | E: ${t.e||0} | P: ${t.p||0}`;
  }else{
    $('posAway').value=t.pos||'';
    $('gfAway').value=Number.isFinite(t.gf)?(t.gf/t.pj).toFixed(2):'';
    $('gaAway').value=Number.isFinite(t.ga)?(t.ga/t.pj).toFixed(2):'';
    $('formAway').value=formString;
    $('formAwayTeam').textContent=`Visitante: ${t.name}`;
    $('formAwayBox').textContent=`PJ: ${t.pj||0} | G: ${t.g||0} | E: ${t.e||0} | P: ${t.p||0}`;
  }
  calculateAll();
}
function saveBankrollToStorage(){ const bank=parseNumberString($('bankroll').value); if(bank<=0){ alert('Banca debe ser >0'); return; } localStorage.setItem('bankroll',bank); alert('Banca guardada: Q'+bank); }
function clearAll(){ document.querySelectorAll('input').forEach(i=>{ if(i.id!=='bankroll') i.value=''; }); document.querySelectorAll('select').forEach(s=>s.selectedIndex=0); ['pHome','pDraw','pAway','pBTTS','pO25','expectedBest','details','suggestion','formHomeTeam','formAwayTeam','formHomeBox','formAwayBox','homeAdvantageFactor','strengthFactor','recentFormFactor','dixonColesFactor','kellyStake','betAmount'].forEach(id=>{ const el=$(id); if(el) el.textContent='—'; }); $('suggestion').style.display='none'; $('homeAdvantage').value=15; $('formWeight').value=30; $('dixonColesParam').value=-0.13; $('maxTeams').value=20; $('formHome').value=''; $('formAway').value=''; }

// ------------------ matemáticas y Poisson (igual) ------------------
function poissonPMF(lambda,k){ if(k<0) return 0; return Math.pow(lambda,k)*Math.exp(-lambda)/factorial(k); }
function factorial(n){ if(n<=1) return 1; let f=1; for(let i=2;i<=n;i++) f*=i; return f; }
function dixonColesAdjustment(lambdaHome,lambdaAway,rho){
  if(lambdaHome<0.01||lambdaAway<0.01) return 1;
  const prob00=poissonPMF(lambdaHome,0)*poissonPMF(lambdaAway,0)*(1-(lambdaHome*lambdaAway*rho));
  const prob10=poissonPMF(lambdaHome,1)*poissonPMF(lambdaAway,0)*(1+(lambdaAway*rho));
  const prob01=poissonPMF(lambdaHome,0)*poissonPMF(lambdaAway,1)*(1+(lambdaHome*rho));
  const prob11=poissonPMF(lambdaHome,1)*poissonPMF(lambdaAway,1)*(1-rho);
  const original=poissonPMF(lambdaHome,0)*poissonPMF(lambdaAway,0)+poissonPMF(lambdaHome,1)*poissonPMF(lambdaAway,0)+poissonPMF(lambdaHome,0)*poissonPMF(lambdaAway,1)+poissonPMF(lambdaHome,1)*poissonPMF(lambdaAway,1);
  const adjusted=prob00+prob10+prob01+prob11;
  return original>0?adjusted/original:1;
}
function calculateStrengthFactor(posHome,posAway,maxTeams,pointsHome,pointsAway,gamesHome,gamesAway){
  if(!posHome||!posAway||!maxTeams||!pointsHome||!pointsAway||!gamesHome||!gamesAway) return 1;
  const nh=(maxTeams-posHome+1)/maxTeams, na=(maxTeams-posAway+1)/maxTeams;
  const ph=pointsHome/(gamesHome||1), pa=pointsAway/(gamesAway||1);
  const factor=(nh/na)*(ph/(pa||1));
  return clamp(Math.sqrt(factor),0.5,1.5);
}
function calculateFormFactor(formHome,formAway,formWeight){
  if(!formHome||!formAway) return 1;
  const parseForm=f=>f.match(/\d+/g)?.map(x=>parseInt(x))||[0,0,0];
  const [hw,hd,hl]=parseForm(formHome), [aw,ad,al]=parseForm(formAway);
  const hppg=(hw*3+hd)/Math.max(1,hw+hd+hl), appg=(aw*3+ad)/Math.max(1,aw+ad+al);
  if(appg===0) return 1;
  return clamp(1+(hppg/appg-1)*(formWeight/100),0.5,1.5);
}

// ------------------ calcular probabilidades ------------------
function computeProbabilities(lambdaHome,lambdaAway,pointsHome,pointsAway,gamesHome,gamesAway){
  const homeAdvFactor = 1 + parseNumberString($('homeAdvantage').value)/100;
  const posHome=parseNumberString($('posHome').value), posAway=parseNumberString($('posAway').value);
  const maxTeams=parseNumberString($('maxTeams').value);
  const strengthFactor = calculateStrengthFactor(posHome,posAway,maxTeams,pointsHome,pointsAway,gamesHome,gamesAway);
  const formFactor = calculateFormFactor($('formHome').value,$('formAway').value,parseNumberString($('formWeight').value));
  const rho=parseNumberString($('dixonColesParam').value);

  const adjHome = clamp(lambdaHome*homeAdvFactor*strengthFactor*formFactor,0.05,3);
  const adjAway = clamp(lambdaAway/strengthFactor/formFactor,0.05,3);

  const maxGoals = 8;
  let pHome=0, pDraw=0, pAway=0, pBTTS=0, pO25=0;
  const dcFactor = dixonColesAdjustment(adjHome,adjAway,rho);

  for(let i=0;i<=maxGoals;i++){
    for(let j=0;j<=maxGoals;j++){
      const prob=poissonPMF(adjHome,i)*poissonPMF(adjAway,j)*dcFactor;
      if(i>j) pHome+=prob; else if(i===j) pDraw+=prob; else pAway+=prob;
      if(i>0 && j>0) pBTTS+=prob;
      if(i+j>2.5) pO25+=prob;
    }
  }

  const total=pHome+pDraw+pAway;
  if(total>0){ pHome/=total; pDraw/=total; pAway/=total; }

  $('homeAdvantageFactor').textContent=formatDec(homeAdvFactor)+'x';
  $('strengthFactor').textContent=formatDec(strengthFactor)+'x';
  $('recentFormFactor').textContent=formatDec(formFactor)+'x';
  $('dixonColesFactor').textContent=formatDec(dcFactor)+'x';

  return {pHome,pDraw,pAway,pBTTS,pO25};
}

// ------------------ Kelly ------------------
function calculateKellyStake(probability,odds,bankroll,kellyFraction=0.5){
  const b=odds-1, p=probability, q=1-p;
  const ideal=(b*p-q)/b;
  const frac=Math.max(0,ideal)*kellyFraction;
  return {stakePercent:frac*100, amount:bankroll*frac};
}

// ------------------ nuevo: funciones para detección/remapeo de cuotas ------------------

// Devuelve probabilidades implícitas normalizadas 1X2 desde cuotas del mercado
function marketImpliedNormalized(odds){
  const ipH = 1 / odds.oddsHome;
  const ipD = 1 / odds.oddsDraw;
  const ipA = 1 / odds.oddsAway;
  const total = ipH + ipD + ipA || 1;
  return { mProbHome: ipH/total, mProbDraw: ipD/total, mProbAway: ipA/total, raw:{ipH,ipD,ipA}, total };
}

// Detecta inconsistencia fuerte entre favorito del modelo y favorito del mercado.
// Si es necesario, remapea las cuotas 1X2: asigna la cuota más baja al favorito del modelo.
function detectAndRemapOdds(probs, odds) {
  const market = marketImpliedNormalized(odds);
  // modelos
  const modelList = [
    { key: 'oddsHome', label: 'Local', prob: probs.pHome },
    { key: 'oddsDraw', label: 'Empate', prob: probs.pDraw },
    { key: 'oddsAway', label: 'Visitante', prob: probs.pAway }
  ];
  const marketList = [
    { key: 'oddsHome', label: 'Local', odds: odds.oddsHome },
    { key: 'oddsDraw', label: 'Empate', odds: odds.oddsDraw },
    { key: 'oddsAway', label: 'Visitante', odds: odds.oddsAway }
  ];

  // determinar favoritos
  const modelFav = modelList.reduce((a,b)=> a.prob>b.prob ? a : b);
  const marketNormalized = { Home: market.mProbHome, Draw: market.mProbDraw, Away: market.mProbAway };
  const marketFavKey = Object.entries(marketNormalized).reduce((a,b)=> a[1]>b[1]?a:b)[0]; // "Home"/"Draw"/"Away"
  const marketFav = marketList.find(m => {
    if (marketFavKey === 'Home') return m.key === 'oddsHome';
    if (marketFavKey === 'Draw') return m.key === 'oddsDraw';
    return m.key === 'oddsAway';
  });

  // heurística: si el favorito del modelo es distinto al favorito del mercado y la diferencia es grande -> sospechoso
  const modelFavProb = modelFav.prob;
  const marketProbForModelFav = market.mProbHome * (modelFav.key==='oddsHome'?1:0) + market.mProbDraw * (modelFav.key==='oddsDraw'?1:0) + market.mProbAway * (modelFav.key==='oddsAway'?1:0);
  const modelOddsForFav = 1 / Math.max(0.0001, modelFavProb);
  const marketOddsForFav = (modelFav.key === 'oddsHome' ? odds.oddsHome : modelFav.key==='oddsDraw' ? odds.oddsDraw : odds.oddsAway);
  
  let suspicious = false;
  // condiciones que consideré para sospecha:
  if (modelFav.prob >= 0.55 && marketProbForModelFav <= 0.4) suspicious = true;
  if (marketOddsForFav > modelOddsForFav * 1.5 && modelFav.prob >= 0.4) suspicious = true;
  // (si quieres hacerlo más o menos sensible, cambia los umbrales anteriores)

  if (!suspicious) {
    return { usedOdds: odds, remapped: false, info: null, market };
  }

  // Remap: asignar la cuota más baja al equipo con mayor probabilidad del modelo, 2da cuota al 2do, etc.
  const sortedMarket = marketList.slice().sort((a,b)=> a.odds - b.odds); // asc (fav->)
  const sortedModel = modelList.slice().sort((a,b)=> b.prob - a.prob); // desc prob
  const remappedOdds = {};
  // asignar
  for(let i=0;i<3;i++){
    const modelKey = sortedModel[i].key;            // donde queremos dejar la cuota
    const marketOdd = sortedMarket[i].odds;         // cuota que le vamos a poner
    remappedOdds[modelKey] = marketOdd;
  }
  // mantener BTTS/Over intactas si existen:
  remappedOdds.oddsBTTS = odds.oddsBTTS;
  remappedOdds.oddsOver25 = odds.oddsOver25;

  // construir info para mostrar
  const originalMap = marketList.map(m => `${m.label}: ${formatDec(m.odds)}`).join(' | ');
  const newMap = modelList.slice().sort((a,b)=> b.prob - a.prob).map((m,i)=> `${m.label}: ${formatDec(sortedMarket[i].odds)}`).join(' | ');
  const info = `Se detectó discrepancia (favorito modelo: ${modelFav.label}). Se remapearon cuotas 1X2 para alinear cuota más baja con el favorito del modelo. Originales → ${originalMap}. Remapeadas → ${newMap}.`;

  return { usedOdds: remappedOdds, remapped: true, info, market };
}

// ------------------ sugerencias (minProb + margen + Kelly conservadora) ------------------
function suggestBet(probObj, odds, bankroll) {
  const minProbThreshold = 0.25;  // Prob mínima absoluta
  const minEdge = 0.10;           // la cuota debe exceder la implícita por al menos 10%
  let bestBet = null, bestOdds = 0, bestStake = 0, bestAmount = 0, bestEv = -Infinity;

  const bets = [
    { name: 'Local', prob: probObj.pHome, odds: odds.oddsHome, key: 'oddsHome' },
    { name: 'Empate', prob: probObj.pDraw, odds: odds.oddsDraw, key: 'oddsDraw' },
    { name: 'Visitante', prob: probObj.pAway, odds: odds.oddsAway, key: 'oddsAway' },
    { name: 'BTTS Sí', prob: probObj.pBTTS, odds: odds.oddsBTTS, key: 'oddsBTTS' },
    { name: 'Over 2.5', prob: probObj.pO25, odds: odds.oddsOver25, key: 'oddsOver25' }
  ];

  bets.forEach(bet => {
    if (!bet.odds || bet.odds <= 1) return;
    if (bet.prob < minProbThreshold) return;

    const impliedOdds = 1 / Math.max(0.000001, bet.prob);
    if (bet.odds < impliedOdds * (1 + minEdge)) return; // no suficientemente mejor que la cuota justa

    const kellyFraction = bet.prob < 0.30 ? 0.25 : 0.5; // más conservador si prob baja
    const ev = bet.prob * bet.odds - 1;                // EV clásico
    if (ev > bestEv) {
      bestEv = ev;
      bestBet = bet.name;
      bestOdds = bet.odds;
      const kelly = calculateKellyStake(bet.prob, bet.odds, bankroll, kellyFraction);
      bestStake = kelly.stakePercent;
      bestAmount = kelly.amount;
    }
  });

  return { bestBet, stakePercent: bestStake, amount: bestAmount, ev: bestEv, odds: bestOdds };
}

// ------------------ cálculo completo (con detección/remapeo) ------------------
function calculateAll(){
  const lambdaHome = parseNumberString($('gfHome').value);
  const lambdaAway = parseNumberString($('gfAway').value);
  const bankroll = parseNumberString($('bankroll').value);
  if (lambdaHome <= 0 || lambdaAway <= 0 || bankroll <= 0) { alert('Ingrese valores válidos para goles y banca.'); return; }

  const rawOdds = {
    oddsHome: toDecimalOdds($('oddsHome').value),
    oddsDraw: toDecimalOdds($('oddsDraw').value),
    oddsAway: toDecimalOdds($('oddsAway').value),
    oddsBTTS: toDecimalOdds($('oddsBTTS').value),
    oddsOver25: toDecimalOdds($('oddsOver25').value)
  };

  const teamHome = findTeam($('leagueSelect').value,$('teamHome').value);
  const teamAway = findTeam($('leagueSelect').value,$('teamAway').value);
  const pointsHome = teamHome ? teamHome.points : 0;
  const pointsAway = teamAway ? teamAway.points : 0;
  const gamesHome = teamHome ? teamHome.pj : 1;
  const gamesAway = teamAway ? teamAway.pj : 1;

  const probs = computeProbabilities(lambdaHome, lambdaAway, pointsHome, pointsAway, gamesHome, gamesAway);

  // Mostrar probabilidades del modelo
  $('pHome').textContent = formatPct(probs.pHome);
  $('pDraw').textContent = formatPct(probs.pDraw);
  $('pAway').textContent = formatPct(probs.pAway);
  $('pBTTS').textContent = formatPct(probs.pBTTS);
  $('pO25').textContent = formatPct(probs.pO25);

  // Calcular cuotas implícitas del modelo
  const modelImplOdds = {
    mOddsHome: 1 / Math.max(0.000001, probs.pHome),
    mOddsDraw: 1 / Math.max(0.000001, probs.pDraw),
    mOddsAway: 1 / Math.max(0.000001, probs.pAway)
  };

  // Detectar inconsistencia y remapear si procede
  const detection = detectAndRemapOdds(probs, rawOdds);
  const usedOdds = detection.usedOdds;

  // Mostrar info y comparativa de cuotas
  let detailsHtml = `<div><strong>Detalles del cálculo:</strong></div>`;
  detailsHtml += `<div>• Cuotas mercado (original): Local ${formatDec(rawOdds.oddsHome)} / Empate ${formatDec(rawOdds.oddsDraw)} / Visitante ${formatDec(rawOdds.oddsAway)}</div>`;
  detailsHtml += `<div>• Cuotas implícitas (modelo): Local ${formatDec(modelImplOdds.mOddsHome)} / Empate ${formatDec(modelImplOdds.mOddsDraw)} / Visitante ${formatDec(modelImplOdds.mOddsAway)}</div>`;
  if (detection.remapped) {
    detailsHtml += `<div style="color:darkorange">• Aviso: ${detection.info}</div>`;
    detailsHtml += `<div>• Cuotas usadas tras remapeo: Local ${formatDec(usedOdds.oddsHome)} / Empate ${formatDec(usedOdds.oddsDraw)} / Visitante ${formatDec(usedOdds.oddsAway)}</div>`;
  } else {
    detailsHtml += `<div>• Cuotas usadas: (sin remapeo) Local ${formatDec(usedOdds.oddsHome)} / Empate ${formatDec(usedOdds.oddsDraw)} / Visitante ${formatDec(usedOdds.oddsAway)}</div>`;
  }

  // Sugerencia usando usedOdds
  const suggestion = suggestBet(probs, usedOdds, bankroll);
  $('expectedBest').textContent = suggestion.bestBet || 'Ninguna';
  $('kellyStake').textContent = formatDec(suggestion.stakePercent) + '%';
  $('betAmount').textContent = 'Q' + formatDec(suggestion.amount);

  if (suggestion.bestBet) {
    detailsHtml += `<div>• Recomendación: ${suggestion.bestBet} (Cuota usada: ${formatDec(suggestion.odds)}) → ${formatDec(suggestion.stakePercent)}% de banca (Q${formatDec(suggestion.amount)})</div>`;
    detailsHtml += `<div>• EV (clásico): ${formatPct(suggestion.ev)}</div>`;
    $('suggestion').textContent = `Apuesta sugerida → ${suggestion.bestBet} (Cuota: ${formatDec(suggestion.odds)}): ${formatDec(suggestion.stakePercent)}% de tu banca`;
    $('suggestion').style.display = 'block';
  } else {
    detailsHtml += `<div>• No hay apuestas que cumplan umbrales (prob>=25% y margen mínimo sobre cuota implícita).</div>`;
    $('suggestion').textContent = 'No hay apuestas confiables';
    $('suggestion').style.display = 'none';
  }

  $('details').innerHTML = detailsHtml;
}
