const $ = id => {
  const element = document.getElementById(id);
  if (!element) console.error(`Elemento con ID "${id}" no encontrado en el DOM`);
  return element;
};
const formatPct = x => (100 * (isFinite(x) ? x : 0)).toFixed(1) + '%';
const formatDec = x => (isFinite(x) ? x.toFixed(2) : '0.00');
const parseNumberString = val => {
  const s = String(val || '').replace(/,/g, '.');
  const n = Number(s);
  return isFinite(n) ? n : 0;
};

const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbzwunZZXmvchjXKs6Wkh3XHOIzRKzRqsH8U6XtOIqrOGWYOdM0AWGW-56zXrDAmhlUedQ/exec";
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

const sheetToLeagueCode = {
  "España_LaLiga": "esp.1",
  "España_Segunda": "esp.2",
  "Inglaterra_PremierLeague": "eng.1",
  "Inglaterra_Championship": "eng.2",
  "Italia_SerieA": "ita.1",
  "Alemania_Bundesliga": "ger.1",
  "Francia_Ligue1": "fra.1",
  "PaísesBajos_Eredivisie": "ned.1",
  "PaísesBajos_EersteDivisie": "ned.2",
  "Portugal_LigaPortugal": "por.1",
  "México_LigaMX": "mex.1",
  "EstadosUnidos_MLS": "usa.1",
  "Brasil_Brasileirao": "bra.1",
  "Guatemala_LigaNacional": "gua.1",
  "CostaRica_LigaPromerica": "crc.1",
  "Honduras_LigaNacional": "hon.1",
  "Arabia_Saudi_ProLeague": "ksa.1"
};

function normalizeTeam(raw) {
  if (!raw || !raw.Equipo) {
    console.warn('Equipo inválido:', raw);
    return null;
  }
  const r = {};
  r.name = raw.Equipo || '';
  r.pos = parseNumberString(raw.Rank || 0);
  r.pj = parseNumberString(raw.PJ || 0);
  r.g = parseNumberString(raw.Victorias || 0);
  r.e = parseNumberString(raw.Empates || 0);
  r.p = parseNumberString(raw.Derrotas || 0);
  r.points = parseNumberString(raw.Puntos || (r.g * 3 + r.e) || 0);
  r.gf = parseNumberString(raw.GF || 0);
  r.gc = parseNumberString(raw.GC || 0);
  r.pjHome = parseNumberString(raw['PJ Local'] || 0);
  r.gHome = parseNumberString(raw['Victorias Local'] || 0);
  r.gfHome = parseNumberString(raw['GF Local'] || 0);
  r.gcHome = parseNumberString(raw['GC Local'] || 0);
  r.pjAway = parseNumberString(raw['PJ Visitante'] || 0);
  r.gAway = parseNumberString(raw['Victorias Visitante'] || 0);
  r.gfAway = parseNumberString(raw['GF Visitante'] || 0);
  r.gcAway = parseNumberString(raw['GC Visitante'] || 0);
  r.possession = parseNumberString(raw.possession || 50);
  console.log('Equipo normalizado:', r);
  return r;
}

async function fetchTeams() {
  console.time('fetchTeams');
  const leagueSelect = $('leagueSelect');
  if (leagueSelect) {
    leagueSelect.innerHTML = '<option value="">Cargando ligas...</option>';
    leagueSelect.disabled = true;
  }

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
    console.log('Iniciando fetch a:', WEBAPP_URL);
    const res = await fetch(WEBAPP_URL, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error(`Error HTTP ${res.status}: ${res.statusText}`);
    const data = await res.json();
    console.log('Datos recibidos de la API:', data);

    if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
      throw new Error('Datos vacíos o inválidos de la API');
    }

    const normalized = {};
    for (const sheetName in data) {
      const leagueCode = sheetToLeagueCode[sheetName] || sheetName;
      if (!leagueNames[leagueCode]) {
        console.warn(`Nombre de hoja desconocido: ${sheetName}`);
        continue;
      }
      const teams = data[sheetName].slice(1).map(row => {
        const team = {};
        data[sheetName][0].forEach((header, i) => team[header] = row[i]);
        return normalizeTeam(team);
      }).filter(t => t && t.name && t.pj > 0);
      normalized[leagueCode] = teams;
      console.log(`Equipos normalizados para ${leagueCode} (${leagueNames[leagueCode]}):`, teams);
      if (teams.length === 0) {
        console.warn(`No se encontraron equipos válidos para la liga ${leagueCode}`);
      }
    }

    teamsByLeague = normalized;
    localStorage.setItem('teamsByLeague', JSON.stringify(normalized));
    console.log('Ligas disponibles:', Object.keys(teamsByLeague));
    console.timeEnd('fetchTeams');
    return normalized;
  } catch (err) {
    console.error('Error en fetchTeams:', err);
    const details = $('details');
    if (details) {
      details.innerHTML = `<div class="error"><strong>Error:</strong> No se pudieron cargar los datos de la API. Detalle: ${err.message}. Verifica la URL o la conexión.</div>`;
    }
    if (leagueSelect) {
      leagueSelect.innerHTML = '<option value="">Error al cargar ligas</option>';
      leagueSelect.disabled = false;
    }
    console.timeEnd('fetchTeams');
    return {};
  }
}

async function init() {
  console.time('init');
  console.log('Iniciando inicialización de la aplicación');
  const leagueSelect = $('leagueSelect');
  const teamHomeSelect = $('teamHome');
  const teamAwaySelect = $('teamAway');
  const recalcButton = $('recalc');
  const resetButton = $('reset');
  const details = $('details');

  if (!leagueSelect || !teamHomeSelect || !teamAwaySelect || !recalcButton || !resetButton || !details) {
    if (details) {
      details.innerHTML = '<div class="error"><strong>Error:</strong> Problema con la interfaz. Verifica los elementos HTML en index.html.</div>';
    }
    console.error('Elementos HTML no encontrados, abortando inicialización');
    console.timeEnd('init');
    return;
  }

  teamsByLeague = await fetchTeams();

  if (Object.keys(teamsByLeague).length === 0) {
    leagueSelect.innerHTML = '<option value="">No hay ligas disponibles</option>';
    leagueSelect.disabled = false;
    details.innerHTML = '<div class="error"><strong>Error:</strong> No se encontraron ligas. Verifica la conexión con la API.</div>';
    console.warn('No hay ligas disponibles en teamsByLeague');
    console.timeEnd('init');
    return;
  }

  leagueSelect.innerHTML = '<option value="">-- Selecciona liga --</option>';
  Object.keys(teamsByLeague).sort().forEach(code => {
    const opt = document.createElement('option');
    opt.value = code;
    opt.textContent = leagueNames[code] || code;
    leagueSelect.appendChild(opt);
  });
  leagueSelect.disabled = false;
  console.log('Selector de ligas poblado:', Object.keys(teamsByLeague));

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
  recalcButton.addEventListener('click', calculateAll);
  resetButton.addEventListener('click', clearAll);

  clearAll();
  console.timeEnd('init');
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('Evento DOMContentLoaded disparado');
  init();
});

function onLeagueChange() {
  console.time('onLeagueChange');
  const code = $('leagueSelect').value;
  const teamHomeSelect = $('teamHome');
  const teamAwaySelect = $('teamAway');
  if (!teamHomeSelect || !teamAwaySelect) {
    console.error('No se encontraron los selectores de equipos');
    return;
  }
  teamHomeSelect.innerHTML = '<option value="">Cargando equipos...</option>';
  teamAwaySelect.innerHTML = '<option value="">Cargando equipos...</option>';

  if (!code || !teamsByLeague[code] || teamsByLeague[code].length === 0) {
    const details = $('details');
    if (details) {
      details.innerHTML = '<div class="error"><strong>Error:</strong> No hay equipos disponibles para la liga seleccionada.</div>';
    }
    clearTeamData('Home');
    clearTeamData('Away');
    updateCalcButton();
    console.warn(`No hay equipos para la liga ${code}`);
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
  const teamHome = $('teamHome')?.value;
  const teamAway = $('teamAway')?.value;
  const leagueCode = $('leagueSelect')?.value;
  const recalc = $('recalc');
  if (recalc) {
    recalc.disabled = !(leagueCode && teamHome && teamAway && teamHome !== teamAway);
  }
}

function restrictSameTeam() {
  const teamHome = $('teamHome')?.value;
  const teamAway = $('teamAway')?.value;
  if (teamHome && teamAway && teamHome === teamAway) {
    const details = $('details');
    if (details) {
      details.innerHTML = '<div class="error"><strong>Error:</strong> No puedes seleccionar el mismo equipo para local y visitante.</div>';
    }
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
  const prefix = type === 'Home' ? 'Home' : 'Away';
  const pos = $(`pos${prefix}`);
  const gf = $(`gf${prefix}`);
  const ga = $(`ga${prefix}`);
  const possession = $(`possession${prefix}`);
  const formTeam = $(`form${prefix}Team`);
  const formBox = $(`form${prefix}Box`);
  const pHome = $('pHome');
  const pAway = $('pAway');

  if (pos) pos.value = '—';
  if (gf) gf.value = '—';
  if (ga) ga.value = '—';
  if (possession) possession.value = '50';
  if (formTeam) formTeam.textContent = `${type === 'Home' ? 'Local' : 'Visitante'}: —`;
  if (formBox) formBox.textContent = 'PJ: — | G: — | E: — | P: —';
  if (type === 'Home' && pHome) pHome.parentElement.querySelector('.small').textContent = 'Probabilidad: —';
  if (type === 'Away' && pAway) pAway.parentElement.querySelector('.small').textContent = 'Probabilidad: —';

  ['pHome', 'pDraw', 'pAway', 'pBTTS', 'pO25'].forEach(id => {
    const el = $(id);
    if (el) el.textContent = '—';
  });
  const pDraw = $('pDraw');
  const pBTTS = $('pBTTS');
  const pO25 = $('pO25');
  if (pDraw) pDraw.parentElement.querySelector('.small').textContent = 'Probabilidad: Empate';
  if (pBTTS) pBTTS.parentElement.querySelector('.small').textContent = 'Probabilidad: Ambos anotan';
  if (pO25) pO25.parentElement.querySelector('.small').textContent = 'Probabilidad: Más de 2.5 goles';

  const factors = ['homeAdvantageFactor', 'strengthFactor', 'dixonColesFactor'];
  factors.forEach(id => {
    const el = $(id);
    if (el) el.textContent = '—';
  });

  const suggestion = $('suggestion');
  if (suggestion) suggestion.innerHTML = 'Esperando datos para tu apuesta estelar...';
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
    const details = $('details');
    if (details) {
      details.innerHTML = '<div class="error"><strong>Error:</strong> Selecciona una liga y un equipo válidos.</div>';
    }
    return;
  }
  const t = findTeam(leagueCode, teamName);
  if (!t) {
    const details = $('details');
    if (details) {
      details.innerHTML = '<div class="error"><strong>Error:</strong> Equipo no encontrado en los datos de la liga.</div>';
    }
    return;
  }

  console.log(`Llenando datos para ${type}:`, t);
  const lambda = type === 'Home' ? (t.pjHome > 0 ? t.gfHome / t.pjHome : t.gf / t.pj || 0) : (t.pjAway > 0 ? t.gfAway / t.pjAway : t.gf / t.pj || 0);
  const gaAvg = type === 'Home' ? (t.pjHome > 0 ? t.gcHome / t.pjHome : t.gc / t.pj || 0) : (t.pjAway > 0 ? t.gcAway / t.pjAway : t.gc / t.pj || 0);
  if (type === 'Home') {
    const posHome = $('posHome');
    const gfHome = $('gfHome');
    const gaHome = $('gaHome');
    const possessionHome = $('possessionHome');
    const formHomeTeam = $('formHomeTeam');
    const formHomeBox = $('formHomeBox');
    const pHome = $('pHome');
    if (posHome) posHome.value = t.pos || '—';
    if (gfHome) gfHome.value = formatDec(lambda);
    if (gaHome) gaHome.value = formatDec(gaAvg);
    if (possessionHome) possessionHome.value = t.possession || 50;
    if (formHomeTeam) formHomeTeam.textContent = `Local: ${t.name}`;
    if (formHomeBox) formHomeBox.textContent = `PJ: ${t.pjHome || 0} | G: ${t.gHome || 0} | E: ${t.e || 0} | P: ${t.p || 0}`;
    if (pHome) pHome.parentElement.querySelector('.small').textContent = `Probabilidad: ${t.name}`;
  } else {
    const posAway = $('posAway');
    const gfAway = $('gfAway');
    const gaAway = $('gaAway');
    const possessionAway = $('possessionAway');
    const formAwayTeam = $('formAwayTeam');
    const formAwayBox = $('formAwayBox');
    const pAway = $('pAway');
    if (posAway) posAway.value = t.pos || '—';
    if (gfAway) gfAway.value = formatDec(lambda);
    if (gaAway) gaAway.value = formatDec(gaAvg);
    if (possessionAway) possessionAway.value = t.possession || 50;
    if (formAwayTeam) formAwayTeam.textContent = `Visitante: ${t.name}`;
    if (formAwayBox) formAwayBox.textContent = `PJ: ${t.pjAway || 0} | G: ${t.gAway || 0} | E: ${t.e || 0} | P: ${t.p || 0}`;
    if (pAway) pAway.parentElement.querySelector('.small').textContent = `Probabilidad: ${t.name}`;
  }
  const pDraw = $('pDraw');
  const pBTTS = $('pBTTS');
  const pO25 = $('pO25');
  if (pDraw) pDraw.parentElement.querySelector('.small').textContent = 'Probabilidad: Empate';
  if (pBTTS) pBTTS.parentElement.querySelector('.small').textContent = 'Probabilidad: Ambos anotan';
  if (pO25) pO25.parentElement.querySelector('.small').textContent = 'Probabilidad: Más de 2.5 goles';
}

function clearAll() {
  document.querySelectorAll('input').forEach(i => {
    if (i.id.includes('possession')) i.value = '50';
    else i.value = '—';
  });
  document.querySelectorAll('select').forEach(s => s.selectedIndex = 0);
  ['pHome', 'pDraw', 'pAway', 'pBTTS', 'pO25', 'details', 'homeAdvantageFactor', 'strengthFactor', 'dixonColesFactor'].forEach(id => {
    const el = $(id);
    if (el) el.textContent = '—';
  });
  ['formHomeTeam', 'formAwayTeam'].forEach(id => {
    const el = $(id);
    if (el) el.textContent = id.includes('Home') ? 'Local: —' : 'Visitante: —';
  });
  ['formHomeBox', 'formAwayBox'].forEach(id => {
    const el = $(id);
    if (el) el.textContent = 'PJ: — | G: — | E: — | P: —';
  });
  ['pHome', 'pAway'].forEach(id => {
    const el = $(id);
    if (el) el.parentElement.querySelector('.small').textContent = 'Probabilidad: —';
  });
  const pDraw = $('pDraw');
  const pBTTS = $('pBTTS');
  const pO25 = $('pO25');
  if (pDraw) pDraw.parentElement.querySelector('.small').textContent = 'Probabilidad: Empate';
  if (pBTTS) pBTTS.parentElement.querySelector('.small').textContent = 'Probabilidad: Ambos anotan';
  if (pO25) pO25.parentElement.querySelector('.small').textContent = 'Probabilidad: Más de 2.5 goles';
  const suggestion = $('suggestion');
  if (suggestion) suggestion.innerHTML = 'Esperando datos para tu apuesta estelar...';
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
  const rho = Math.min(-0.05, Math.max(-0.2, -0.1 * (avgGoals / 2.5)));
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

function calculateStrengthFactor(posHome, posAway, leagueCode, pointsHome, pointsAway, winsHome, winsAway) {
  const maxTeams = teamsByLeague[leagueCode]?.length || 20;
  if (!posHome || !posAway || !maxTeams || !pointsHome || !pointsAway) {
    console.warn('Datos insuficientes para calcular strengthFactor:', { posHome, posAway, maxTeams, pointsHome, pointsAway });
    return 1;
  }
  const normalizedHome = (maxTeams - posHome + 1) / maxTeams;
  const normalizedAway = (maxTeams - posAway + 1) / maxTeams;
  const ppgHome = pointsHome / (parseNumberString($('gfHome').value) || 1);
  const ppgAway = pointsAway / (parseNumberString($('gfAway').value) || 1);
  const formFactor = (winsHome / (parseNumberString($('pjHome').value) || 1)) / (winsAway / (parseNumberString($('pjAway').value) || 1)) || 1;
  const eloFactor = (normalizedHome / normalizedAway) * (ppgHome / ppgAway || 1) * formFactor;
  const strengthFactor = Math.min(Math.max(Math.sqrt(eloFactor), 0.5), 2.0);
  console.log('Strength factor calculation:', { normalizedHome, normalizedAway, ppgHome, ppgAway, formFactor, eloFactor, strengthFactor });
  return strengthFactor;
}

function calculateHomeAdvantage(leagueCode) {
  const teams = teamsByLeague[leagueCode] || [];
  const avgGoalsHome = teams.length > 0 ? teams.reduce((sum, t) => sum + (t.gfHome / (t.pjHome || 1)), 0) / teams.length : 2.5 * 1.2;
  const avgGoalsAway = teams.length > 0 ? teams.reduce((sum, t) => sum + (t.gfAway / (t.pjAway || 1)), 0) / teams.length : 2.5 * 0.8;
  const factor = 1 + (avgGoalsHome - avgGoalsAway) * 0.2;
  console.log('Home advantage calculation:', { leagueCode, avgGoalsHome, avgGoalsAway, factor });
  return factor;
}

function computeProbabilities(lambdaHome, lambdaAway, pointsHome, pointsAway, leagueCode, winsHome, winsAway, possessionHome, possessionAway) {
  if (!isFinite(lambdaHome) || !isFinite(lambdaAway) || lambdaHome <= 0 || lambdaAway <= 0) {
    const details = $('details');
    if (details) {
      details.innerHTML = '<div class="error"><strong>Error:</strong> Los datos de goles no son válidos. Verifica las estadísticas de los equipos.</div>';
    }
    console.error('Datos de goles inválidos:', { lambdaHome, lambdaAway });
    return { pHome: 0, pDraw: 0, pAway: 0, pBTTS: 0, pO25: 0 };
  }
  const homeAdvantageFactor = calculateHomeAdvantage(leagueCode);
  const posHome = parseNumberString($('posHome').value);
  const posAway = parseNumberString($('posAway').value);
  const strengthFactor = calculateStrengthFactor(posHome, posAway, leagueCode, pointsHome, pointsAway, winsHome, winsAway);
  const dixonColesFactor = dixonColesAdjustment(lambdaHome, lambdaAway, leagueCode);

  const possessionAdjustmentHome = possessionHome / 50;
  const possessionAdjustmentAway = possessionAway / 50;

  const homeAdvantageFactorEl = $('homeAdvantageFactor');
  const strengthFactorEl = $('strengthFactor');
  const dixonColesFactorEl = $('dixonColesFactor');
  if (homeAdvantageFactorEl) homeAdvantageFactorEl.textContent = formatDec(homeAdvantageFactor) + 'x';
  if (strengthFactorEl) strengthFactorEl.textContent = formatDec(strengthFactor) + 'x';
  if (dixonColesFactorEl) dixonColesFactorEl.textContent = formatDec(dixonColesFactor) + 'x';

  const adjHome = Math.min(lambdaHome * homeAdvantageFactor * strengthFactor * possessionAdjustmentHome, 3.5);
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
    const details = $('details');
    if (details) {
      details.innerHTML = '<div class="error"><strong>Error:</strong> Cálculo de probabilidades falló debido a datos inválidos.</div>';
    }
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
  const leagueCode = $('leagueSelect')?.value;
  const teamHomeName = $('teamHome')?.value || 'Local';
  const teamAwayName = $('teamAway')?.value || 'Visitante';
  const teamHome = findTeam(leagueCode, teamHomeName);
  const teamAway = findTeam(leagueCode, teamAwayName);

  if (!leagueCode) {
    const details = $('details');
    if (details) {
      details.innerHTML = '<div class="error"><strong>Error:</strong> Selecciona una liga válida.</div>';
    }
    const suggestion = $('suggestion');
    if (suggestion) suggestion.innerHTML = 'Esperando datos para tu apuesta estelar...';
    console.timeEnd('calculateAll');
    return;
  }

  if (!teamHome || !teamAway) {
    const details = $('details');
    if (details) {
      details.innerHTML = '<div class="error"><strong>Error:</strong> Selecciona ambos equipos válidos para calcular las probabilidades.</div>';
    }
    const suggestion = $('suggestion');
    if (suggestion) suggestion.innerHTML = 'Esperando datos para tu apuesta estelar...';
    console.timeEnd('calculateAll');
    return;
  }

  if (teamHome.pjHome < 3 || teamAway.pjAway < 3) {
    const details = $('details');
    if (details) {
      details.innerHTML = '<div class="error"><strong>Advertencia:</strong> Uno o ambos equipos tienen menos de 3 partidos jugados en casa/fuera, lo que puede reducir la precisión.</div>';
    }
  }

  const lambdaHome = teamHome.pjHome > 0 ? teamHome.gfHome / teamHome.pjHome : teamHome.gf / teamHome.pj || 0;
  const lambdaAway = teamAway.pjAway > 0 ? teamAway.gfAway / teamAway.pjAway : teamAway.gf / teamAway.pj || 0;
  const possessionHome = parseNumberString($('possessionHome')?.value) || 50;
  const possessionAway = parseNumberString($('possessionAway')?.value) || 50;

  if (lambdaHome <= 0 || lambdaAway <= 0) {
    const details = $('details');
    if (details) {
      details.innerHTML = '<div class="error"><strong>Error:</strong> Los datos de goles no son válidos. Verifica las estadísticas de los equipos.</div>';
    }
    const suggestion = $('suggestion');
    if (suggestion) suggestion.innerHTML = 'Esperando datos para tu apuesta estelar...';
    console.timeEnd('calculateAll');
    return;
  }

  const pointsHome = teamHome.points;
  const pointsAway = teamHome.points;
  const winsHome = teamHome.gHome || teamHome.g;
  const winsAway = teamAway.gAway || teamAway.g;

  const probs = computeProbabilities(lambdaHome, lambdaAway, pointsHome, pointsAway, leagueCode, winsHome, winsAway, possessionHome, possessionAway);
  const pHome = $('pHome');
  const pDraw = $('pDraw');
  const pAway = $('pAway');
  const pBTTS = $('pBTTS');
  const pO25 = $('pO25');
  if (pHome) pHome.textContent = formatPct(probs.pHome);
  if (pDraw) pDraw.textContent = formatPct(probs.pDraw);
  if (pAway) pAway.textContent = formatPct(probs.pAway);
  if (pBTTS) pBTTS.textContent = formatPct(probs.pBTTS);
  if (pO25) pO25.textContent = formatPct(probs.pO25);

  let details = `<div><strong>Detalles del cálculo:</strong></div>`;
  details += `<div>• Equipo Local: ${teamHomeName} (Lambda: ${formatDec(lambdaHome)}, Goles Casa: ${teamHome.gfHome}, PJ Casa: ${teamHome.pjHome})</div>`;
  details += `<div>• Equipo Visitante: ${teamAwayName} (Lambda: ${formatDec(lambdaAway)}, Goles Fuera: ${teamAway.gfAway}, PJ Fuera: ${teamAway.pjAway})</div>`;
  details += `<div>• Lambda Local ajustado: ${formatDec(lambdaHome * calculateHomeAdvantage(leagueCode))}</div>`;
  details += `<div>• Lambda Visitante ajustado: ${formatDec(lambdaAway)}</div>`;
  details += `<div>• Posesión Local: ${possessionHome}% | Visitante: ${possessionAway}%</div>`;
  const detailsEl = $('details');
  if (detailsEl) detailsEl.innerHTML = details;

  const recommendations = [
    { name: `Gana ${teamHomeName}`, prob: probs.pHome },
    { name: 'Empate', prob: probs.pDraw },
    { name: `Gana ${teamAwayName}`, prob: probs.pAway },
    { name: 'BTTS Sí', prob: probs.pBTTS },
    { name: 'Over 2.5', prob: probs.pO25 }
  ];

  const maxProb = Math.max(...recommendations.map(r => r.prob));
  const suggestion = $('suggestion');
  if (maxProb > 0) {
    const bestRecommendation = recommendations.find(r => r.prob === maxProb);
    if (suggestion) {
      suggestion.innerHTML = `<p><strong>${formatPct(bestRecommendation.prob)}</strong> de acierto<br>Recomendación: ${bestRecommendation.name}<br>Según el pronóstico<br><small>El fútbol es impredecible, ¡apuesta con cautela!</small></p>`;
    }
  } else if (suggestion) {
    suggestion.innerHTML = 'Esperando datos para tu apuesta estelar...';
  }
  console.log('Calculation completed:', recommendations);
  console.timeEnd('calculateAll');
}
