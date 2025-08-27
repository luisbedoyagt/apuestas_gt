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

// -----------------------------------------------------------
// Datos y equipos
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
  r.points = parseNumberString(raw.points || raw.Points || (r.g*3+r.e)||0);
  r.form = raw.form || raw.Form || null;
  return r;
}

async function fetchTeams() {
  try {
    const res = await fetch(WEBAPP_URL);
    if (!res.ok) throw new Error('fetch falló '+res.status);
    const data = await res.json();
    const normalized = {};
    for(const key in data) normalized[key]=(data[key]||[]).map(x=>normalizeTeam(x));
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

// -----------------------------------------------------------
// Inicialización y UI
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

function saveBankrollToStorage(){
  const bank=parseNumberString($('bankroll').value);
  if(bank<=0){ alert('Banca debe ser >0'); return; }
  localStorage.setItem('bankroll',bank);
  alert('Banca guardada: Q'+bank);
}

function clearAll(){
  document.querySelectorAll('input').forEach(i=>{ if(i.id!=='bankroll') i.value=''; });
  document.querySelectorAll('select').forEach(s=>s.selectedIndex=0);
  ['pHome','pDraw','pAway','pBTTS','pO25','expectedBest','details','suggestion','formHomeTeam','formAwayTeam','formHomeBox','formAwayBox','homeAdvantageFactor','strengthFactor','recentFormFactor','dixonColesFactor','kellyStake','betAmount'].forEach(id=>{ const el=$(id); if(el) el.textContent='—'; });
  $('suggestion').style.display='none';
  $('homeAdvantage').value=15;
  $('formWeight').value=30;
  $('dixonColesParam').value=-0.13;
  $('maxTeams').value=20;
  $('formHome').value='';
  $('formAway').value='';
}

// -----------------------------------------------------------
// Probabilidades y Poisson
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

// -----------------------------------------------------------
// Probabilidades y cálculo de apuestas
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

  return {pHome, pDraw, pAway, pBTTS, pO25};
}

// -----------------------------------------------------------
// Kelly y sugerencia
function calculateKellyStake(prob,odds,bankroll,kellyFraction=0.5){
  const b=odds-1, p=prob, q=1-p;
  const ideal=(b*p-q)/b;
  const fractional=Math.max(0,ideal)*kellyFraction;
  return {stakePercent:fractional*100, amount:bankroll*fractional};
}

function suggestBet(probObj,odds,bankroll,kellyFraction=0.5,maxEV=0.5){
  const minProbThreshold=0.15;
  let bestBet=null,maxEvFound=-Infinity,bestStake=0,bestAmount=0,bestOdds=0;
  const bets=[
    {name:'Local',prob:probObj.pHome,odds:odds.oddsHome},
    {name:'Empate',prob:probObj.pDraw,odds:odds.oddsDraw},
    {name:'Visitante',prob:probObj.pAway,odds:odds.oddsAway},
    {name:'BTTS Sí',prob:probObj.pBTTS,odds:odds.oddsBTTS},
    {name:'Over 2.5',prob:probObj.pO25,odds:odds.oddsOver25}
  ];
  bets.forEach(bet=>{
    const evAdj=bet.prob-1/bet.odds;
    const ev=bet.prob*bet.odds-1;
    if(bet.prob>=minProbThreshold && evAdj>maxEvFound && ev<=maxEV){
      maxEvFound=evAdj;
      bestBet=bet.name;
      bestOdds=bet.odds;
      const kelly=calculateKellyStake(bet.prob,bet.odds,bankroll,kellyFraction);
      bestStake=kelly.stakePercent;
      bestAmount=kelly.amount;
    }
  });
  return {bestBet, stakePercent:bestStake, amount:bestAmount, ev:maxEvFound, odds:bestOdds};
}

// -----------------------------------------------------------
// Función principal
function calculateAll(){
  const lambdaHome=parseNumberString($('gfHome').value);
  const lambdaAway=parseNumberString($('gfAway').value);
  const bankroll=parseNumberString($('bankroll').value);
  if(lambdaHome<=0 || lambdaAway<=0 || bankroll<=0){ alert('Ingrese valores válidos'); return; }

  const odds={
    oddsHome:toDecimalOdds($('oddsHome').value),
    oddsDraw:toDecimalOdds($('oddsDraw').value),
    oddsAway:toDecimalOdds($('oddsAway').value),
    oddsBTTS:toDecimalOdds($('oddsBTTS').value),
    oddsOver25:toDecimalOdds($('oddsOver25').value)
  };

  const teamHome=findTeam($('leagueSelect').value,$('teamHome').value);
  const teamAway=findTeam($('leagueSelect').value,$('teamAway').value);
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

  $('suggestion').textContent=suggestion.bestBet?`Apuesta sugerida → ${suggestion.bestBet} (Cuota: ${formatDec(suggestion.odds)}): ${formatDec(suggestion.stakePercent)}% de tu banca (EV: ${formatPct(suggestion.ev)})`:'Ninguna apuesta sugerida';
  $('suggestion').style.display='block';
}
