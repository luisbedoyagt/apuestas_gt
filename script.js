// UTILITIES
const $ = id => {
    const element = document.getElementById(id);
    if (!element) console.error(`[Utilities] Element with ID ${id} not found in DOM`);
    return element;
};
const formatPct = x => (100 * (isFinite(x) ? x : 0)).toFixed(1) + '%';
const formatDec = x => (isFinite(x) ? x.toFixed(2) : '0.00');
const parseNumberString = val => {
    const s = String(val || '').replace(/,/g, '.');
    const n = Number(s);
    return isFinite(n) ? n : 0;
};
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}
function poissonProbability(lambda, k) {
    if (lambda <= 0 || k < 0) return 0;
    return (Math.exp(-lambda) * Math.pow(lambda, k)) / factorial(k);
}
function factorial(n) {
    if (n === 0 || n === 1) return 1;
    let res = 1;
    for (let i = 2; i <= n; i++) res *= i;
    return res;
}

// CONFIGURATION & GLOBAL STATE
const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbxMxspSR-2vpzbRjft59hAERHL-07gK3xFH9W_uew_ORcMdZGpWuPrav3q7MpkovDt2/exec";
let teamsByLeague = {};
let allData = {};
let eventInterval;
const leagueNames = {
    "esp.1": "LaLiga España", "esp.2": "Segunda España", "eng.1": "Premier League Inglaterra", "eng.2": "Championship Inglaterra",
    "ita.1": "Serie A Italia", "ger.1": "Bundesliga Alemania", "fra.1": "Ligue 1 Francia", "ned.1": "Eredivisie Países Bajos",
    "ned.2": "Eerste Divisie Países Bajos", "por.1": "Liga Portugal", "mex.1": "Liga MX México", "mex.2": "Liga de Expansión MX",
    "usa.1": "MLS Estados Unidos", "bra.1": "Brasileirão Brasil", "gua.1": "Liga Nacional Guatemala", "crc.1": "Liga Promerica Costa Rica",
    "hon.1": "Honduras LigaNacional", "slv.1": "El Salvador Liga Primera División", "ksa.1": "Pro League Arabia Saudita",
    "tur.1": "Super Lig de Turquía", "ger.2": "Bundesliga 2 de Alemania", "arg.1": "Liga Profesional de Fútbol de Argentina",
    "conmebol.sudamericana": "CONMEBOL Sudamericana", "conmebol.libertadores": "CONMEBOL Libertadores", "chn.1": "Superliga China",
    "fifa.worldq.conmebol": "Eliminatorias CONMEBOL", "fifa.worldq.concacaf": "Eliminatorias CONCACAF", "fifa.worldq.uefa": "Eliminatorias UEFA"
};
const leagueCodeToName = {
    "esp.1": "España_LaLiga", "esp.2": "España_Segunda", "eng.1": "Inglaterra_PremierLeague", "eng.2": "Inglaterra_Championship",
    "ita.1": "Italia_SerieA", "ger.1": "Alemania_Bundesliga", "fra.1": "Francia_Ligue1", "ned.1": "PaísesBajos_Eredivisie",
    "ned.2": "PaísesBajos_EersteDivisie", "por.1": "Portugal_LigaPortugal", "mex.1": "México_LigaMX", "mex.2": "México_ExpansionMX",
    "usa.1": "EstadosUnidos_MLS", "bra.1": "Brasil_Brasileirao", "gua.1": "Guatemala_LigaNacional", "crc.1": "CostaRica_LigaPromerica",
    "hon.1": "Honduras_LigaNacional", "slv.1": "ElSalvador_LigaPrimeraDivision", "ksa.1": "Arabia_Saudi_ProLeague",
    "tur.1": "Turquia_SuperLig", "ger.2": "Alemania_Bundesliga2", "arg.1": "Argentina_LigaProfesional",
    "conmebol.sudamericana": "CONMEBOL_Sudamericana", "conmebol.libertadores": "CONMEBOL_Libertadores", "chn.1": "China_Superliga",
    "fifa.worldq.conmebol": "Eliminatorias_CONMEBOL", "fifa.worldq.concacaf": "Eliminatorias_CONCACAF", "fifa.worldq.uefa": "Eliminatorias_UEFA"
};
const leagueRegions = {
    "esp.1": "Europa", "esp.2": "Europa", "eng.1": "Europa", "eng.2": "Europa", "ita.1": "Europa", "ger.1": "Europa", "fra.1": "Europa",
    "ned.1": "Europa", "ned.2": "Europa", "por.1": "Europa", "tur.1": "Europa", "ger.2": "Europa", "arg.1": "Sudamérica", "bra.1": "Sudamérica",
    "mex.1": "Norteamérica", "mex.2": "Norteamérica", "usa.1": "Norteamérica", "gua.1": "Centroamérica", "crc.1": "Centroamérica",
    "hon.1": "Centroamérica", "slv.1": "Centroamérica", "ksa.1": "Asia", "chn.1": "Asia",
    "conmebol.sudamericana": "Copas Internacionales", "conmebol.libertadores": "Copas Internacionales", "fifa.worldq.conmebol": "Eliminatorias Mundiales",
    "fifa.worldq.concacaf": "Eliminatorias Mundiales", "fifa.worldq.uefa": "Eliminatorias Mundiales"
};

// DATA NORMALIZATION & FETCHING
function normalizeTeam(raw) {
    if (!raw) return null;
    const r = {};
    r.name = (raw.name || '').trim();
    if (!r.name) return null;
    r.pos = parseNumberString(raw.rank || 0); r.gf = parseNumberString(raw.goalsFor || 0);
    r.ga = parseNumberString(raw.goalsAgainst || 0); r.pj = parseNumberString(raw.gamesPlayed || 0);
    r.g = parseNumberString(raw.wins || 0); r.e = parseNumberString(raw.ties || 0);
    r.p = parseNumberString(raw.losses || 0); r.points = parseNumberString(raw.points || (r.g * 3 + r.e) || 0);
    r.gfHome = parseNumberString(raw.goalsForHome || 0); r.gfAway = parseNumberString(raw.goalsForAway || 0);
    r.gaHome = parseNumberString(raw.goalsAgainstHome || 0); r.gaAway = parseNumberString(raw.goalsAgainstAway || 0);
    r.pjHome = parseNumberString(raw.gamesPlayedHome || 0); r.pjAway = parseNumberString(raw.gamesPlayedAway || 0);
    r.winsHome = parseNumberString(raw.winsHome || 0); r.winsAway = parseNumberString(raw.winsAway || 0);
    r.tiesHome = parseNumberString(raw.tiesHome || 0); r.tiesAway = parseNumberString(raw.tiesAway || 0);
    r.lossesHome = parseNumberString(raw.lossesHome || 0); r.lossesAway = parseNumberString(raw.lossesAway || 0);
    r.logoUrl = raw.logoUrl || '';
    return r;
}
async function fetchAllData() {
    const leagueSelect = $('leagueSelect');
    if (leagueSelect) {
        leagueSelect.innerHTML = '<option value="">Cargando datos...</option>';
        leagueSelect.style.display = 'block';
    }
    try {
        console.log('[fetchAllData] Requesting data from:', WEBAPP_URL);
        const res = await fetch(`${WEBAPP_URL}?tipo=todo&update=false`);
        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`HTTP Error ${res.status}: ${res.statusText}. Response: ${errorText}`);
        }
        allData = await res.json();
        console.log('[fetchAllData] Data received:', allData);
        if (!allData || !allData.calendario || !allData.ligas) {
            throw new Error('Invalid data structure: "calendario" or "ligas" missing.');
        }
        if (!Object.keys(allData.ligas).length) {
            console.warn('[fetchAllData] allData.ligas is empty');
            throw new Error('No leagues found in API data.');
        }
        const normalized = {};
        for (const key in allData.ligas) {
            normalized[key] = (allData.ligas[key] || []).map(normalizeTeam).filter(t => t && t.name);
            console.log(`[fetchAllData] League ${key} normalized with ${normalized[key].length} teams`);
        }
        teamsByLeague = normalized;
        localStorage.setItem('allData', JSON.stringify(allData));
        console.log('[fetchAllData] Data stored in localStorage');
        return allData;
    } catch (err) {
        console.error('[fetchAllData] Error:', err);
        const errorMsg = `<div class="error"><strong>Error:</strong> No se pudieron cargar los datos de la API. Verifica la conexión a la hoja de Google Sheets o el endpoint de la API. Detalle: ${err.message}</div>`;
        const details = $('details');
        if (details) details.innerHTML = errorMsg;
        if (leagueSelect) {
            leagueSelect.innerHTML = '<option value="">Error al cargar ligas</option>';
            leagueSelect.style.display = 'block';
        }
        return {};
    }
}
function findTeam(leagueCode, teamName) {
    if (leagueCode) {
        if (!teamsByLeague[leagueCode]) return null;
        return teamsByLeague[leagueCode].find(t => t.name.trim().toLowerCase() === teamName.trim().toLowerCase()) || null;
    } else {
        if (!teamsByLeague) return null;
        for (const code in teamsByLeague) {
            const team = teamsByLeague[code].find(t => t.name.trim().toLowerCase() === teamName.trim().toLowerCase());
            if (team) return team;
        }
        return null;
    }
}

// UI & EVENT HANDLING
function onLeagueChange() {
    const code = $('leagueSelect').value;
    console.log('[onLeagueChange] Selected league:', code);
    const teamHomeSelect = $('teamHome');
    const teamAwaySelect = $('teamAway');
    teamHomeSelect.disabled = !code;
    teamAwaySelect.disabled = !code;
    if (!teamHomeSelect || !teamAwaySelect) {
        console.error('[onLeagueChange] DOM elements teamHome or teamAway not found');
        return;
    }
    teamHomeSelect.innerHTML = '<option value="">Cargando equipos...</option>';
    teamAwaySelect.innerHTML = '<option value="">Cargando equipos...</option>';
    if (!code || !teamsByLeague[code] || teamsByLeague[code].length === 0) {
        clearTeamData('Home');
        clearTeamData('Away');
        const details = $('details');
        if (details) {
            details.innerHTML = '<div class="warning"><strong>Advertencia:</strong> No hay datos disponibles para esta liga.</div>';
        }
        console.log('[onLeagueChange] No data for league:', code);
        displaySelectedLeagueEvents('');
        return;
    }
    const teams = teamsByLeague[code].sort((a, b) => a.name.localeCompare(b.name));
    const fragmentHome = document.createDocumentFragment();
    const defaultOptionHome = document.createElement('option');
    defaultOptionHome.value = '';
    defaultOptionHome.textContent = '-- Selecciona equipo --';
    fragmentHome.appendChild(defaultOptionHome);
    const fragmentAway = document.createDocumentFragment();
    const defaultOptionAway = document.createElement('option');
    defaultOptionAway.value = '';
    defaultOptionAway.textContent = '-- Selecciona equipo --';
    fragmentAway.appendChild(defaultOptionAway);
    teams.forEach(t => {
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
    displaySelectedLeagueEvents(code);
}
function selectEvent(homeTeamName, awayTeamName) {
    const teamHomeSelect = $('teamHome');
    const teamAwaySelect = $('teamAway');
    const leagueSelect = $('leagueSelect');
    let eventLeagueCode = '';
    const ligaName = Object.keys(allData.calendario).find(liga =>
        (allData.calendario[liga] || []).some(e =>
            e.local.trim().toLowerCase() === homeTeamName.trim().toLowerCase() &&
            e.visitante.trim().toLowerCase() === awayTeamName.trim().toLowerCase()
        )
    );
    if (ligaName) {
        eventLeagueCode = Object.keys(leagueCodeToName).find(key => leagueCodeToName[key] === ligaName) || '';
    }
    if (eventLeagueCode && leagueSelect) {
        leagueSelect.value = eventLeagueCode;
        const changeEvent = new Event('change');
        leagueSelect.dispatchEvent(changeEvent);
    } else {
        console.error('[selectEvent] Could not find league for event.');
        const details = $('details');
        if (details) {
            details.innerHTML = '<div class="error"><strong>Error:</strong> No se pudo encontrar la liga del evento.</div>';
        }
        return;
    }
    const normalizeName = name => name.trim().toLowerCase();
    const homeTeamNameNormalized = normalizeName(homeTeamName);
    const awayTeamNameNormalized = normalizeName(awayTeamName);
    setTimeout(() => {
        const homeOption = Array.from(teamHomeSelect.options).find(opt => normalizeName(opt.text) === homeTeamNameNormalized);
        const awayOption = Array.from(teamAwaySelect.options).find(opt => normalizeName(opt.text) === awayTeamNameNormalized);
        if (homeOption) { teamHomeSelect.value = homeOption.value; } else { console.error('[selectEvent] Home team not found:', homeTeamName); }
        if (awayOption) { teamAwaySelect.value = awayOption.value; } else { console.error('[selectEvent] Away team not found:', awayTeamName); }
        if (homeOption && awayOption && restrictSameTeam()) {
            fillTeamData(homeTeamName, eventLeagueCode, 'Home');
            fillTeamData(awayTeamName, eventLeagueCode, 'Away');
            calculateAll();
        } else {
            const details = $('details');
            if (details) { details.innerHTML = `<div class="error"><strong>Error:</strong> No se pudo encontrar uno o ambos equipos en la lista de la liga.</div>`; }
            console.error('[selectEvent] Failed to select teams:', { homeTeamName, awayTeamName, homeOption, awayOption });
        }
    }, 500);
}
function restrictSameTeam() {
    const teamHome = $('teamHome').value;
    const teamAway = $('teamAway').value;
    if (teamHome && teamAway && teamHome === teamAway) {
        const details = $('details');
        if (details) {
            details.innerHTML = '<div class="error"><strong>Error:</strong> No puedes seleccionar el mismo equipo para local y visitante.</div>';
            setTimeout(() => { details.innerHTML = '<div class="info"><strong>Instrucciones:</strong> Selecciona una liga y los equipos local y visitante para obtener el pronóstico.</div>'; }, 5000);
        }
        if (document.activeElement === $('teamHome')) { $('teamHome').value = ''; clearTeamData('Home'); } else { $('teamAway').value = ''; clearTeamData('Away'); }
        return false;
    }
    return true;
}
function clearTeamData(type) {
    const typeLower = type.toLowerCase();
    $(`pos${type}`).textContent = '--';
    $(`gf${type}`).textContent = '--';
    $(`ga${type}`).textContent = '--';
    $(`winRate${type}`).textContent = '--';
    const box = $(`form${type}Box`);
    if (box) {
        box.innerHTML = `<div class="team-details"><div class="stat-section"><span class="section-title">General</span><div class="stat-metrics"><span>PJ: 0</span><span>Puntos: 0</span><span>DG: 0</span></div></div><div class="stat-section"><span class="section-title">Local</span><div class="stat-metrics"><span>PJ: 0</span><span>PG: 0</span><span>DG: 0</span></div></div><div class="stat-section"><span class="section-title">Visitante</span><div class="stat-metrics"><span>PJ: 0</span><span>PG: 0</span><span>DG: 0</span></div></div></div>`;
    }
    const cardHeader = $(`card-${typeLower}`)?.querySelector('.card-header');
    const h3 = cardHeader ? cardHeader.querySelector('h3') : null;
    const logoImg = h3 ? cardHeader.querySelector('.team-logo') : null;
    if (logoImg) { logoImg.remove(); }
}
function clearAll() {
    document.querySelectorAll('.stat-value').forEach(el => el.textContent = '--');
    document.querySelectorAll('select').forEach(s => s.selectedIndex = 0);
    ['pHome', 'pDraw', 'pAway', 'pBTTS', 'pO25'].forEach(id => {
        const el = $(id);
        if (el) el.textContent = '--';
    });
    const details = $('details');
    if (details) { details.innerHTML = '<div class="info"><strong>Instrucciones:</strong> Selecciona una liga y los equipos local y visitante para obtener el pronóstico.</div>'; }
    const suggestion = $('suggestion');
    if (suggestion) { suggestion.innerHTML = '<p>Esperando datos...</p>'; }
    const combinedPrediction = $('combined-prediction');
    if (combinedPrediction) { combinedPrediction.innerHTML = '<p>Esperando pronóstico combinado...</p>'; }
    clearTeamData('Home');
    clearTeamData('Away');
    displaySelectedLeagueEvents('');
}
function displaySelectedLeagueEvents(leagueCode) {
    const selectedEventsList = $('selected-league-events');
    if (!selectedEventsList) { console.warn('[displaySelectedLeagueEvents] Element selected-league-events not found'); return; }
    if (eventInterval) { clearInterval(eventInterval); eventInterval = null; }
    selectedEventsList.innerHTML = '';
    if (!allData.calendario) { selectedEventsList.innerHTML = '<div class="event-item placeholder"><span>Selecciona una liga para ver eventos próximos.</span></div>'; console.log('[displaySelectedLeagueEvents] No allData.calendario'); return; }
    let events = [];
    if (!leagueCode) { Object.keys(allData.calendario).forEach(ligaName => { events = events.concat(allData.calendario[ligaName] || []); }); } else {
        const ligaName = leagueCodeToName[leagueCode];
        events = allData.calendario[ligaName] || [];
    }
    if (events.length === 0) {
        selectedEventsList.innerHTML = '<div class="event-item placeholder"><span>No hay eventos próximos para esta liga.</span></div>';
        console.log(`[displaySelectedLeagueEvents] No events for ${leagueCode || 'all leagues'}`);
        return;
    }
    const eventsPerPage = 1;
    const totalPages = Math.ceil(events.length / eventsPerPage);
    let currentPage = 0;
    function showCurrentPage() {
        const startIndex = currentPage * eventsPerPage;
        const eventsToShow = events.slice(startIndex, startIndex + eventsPerPage);
        const currentItems = selectedEventsList.querySelectorAll('.event-item');
        if (currentItems.length > 0) { currentItems.forEach(item => { item.classList.remove('slide-in'); item.classList.add('slide-out'); }); }
        setTimeout(() => {
            selectedEventsList.innerHTML = '';
            eventsToShow.forEach((event, index) => {
                const div = document.createElement('div');
                div.className = 'event-item slide-in';
                div.style.animationDelay = `${index * 0.1}s`;
                div.dataset.homeTeam = event.local.trim();
                div.dataset.awayTeam = event.visitante.trim();
                const homeTeam = findTeam(leagueCode, event.local.trim());
                const awayTeam = findTeam(leagueCode, event.visitante.trim());
                const homeLogo = homeTeam?.logoUrl || '';
                const awayLogo = awayTeam?.logoUrl || '';
                let eventDateTime, isInProgress = false;
                try {
                    const parsedDate = new Date(event.fecha);
                    if (isNaN(parsedDate.getTime())) { throw new Error("Invalid Date"); }
                    const now = new Date();
                    const matchDuration = 120 * 60 * 1000;
                    if (now >= parsedDate && now < new Date(parsedDate.getTime() + matchDuration)) { isInProgress = true; }
                    const dateOptions = { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'America/Guatemala' };
                    const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Guatemala' };
                    const formattedDate = parsedDate.toLocaleDateString('es-ES', dateOptions);
                    const formattedTime = parsedDate.toLocaleTimeString('es-ES', timeOptions);
                    eventDateTime = `${formattedDate} ${formattedTime} (GT)`;
                } catch (err) {
                    console.warn(`[displaySelectedLeagueEvents] Error parsing date for event: ${event.local} vs. ${event.visitante}`, err);
                    eventDateTime = `${event.fecha} (Hora no disponible)`;
                }
                let statusText = isInProgress ? ' - Evento en Juego' : '';
                div.innerHTML = `<div class="event-content"><div class="team-logo-container"><span class="team-name">${event.local.trim()}</span><img src="${homeLogo}" class="team-logo home-logo ${!homeLogo ? 'hidden' : ''}" alt="Logo de ${event.local.trim()}"><span class="vs">vs.</span><img src="${awayLogo}" class="team-logo away-logo ${!awayLogo ? 'hidden' : ''}" alt="Logo de ${event.visitante.trim()}"><span class="team-name">${event.visitante.trim()}</span></div><span class="event-details">${eventDateTime}${statusText}</span><span class="event-details">Estadio: ${event.estadio || 'Por confirmar'}</span></div>`;
                if (isInProgress) {
                    div.classList.add('in-progress');
                    div.style.cursor = 'not-allowed';
                    div.title = 'Evento en curso, no seleccionable';
                } else {
                    div.addEventListener('click', () => { selectEvent(event.local.trim(), event.visitante.trim()); });
                }
                selectedEventsList.appendChild(div);
            });
            currentPage = (currentPage + 1) % totalPages;
        }, 800);
    }
    showCurrentPage();
    if (totalPages > 1) { eventInterval = setInterval(showCurrentPage, 10000); }
}
function fillTeamData(teamName, leagueCode, type) {
    const t = findTeam(leagueCode, teamName);
    const typeLower = type.toLowerCase();
    if (!t) {
        console.error(`[fillTeamData] Team not found: ${teamName} in league ${leagueCode}`);
        const details = $('details');
        if (details) { details.innerHTML = `<div class="error"><strong>Error:</strong> Equipo ${teamName} no encontrado en la liga seleccionada.</div>`; }
        return;
    }
    $(`pos${type}`).textContent = t.pos || '--';
    $(`gf${type}`).textContent = formatDec(t.gf / (t.pj || 1));
    $(`ga${type}`).textContent = formatDec(t.ga / (t.pj || 1));
    $(`winRate${type}`).textContent = formatPct(t.pj ? t.g / t.pj : 0);
    const dg = t.gf - t.ga;
    const dgHome = t.gfHome - t.gaHome;
    const dgAway = t.gfAway - t.gaAway;
    const box = $(`form${type}Box`);
    if (box) {
        box.innerHTML = `<div class="team-details"><div class="stat-section"><span class="section-title">General</span><div class="stat-metrics"><span>PJ: ${t.pj || 0}</span><span>Puntos: ${t.points || 0}</span><span>DG: ${dg >= 0 ? '+' + dg : dg || 0}</span></div></div><div class="stat-section"><span class="section-title">Local</span><div class="stat-metrics"><span>PJ: ${t.pjHome || 0}</span><span>PG: ${t.winsHome || 0}</span><span>DG: ${dgHome >= 0 ? '+' + dgHome : dgHome || 0}</span></div></div><div class="stat-section"><span class="section-title">Visitante</span><div class="stat-metrics"><span>PJ: ${t.pjAway || 0}</span><span>PG: ${t.winsAway || 0}</span><span>DG: ${dgAway >= 0 ? '+' + dgAway : dgAway || 0}</span></div></div></div>`;
    }
    const cardHeader = $(`card-${typeLower}`)?.querySelector('.card-header');
    if (cardHeader) {
        let logoImg = cardHeader.querySelector('.team-logo');
        if (!logoImg) {
            logoImg = document.createElement('img');
            logoImg.className = 'team-logo';
            logoImg.alt = `Logo de ${t.name}`;
            const h3 = cardHeader.querySelector('h3');
            if (h3) { h3.insertAdjacentElement('beforebegin', logoImg); }
        }
        logoImg.src = t.logoUrl || '';
        logoImg.style.display = t.logoUrl ? 'inline-block' : 'none';
    }
}

// CALCULATION LOGIC
function dixonColesProbabilities(tH, tA, league) {
    const rho = -0.11;
    const shrinkageFactor = 1.0;
    const teams = teamsByLeague[league];
    let totalGames = 0, totalGf = 0, totalGa = 0, totalGfHome = 0, totalGaHome = 0, totalGfAway = 0, totalGaAway = 0;
    teams.forEach(t => {
        totalGames += t.pj || 0; totalGf += t.gf || 0; totalGa += t.ga || 0;
        totalGfHome += t.gfHome || 0; totalGaHome += t.gaHome || 0;
        totalGfAway += t.gfAway || 0; totalGaAway += t.gaAway || 0;
    });
    const leagueAvgGfHome = totalGfHome / (totalGames || 1);
    const leagueAvgGaAway = totalGaAway / (totalGames || 1);
    const leagueAvgGfAway = totalGfAway / (totalGames || 1);
    const leagueAvgGaHome = totalGaHome / (totalGames || 1);
    const homeAttackRaw = (tH.gfHome || 0) / (tH.pjHome || 1);
    const homeDefenseRaw = (tH.gaHome || 0) / (tH.pjHome || 1);
    const awayAttackRaw = (tA.gfAway || 0) / (tA.pjAway || 1);
    const awayDefenseRaw = (tA.gaAway || 0) / (tA.pjAway || 1);
    const homeAttack = (homeAttackRaw / leagueAvgGfHome) * shrinkageFactor;
    const homeDefense = (homeDefenseRaw / leagueAvgGaHome) * shrinkageFactor;
    const awayAttack = (awayAttackRaw / leagueAvgGfAway) * shrinkageFactor;
    const awayDefense = (awayDefenseRaw / leagueAvgGaHome) * shrinkageFactor;
    const expectedHomeGoals = homeAttack * awayDefense * leagueAvgGfHome;
    const expectedAwayGoals = awayAttack * homeDefense * leagueAvgGaHome;
    let homeWin = 0, draw = 0, awayWin = 0;
    for (let i = 0; i <= 10; i++) {
        for (let j = 0; j <= 10; j++) {
            const prob = poissonProbability(expectedHomeGoals, i) * poissonProbability(expectedAwayGoals, j);
            if (i > j) homeWin += prob;
            else if (i === j) draw += prob;
            else awayWin += prob;
        }
    }
    const tau = (scoreH, scoreA) => {
        if (scoreH === 0 && scoreA === 0) return 1 - (homeAttack * awayDefense * rho);
        if (scoreH === 0 && scoreA === 1) return 1 + (homeAttack * rho);
        if (scoreH === 1 && scoreA === 0) return 1 + (awayDefense * rho);
        if (scoreH === 1 && scoreA === 1) return 1 - rho;
        return 1;
    };
    let adjustedDraw = 0;
    for (let i = 0; i <= 10; i++) {
        const prob = poissonProbability(expectedHomeGoals, i) * poissonProbability(expectedAwayGoals, i) * tau(i, i);
        adjustedDraw += prob;
    }
    const total = homeWin + draw + awayWin;
    if (total > 0) {
        const scale = 1 / total;
        homeWin *= scale;
        draw *= scale;
        awayWin *= scale;
    }
    const adjustedTotal = homeWin + adjustedDraw + awayWin;
    if (adjustedTotal > 0) {
        const scale = 1 / adjustedTotal;
        homeWin *= scale;
        adjustedDraw *= scale;
        awayWin *= scale;
    }
    const pBTTSH = 1 - poissonProbability(expectedHomeGoals, 0) - poissonProbability(expectedAwayGoals, 0) + poissonProbability(expectedHomeGoals, 0) * poissonProbability(expectedAwayGoals, 0);
    const pO25H = 1 - (poissonProbability(expectedHomeGoals, 0) + poissonProbability(expectedHomeGoals, 1) + poissonProbability(expectedHomeGoals, 2)) * (poissonProbability(expectedAwayGoals, 0) + poissonProbability(expectedAwayGoals, 1) + poissonProbability(expectedAwayGoals, 2));
    return { finalHome: homeWin, finalDraw: adjustedDraw, finalAway: awayWin, pBTTSH, pO25H };
}
function parsePlainText(text, matchData) {
    console.log(`[parsePlainText] Processing text for ${matchData.local} vs ${matchData.visitante}`);
    const aiProbs = {};
    const aiJustification = { home: "Sin justificación detallada.", draw: "Sin justificación detallada.", away: "Sin justificación detallada." };
    const probsMatch = text.match(/Probabilidades:\s*(.*?)(?:Ambos Anotan|$)/s);
    if (probsMatch && probsMatch[1]) {
        const probsText = probsMatch[1];
        const percentages = probsText.match(/(\d+)%/g) || [];
        if (percentages.length >= 3) {
            aiProbs.home = parseFloat(percentages[0]) / 100;
            aiProbs.draw = parseFloat(percentages[1]) / 100;
            aiProbs.away = parseFloat(percentages[2]) / 100;
            console.log(`[parsePlainText] Extracted probabilities: Local=${aiProbs.home}, Draw=${aiProbs.draw}, Away=${aiProbs.away}`);
        } else {
            console.warn(`[parsePlainText] Not enough probabilities found in text: ${probsText}`);
        }
    } else {
        console.warn(`[parsePlainText] No probabilities section found in text: ${text}`);
    }
    const analysisMatch = text.match(/Análisis del Partido:(.*?)Probabilidades:/s);
    if (analysisMatch && analysisMatch[1]) {
        const analysisText = analysisMatch[1];
        const localJustification = analysisText.match(new RegExp(`${matchData.local}:(.*?)(?:Empate:|$)`, 's'));
        const drawJustification = analysisText.match(/Empate:(.*?)(?:(?:[^:]+:)|$)/s);
        const awayJustification = analysisText.match(new RegExp(`${matchData.visitante}:(.*?)(?:Probabilidades:|$)`, 's'));
        if (localJustification) aiJustification.home = localJustification[1].trim();
        if (drawJustification) aiJustification.draw = drawJustification[1].trim();
        if (awayJustification) aiJustification.away = awayJustification[1].trim();
        console.log(`[parsePlainText] Extracted justifications: Home=${aiJustification.home}, Draw=${aiJustification.draw}, Away=${aiJustification.away}`);
    } else {
        console.warn(`[parsePlainText] No analysis section found in text: ${text}`);
    }
    const result = {
        "1X2": {
            victoria_local: { probabilidad: (aiProbs.home * 100 || 0).toFixed(0) + '%', justificacion: aiJustification.home },
            empate: { probabilidad: (aiProbs.draw * 100 || 0).toFixed(0) + '%', justificacion: aiJustification.draw },
            victoria_visitante: { probabilidad: (aiProbs.away * 100 || 0).toFixed(0) + '%', justificacion: aiJustification.away }
        },
        "BTTS": {
            si: { probabilidad: (text.match(/BTTS.*Sí:\s*(\d+)%/)?.[1] || '0') + '%', justificacion: "" },
            no: { probabilidad: (text.match(/BTTS.*No:\s*(\d+)%/)?.[1] || '0') + '%', justificacion: "" }
        },
        "Goles": {
            mas_2_5: { probabilidad: (text.match(/Más de 2\.5:\s*(\d+)%/)?.[1] || '0') + '%', justificacion: "" },
            menos_2_5: { probabilidad: (text.match(/Menos de 2\.5:\s*(\d+)%/)?.[1] || '0') + '%', justificacion: "" }
        }
    };
    console.log(`[parsePlainText] Final result:`, result);
    return result;
}
function truncateText(text, maxWords = 20) {
    const words = text.split(' ');
    if (words.length > maxWords) {
        const truncated = words.slice(0, maxWords).join(' ') + '...';
        return { text: truncated, needsButton: true, fullText: text };
    }
    return { text: text, needsButton: false, fullText: text };
}
function toggleText(event) {
    const button = event.target;
    const parentSpan = button.closest('.rec-bet');
    if (!parentSpan) return;
    const isExpanded = parentSpan.classList.contains('expanded');
    const fullText = parentSpan.dataset.fullText;
    const originalContent = parentSpan.dataset.originalContent;
    if (isExpanded) {
        parentSpan.classList.remove('expanded');
        parentSpan.innerHTML = originalContent;
        parentSpan.querySelector('button').addEventListener('click', toggleText);
    } else {
        parentSpan.classList.add('expanded');
        parentSpan.innerHTML = fullText;
        const newButton = document.createElement('button');
        newButton.textContent = 'Leer menos';
        newButton.addEventListener('click', toggleText);
        parentSpan.appendChild(newButton);
    }
}
function getCombinedPrediction(stats, event, matchData) {
    const combined = {};
    const ai = event.pronostico_json || parsePlainText(event.pronostico || '', matchData);
    if (!ai || !ai["1X2"] || Object.values(ai["1X2"]).every(p => !p?.probabilidad)) {
        combined.header = "Análisis Estadístico Principal";
        combined.body = `<div class="rec-suggestion"><p>No se encontró un pronóstico de IA válido. Análisis basado en estadísticas:</p><ul><li class="rec-item"><span class="rec-bet">${matchData.local}</span><span class="rec-prob">${formatPct(stats.finalHome)}</span></li><li class="rec-item"><span class="rec-bet">Empate</span><span class="rec-prob">${formatPct(stats.finalDraw)}</span></li><li class="rec-item"><span class="rec-bet">${matchData.visitante}</span><span class="rec-prob">${formatPct(stats.finalAway)}</span></li></ul></div>`;
        console.log('[getCombinedPrediction] No valid AI forecast, using only statistics');
        return combined;
    }
    const statProbs = { home: stats.finalHome, draw: stats.finalDraw, away: stats.finalAway };
    const aiProbs = { home: parseFloat(ai["1X2"].victoria_local.probabilidad) / 100 || 0, draw: parseFloat(ai["1X2"].empate.probabilidad) / 100 || 0, away: parseFloat(ai["1X2"].victoria_visitante.probabilidad) / 100 || 0 };
    const statMax = Math.max(statProbs.home, statProbs.draw, statProbs.away);
    const aiMax = Math.max(aiProbs.home, aiProbs.draw, aiProbs.away);
    const statBest = Object.keys(statProbs).find(k => statProbs[k] === statMax);
    const aiBest = Object.keys(aiProbs).find(k => aiProbs[k] === aiMax);
    let header = statBest === aiBest ? `¡Consenso! Apuesta Fuerte en la ${statBest === 'home' ? `Victoria ${matchData.local}` : statBest === 'draw' ? 'Empate' : `Victoria ${matchData.visitante}`} ⭐` : "Discrepancia en Pronósticos ⚠️";
    const getJustificationHtml = (text, team, isVerdict = false) => {
        const maxWords = isVerdict ? 30 : 20;
        const truncated = truncateText(text, maxWords);
        let contentPrefix = isVerdict ? `<strong>Veredicto:</strong> ` : `<strong>${team}:</strong> `;
        let contentText = `${truncated.text}`;
        let buttonHtml = truncated.needsButton ? ` <button>Leer más</button>` : '';
        let fullContentText = isVerdict ? `<strong>Veredicto:</strong> ${truncated.fullText}` : `<strong>${team}:</strong> ${truncated.fullText}`;
        return { truncatedHtml: contentPrefix + contentText + buttonHtml, fullHtml: fullContentText };
    };
    const homeJustHtml = getJustificationHtml(ai["1X2"].victoria_local.justificacion || "Sin justificación detallada.", matchData.local);
    const drawJustHtml = getJustificationHtml(ai["1X2"].empate.justificacion || "Sin justificación detallada.", "Empate");
    const awayJustHtml = getJustificationHtml(ai["1X2"].victoria_visitante.justificacion || "Sin justificación detallada.", matchData.visitante);
    const verdictRawText = statBest === aiBest ? `Ambos modelos coinciden en que la <strong>${statBest === 'home' ? `Victoria ${matchData.local}` : statBest === 'draw' ? 'Empate' : `Victoria ${matchData.visitante}`}</strong> es el resultado más probable.` : `Discrepancia detectada. El modelo estadístico (${formatPct(statMax)}) favorece la <strong>${statBest === 'home' ? `Victoria ${matchData.local}` : statBest === 'draw' ? 'Empate' : `Victoria ${matchData.visitante}`}</strong>, mientras que la IA (${formatPct(aiMax)}) se inclina por la <strong>${aiBest === 'home' ? `Victoria ${matchData.local}` : aiBest === 'draw' ? 'Empate' : `Victoria ${matchData.visitante}`}</strong>. Analiza los detalles para decidir.`;
    const verdictHtml = getJustificationHtml(verdictRawText, '', true);
    let body = `<div class="rec-suggestion"><h4>Análisis del Partido</h4><ul><li class="rec-item"><span class="rec-bet" data-full-text="${escapeHtml(homeJustHtml.fullHtml)}" data-original-content="${escapeHtml(homeJustHtml.truncatedHtml)}">${homeJustHtml.truncatedHtml}</span><span class="rec-prob">IA: ${formatPct(aiProbs.home)} | Stats: ${formatPct(statProbs.home)}</span></li><li class="rec-item"><span class="rec-bet" data-full-text="${escapeHtml(drawJustHtml.fullHtml)}" data-original-content="${escapeHtml(drawJustHtml.truncatedHtml)}">${drawJustHtml.truncatedHtml}</span><span class="rec-prob">IA: ${formatPct(aiProbs.draw)} | Stats: ${formatPct(statProbs.draw)}</span></li><li class="rec-item"><span class="rec-bet" data-full-text="${escapeHtml(awayJustHtml.fullHtml)}" data-original-content="${escapeHtml(awayJustHtml.truncatedHtml)}">${awayJustHtml.truncatedHtml}</span><span class="rec-prob">IA: ${formatPct(aiProbs.away)} | Stats: ${formatPct(statProbs.away)}</span></li></ul><h4>Otros Mercados</h4><ul><li class="rec-item"><span class="rec-bet">Ambos Anotan (Sí)</span><span class="rec-prob">${ai.BTTS.si.probabilidad || '0%'}</span></li><li class="rec-item"><span class="rec-bet">Ambos Anotan (No)</span><span class="rec-prob">${ai.BTTS.no.probabilidad || '0%'}</span></li><li class="rec-item"><span class="rec-bet">Más de 2.5 Goles</span><span class="rec-prob">${ai.Goles.mas_2_5.probabilidad || '0%'}</span></li><li class="rec-item"><span class="rec-bet">Menos de 2.5 Goles</span><span class="rec-prob">${ai.Goles.menos_2_5.probabilidad || '0%'}</span></li></ul><h4>Veredicto</h4><ul><li class="rec-item verdict-item"><span class="rec-bet" data-full-text="${escapeHtml(verdictHtml.fullHtml)}" data-original-content="${escapeHtml(verdictHtml.truncatedHtml)}">${verdictHtml.truncatedHtml}</span></li></ul></div>`;
    combined.header = header;
    combined.body = body;
    console.log('[getCombinedPrediction] Combined forecast:', combined);
    return combined;
}
function calculateAll() {
    const leagueSelect = $('leagueSelect');
    const teamHomeSelect = $('teamHome');
    const teamAwaySelect = $('teamAway');
    if (!leagueSelect || !teamHomeSelect || !teamAwaySelect) {
        console.error('[calculateAll] DOM elements not found: leagueSelect=', !!leagueSelect, 'teamHome=', !!teamHomeSelect, 'teamAway=', !!teamAwaySelect);
        const details = $('details');
        if (details) { details.innerHTML = '<div class="error"><strong>Error:</strong> Problema con la interfaz HTML. Verifica los elementos select.</div>'; }
        return;
    }
    const leagueCode = leagueSelect.value;
    const teamHome = teamHomeSelect.value;
    const teamAway = teamAwaySelect.value;
    console.log('[calculateAll] Current values: leagueCode=', leagueCode, 'teamHome=', teamHome, 'teamAway=', teamAway);
    if (!leagueCode || !teamHome || !teamAway) {
        const details = $('details');
        if (details) { details.innerHTML = '<div class="warning"><strong>Advertencia:</strong> Selecciona una liga y ambos equipos para calcular el pronóstico.</div>'; }
        console.log('[calculateAll] Missing data: leagueCode=', leagueCode, 'teamHome=', teamHome, 'teamAway=', teamAway);
        return;
    }
    const tH = findTeam(leagueCode, teamHome);
    const tA = findTeam(leagueCode, teamAway);
    if (!tH || !tA) {
        const details = $('details');
        if (details) { details.innerHTML = `<div class="error"><strong>Error:</strong> Uno o ambos equipos no encontrados en la liga seleccionada.</div>`; }
        console.error('[calculateAll] Teams not found: tH=', tH, 'tA=', tA);
        return;
    }
    const stats = dixonColesProbabilities(tH, tA, leagueCode);
    console.log('[calculateAll] Statistical probabilities:', stats);
    const ligaName = leagueCodeToName[leagueCode];
    const event = allData.calendario[ligaName]?.find(e => e.local.trim().toLowerCase() === teamHome.trim().toLowerCase() && e.visitante.trim().toLowerCase() === teamAway.trim().toLowerCase());
    const matchData = { local: teamHome, visitante: teamAway };
    const probabilities = [
        { label: 'Local', value: stats.finalHome, id: 'pHome', type: 'Resultado' },
        { label: 'Empate', value: stats.finalDraw, id: 'pDraw', type: 'Resultado' },
        { label: 'Visitante', value: stats.finalAway, id: 'pAway', type: 'Resultado' },
        { label: 'Ambos Anotan', value: event?.pronostico_json ? parseFloat(event.pronostico_json.BTTS.si.probabilidad) / 100 : stats.pBTTSH, id: 'pBTTS', type: 'Mercado' },
        { label: 'Más de 2.5 goles', value: event?.pronostico_json ? parseFloat(event.pronostico_json.Goles.mas_2_5.probabilidad) / 100 : stats.pO25H, id: 'pO25', type: 'Mercado' }
    ];
    probabilities.forEach(p => { const el = $(p.id); if (el) el.textContent = formatPct(p.value); });
    const recommendations = probabilities.filter(p => p.value >= 0.3).sort((a, b) => b.value - a.value).slice(0, 3);
    console.log('[calculateAll] Recommendations:', recommendations);
    let suggestionText = `<div class="rec-suggestion"><h3>Recomendaciones de Apuesta</h3><ul>${recommendations.map((r, index) => `<li class="rec-item"><span class="rec-rank">${index + 1}</span><span class="rec-bet">${r.label}</span><span class="rec-prob">${formatPct(r.value)}</span></li>`).join('')}</ul></div>`;
    const suggestion = $('suggestion');
    if (suggestion) { suggestion.innerHTML = suggestionText; }
    const combined = getCombinedPrediction(stats, event || {}, matchData);
    const combinedPrediction = $('combined-prediction');
    if (combinedPrediction) {
        combinedPrediction.innerHTML = '';
        const headerElement = document.createElement('h3');
        headerElement.innerHTML = combined.header;
        combinedPrediction.appendChild(headerElement);
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = combined.body;
        while (tempDiv.firstChild) { combinedPrediction.appendChild(tempDiv.firstChild); }
        combinedPrediction.querySelectorAll('.rec-bet button').forEach(button => { button.addEventListener('click', toggleText); });
    }
}

// INITIALIZATION
async function init() {
    console.log('[init] Starting app at', new Date().toLocaleString('es-ES', { timeZone: 'America/Guatemala' }));
    clearAll();
    const leagueSelect = $('leagueSelect');
    const teamHomeSelect = $('teamHome');
    const teamAwaySelect = $('teamAway');
    if (!leagueSelect || !teamHomeSelect || !teamAwaySelect) {
        console.error('[init] DOM elements not found: leagueSelect=', !!leagueSelect, 'teamHome=', !!teamHomeSelect, 'teamAway=', !!teamAwaySelect);
        const details = $('details');
        if (details) { details.innerHTML = '<div class="error"><strong>Error:</strong> Problema con la interfaz HTML. Verifica que los elementos select (leagueSelect, teamHome, teamAway) existan.</div>'; }
        return;
    }
    leagueSelect.style.display = 'block';
    leagueSelect.innerHTML = '<option value="">Cargando ligas...</option>';
    const details = $('details');
    if (details) { details.innerHTML = '<div class="info"><strong>Instrucciones:</strong> Selecciona una liga y los equipos local y visitante para obtener el pronóstico.</div>'; }
    await fetchAllData();
    console.log('[init] Leagues received in allData.ligas:', Object.keys(allData.ligas));
    if (!allData.ligas || !Object.keys(allData.ligas).length) {
        console.warn('[init] No leagues available in allData.ligas');
        leagueSelect.innerHTML = '<option value="">No hay ligas disponibles</option>';
        const details = $('details');
        if (details) { details.innerHTML = '<div class="warning"><strong>Advertencia:</strong> No se encontraron ligas disponibles. Verifica la conexión con la API o los datos en la hoja de cálculo.</div>'; }
        return;
    }
    leagueSelect.innerHTML = '<option value="">-- Selecciona liga --</option>';
    const regionsMap = {};
    Object.keys(allData.ligas).forEach(code => {
        const region = leagueRegions[code] || 'Otras Ligas';
        if (!regionsMap[region]) { regionsMap[region] = []; }
        regionsMap[region].push(code);
    });
    const customOrder = ["Europa", "Sudamérica", "Norteamérica", "Centroamérica", "Asia", "Copas Internacionales", "Eliminatorias Mundiales", "Otras Ligas"];
    const sortedRegions = Object.keys(regionsMap).sort((a, b) => {
        const aIndex = customOrder.indexOf(a);
        const bIndex = customOrder.indexOf(b);
        if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
    });
    sortedRegions.forEach(regionName => {
        const optgroup = document.createElement('optgroup');
        optgroup.label = regionName;
        regionsMap[regionName].sort().forEach(code => {
            const opt = document.createElement('option');
            opt.value = code;
            opt.textContent = leagueNames[code] || code;
            optgroup.appendChild(opt);
        });
        if (optgroup.children.length > 0) { leagueSelect.appendChild(optgroup); }
    });
    if (leagueSelect.children.length <= 1) {
        console.warn('[init] No leagues added to select. Check allData.ligas and leagueRegions.');
        leagueSelect.innerHTML = '<option value="">No hay ligas disponibles</option>';
        const details = $('details');
        if (details) { details.innerHTML = '<div class="warning"><strong>Advertencia:</strong> No se encontraron ligas disponibles. Verifica la conexión con la API o los datos en la hoja de cálculo.</div>'; }
    } else {
        leagueSelect.style.display = 'block';
    }
    leagueSelect.addEventListener('change', onLeagueChange);
    teamHomeSelect.addEventListener('change', () => {
        if (restrictSameTeam()) {
            const leagueCode = $('leagueSelect').value;
            const teamHome = $('teamHome').value;
            const teamAway = $('teamAway').value;
            if (leagueCode && teamHome && teamAway) {
                fillTeamData(teamHome, leagueCode, 'Home');
                calculateAll();
            }
        }
    });
    teamAwaySelect.addEventListener('change', () => {
        if (restrictSameTeam()) {
            const leagueCode = $('leagueSelect').value;
            const teamHome = $('teamHome').value;
            const teamAway = $('teamAway').value;
            if (leagueCode && teamHome && teamAway) {
                fillTeamData(teamAway, leagueCode, 'Away');
                calculateAll();
            }
        }
    });
    const resetButton = $('reset');
    if (resetButton) { resetButton.addEventListener('click', clearAll); } else { console.warn('[init] Reset button not found'); }
    displaySelectedLeagueEvents('');
}

document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('keydown', e => {
    if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
        e.preventDefault();
        alert('Las herramientas de desarrollo están deshabilitadas.');
    }
});
document.addEventListener('DOMContentLoaded', init);
