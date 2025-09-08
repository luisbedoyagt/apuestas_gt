// UTILIDADES
const $ = id => {
    const element = document.getElementById(id);
    if (!element) console.error(`[Utilidades] Elemento con ID ${id} no encontrado en el DOM`);
    return element;
};
const formatPct = x => (100 * (isFinite(x) ? x : 0)).toFixed(1) + '%';
const formatDec = x => (isFinite(x) ? x.toFixed(2) : '0.00');
const parseNumberString = val => {
    const s = String(val || '').replace(/,/g, '.');
    const n = Number(s);
    return isFinite(n) ? n : 0;
};

// Normalización de nombres
function normalizeName(name) {
    if (!name) return '';
    return name
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ');
}

// Funciones auxiliares para Poisson y Dixon-Coles
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

// CONFIGURACIÓN DE LIGAS
const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbxMxspSR-2vpzbRjft59hAERHL-07gK3xFH9W_uew_ORcMdZGpWuPrav3q7MpkovDt2/exec";
let teamsByLeague = {};
let allData = {};
let eventInterval;
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
    "mex.2": "Liga de Expansión MX",
    "usa.1": "MLS Estados Unidos",
    "bra.1": "Brasileirão Brasil",
    "gua.1": "Liga Nacional Guatemala",
    "crc.1": "Liga Promerica Costa Rica",
    "hon.1": "Honduras LigaNacional",
    "slv.1": "El Salvador Liga Primera División",
    "ksa.1": "Pro League Arabia Saudita",
    "tur.1": "Super Lig de Turquía",
    "ger.2": "Bundesliga 2 de Alemania",
    "arg.1": "Liga Profesional de Fútbol de Argentina",
    "conmebol.sudamericana": "CONMEBOL Sudamericana",
    "conmebol.libertadores": "CONMEBOL Libertadores",
    "chn.1": "Superliga China",
    "fifa.worldq.conmebol": "Eliminatorias CONMEBOL",
    "fifa.worldq.concacaf": "Eliminatorias CONCACAF",
    "fifa.worldq.uefa": "Eliminatorias UEFA"
};
const leagueCodeToName = {
    "esp.1": "España_LaLiga",
    "esp.2": "España_Segunda",
    "eng.1": "Inglaterra_PremierLeague",
    "eng.2": "Inglaterra_Championship",
    "ita.1": "Italia_SerieA",
    "ger.1": "Alemania_Bundesliga",
    "fra.1": "Francia_Ligue1",
    "ned.1": "PaísesBajos_Eredivisie",
    "ned.2": "PaísesBajos_EersteDivisie",
    "por.1": "Portugal_LigaPortugal",
    "mex.1": "México_LigaMX",
    "mex.2": "México_ExpansionMX",
    "usa.1": "EstadosUnidos_MLS",
    "bra.1": "Brasil_Brasileirao",
    "gua.1": "Guatemala_LigaNacional",
    "crc.1": "CostaRica_LigaPromerica",
    "hon.1": "Honduras_LigaNacional",
    "slv.1": "ElSalvador_LigaPrimeraDivision",
    "ksa.1": "Arabia_Saudi_ProLeague",
    "tur.1": "Turquia_SuperLig",
    "ger.2": "Alemania_Bundesliga2",
    "arg.1": "Argentina_LigaProfesional",
    "conmebol.sudamericana": "CONMEBOL_Sudamericana",
    "conmebol.libertadores": "CONMEBOL_Libertadores",
    "chn.1": "China_Superliga",
    "fifa.worldq.conmebol": "Eliminatorias_CONMEBOL",
    "fifa.worldq.concacaf": "Eliminatorias_CONCACAF",
    "fifa.worldq.uefa": "Eliminatorias_UEFA"
};
const leagueRegions = {
    "esp.1": "Europa",
    "esp.2": "Europa",
    "eng.1": "Europa",
    "eng.2": "Europa",
    "ita.1": "Europa",
    "ger.1": "Europa",
    "fra.1": "Europa",
    "ned.1": "Europa",
    "ned.2": "Europa",
    "por.1": "Europa",
    "tur.1": "Europa",
    "ger.2": "Europa",
    "arg.1": "Sudamérica",
    "bra.1": "Sudamérica",
    "mex.1": "Norteamérica",
    "mex.2": "Norteamérica",
    "usa.1": "Norteamérica",
    "gua.1": "Centroamérica",
    "crc.1": "Centroamérica",
    "hon.1": "Centroamérica",
    "slv.1": "Centroamérica",
    "ksa.1": "Asia",
    "chn.1": "Asia",
    "conmebol.sudamericana": "Copas Internacionales",
    "conmebol.libertadores": "Copas Internacionales",
    "fifa.worldq.conmebol": "Eliminatorias Mundiales",
    "fifa.worldq.concacaf": "Eliminatorias Mundiales",
    "fifa.worldq.uefa": "Eliminatorias Mundiales"
};

// NORMALIZACIÓN DE DATOS
function normalizeTeam(raw) {
    if (!raw) return null;
    const r = {};
    r.name = (raw.name || '').trim();
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
    r.tiesHome = parseNumberString(raw.tiesHome || 0);
    r.tiesAway = parseNumberString(raw.tiesAway || 0);
    r.lossesHome = parseNumberString(raw.lossesHome || 0);
    r.lossesAway = parseNumberString(raw.lossesAway || 0);
    r.logoUrl = raw.logoUrl || '';
    return r;
}

// PARSEO DE PRONÓSTICO DE TEXTO PLANO (RESPALDO)
function parsePlainText(text, matchData) {
    console.log(`[parsePlainText] Procesando texto para ${matchData.local} vs ${matchData.visitante}`);
    const aiProbs = { home: null, draw: null, away: null };
    const aiJustification = {
        home: "Sin justificación detallada.",
        draw: "Sin justificación detallada.",
        away: "Sin justificación detallada."
    };

    // Extraer probabilidades
    const probsMatch = text.match(/Probabilidades:\s*([\s\S]*?)(?:Ambos Anotan|$)/i);
    if (probsMatch && probsMatch[1]) {
        const probsText = probsMatch[1];
        const percentages = probsText.match(/(\d+\.?\d*)%/g) || [];
        if (percentages.length >= 3) {
            aiProbs.home = parseFloat(percentages[0]) / 100;
            aiProbs.draw = parseFloat(percentages[1]) / 100;
            aiProbs.away = parseFloat(percentages[2]) / 100;
            const total = aiProbs.home + aiProbs.draw + aiProbs.away;
            if (total < 0.9 || total > 1.1 || (aiProbs.home === 0 && aiProbs.draw === 0 && aiProbs.away === 0)) {
                console.warn(`[parsePlainText] Probabilidades de IA inválidas (suma=${total.toFixed(2)}): Local=${aiProbs.home}, Empate=${aiProbs.draw}, Visitante=${aiProbs.away}`);
                aiProbs.home = null;
                aiProbs.draw = null;
                aiProbs.away = null;
            } else {
                console.log(`[parsePlainText] Probabilidades extraídas: Local=${aiProbs.home}, Empate=${aiProbs.draw}, Visitante=${aiProbs.away}`);
            }
        } else {
            console.warn(`[parsePlainText] No se encontraron suficientes probabilidades en el texto: ${probsText}`);
        }
    } else {
        console.warn(`[parsePlainText] No se encontró la sección de probabilidades en el texto: ${text}`);
    }

    // Extraer análisis del partido con expresiones regulares más robustas
    const analysisMatch = text.match(/Análisis del Partido:([\s\S]*?)Probabilidades:/i);
    if (analysisMatch && analysisMatch[1]) {
        const analysisText = analysisMatch[1].trim();
        console.log(`[parsePlainText] Texto de análisis encontrado: ${analysisText}`);

        // Normalizar nombres de equipos para coincidencias robustas
        const normalizedLocal = normalizeName(matchData.local);
        const normalizedVisitante = normalizeName(matchData.visitante);

        // Extraer justificaciones con expresiones más flexibles
        const localJustification = analysisText.match(new RegExp(`${matchData.local}\\s*:([\\s\\S]*?)(?=(?:Empate\\s*:|${matchData.visitante}\\s*:|$))`, 'i'));
        const drawJustification = analysisText.match(/Empate\s*:([\s\S]*?)(?=(?:(?:[^:]+:)|$))/i);
        const awayJustification = analysisText.match(new RegExp(`${matchData.visitante}\\s*:([\\s\\S]*?)(?=(?:Probabilidades:|$))`, 'i'));

        if (localJustification && localJustification[1].trim()) {
            aiJustification.home = localJustification[1].trim();
            console.log(`[parsePlainText] Justificación Local: ${aiJustification.home}`);
        } else {
            console.warn(`[parsePlainText] No se encontró justificación para ${matchData.local}`);
        }

        if (drawJustification && drawJustification[1].trim()) {
            aiJustification.draw = drawJustification[1].trim();
            console.log(`[parsePlainText] Justificación Empate: ${aiJustification.draw}`);
        } else {
            console.warn(`[parsePlainText] No se encontró justificación para Empate`);
        }

        if (awayJustification && awayJustification[1].trim()) {
            aiJustification.away = awayJustification[1].trim();
            console.log(`[parsePlainText] Justificación Visitante: ${aiJustification.away}`);
        } else {
            console.warn(`[parsePlainText] No se encontró justificación para ${matchData.visitante}`);
        }
    } else {
        console.warn(`[parsePlainText] No se encontró la sección de análisis en el texto: ${text}`);
    }

    // Extraer BTTS y Over 2.5
    const bttsProb = text.match(/BTTS.*Sí\s*:\s*(\d+\.?\d*)%/i)?.[1];
    const o25Prob = text.match(/Más de 2\.5\s*:\s*(\d+\.?\d*)%/i)?.[1];

    const result = {
        "1X2": {
            victoria_local: {
                probabilidad: aiProbs.home != null ? (aiProbs.home * 100).toFixed(0) + '%' : '0%',
                justificacion: aiJustification.home
            },
            empate: {
                probabilidad: aiProbs.draw != null ? (aiProbs.draw * 100).toFixed(0) + '%' : '0%',
                justificacion: aiJustification.draw
            },
            victoria_visitante: {
                probabilidad: aiProbs.away != null ? (aiProbs.away * 100).toFixed(0) + '%' : '0%',
                justificacion: aiJustification.away
            }
        },
        "BTTS": {
            si: {
                probabilidad: bttsProb && parseFloat(bttsProb) > 0 ? bttsProb + '%' : '0%',
                justificacion: ""
            },
            no: {
                probabilidad: bttsProb && parseFloat(bttsProb) > 0 ? (100 - parseFloat(bttsProb)).toFixed(0) + '%' : '0%',
                justificacion: ""
            }
        },
        "Goles": {
            mas_2_5: {
                probabilidad: o25Prob && parseFloat(o25Prob) > 0 ? o25Prob + '%' : '0%',
                justificacion: ""
            },
            menos_2_5: {
                probabilidad: o25Prob && parseFloat(o25Prob) > 0 ? (100 - parseFloat(o25Prob)).toFixed(0) + '%' : '0%',
                justificacion: ""
            }
        }
    };
    console.log(`[parsePlainText] Resultado final:`, JSON.stringify(result, null, 2));
    return result;
}

// FETCH DATOS COMPLETOS
async function fetchAllData() {
    const leagueSelect = $('leagueSelect');
    if (leagueSelect) {
        leagueSelect.innerHTML = '<option value="">Cargando datos...</option>';
        leagueSelect.style.display = 'block';
    }
    try {
        console.log('[fetchAllData] Solicitando datos desde:', WEBAPP_URL);
        const res = await fetch(`${WEBAPP_URL}?tipo=todo&update=false`);
        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Error HTTP ${res.status}: ${res.statusText}. Respuesta: ${errorText}`);
        }
        allData = await res.json();
        console.log('[fetchAllData] Datos recibidos:', allData);
        if (!allData || !allData.calendario || !allData.ligas) {
            throw new Error('Estructura de datos inválida: la respuesta está vacía o faltan "calendario" o "ligas".');
        }
        if (!Object.keys(allData.ligas).length) {
            console.warn('[fetchAllData] allData.ligas está vacío');
            throw new Error('No se encontraron ligas en los datos de la API.');
        }
        const normalized = {};
        for (const key in allData.ligas) {
            normalized[key] = (allData.ligas[key] || []).map(normalizeTeam).filter(t => t && t.name);
            console.log(`[fetchAllData] Liga ${key} normalizada con ${normalized[key].length} equipos`, normalized[key]);
        }
        teamsByLeague = normalized;
        localStorage.setItem('allData', JSON.stringify(allData));
        console.log('[fetchAllData] Datos almacenados en localStorage');
        displayLeagues();
        startEventUpdate();
    } catch (error) {
        console.error('[fetchAllData] Error al cargar datos:', error);
        if (leagueSelect) {
            leagueSelect.innerHTML = '<option value="">Error al cargar ligas</option>';
        }
        showError('Error al cargar los datos de ligas. Por favor, intenta de nuevo más tarde.');
    }
}

// MOSTRAR LIGAS EN EL SELECTOR
function displayLeagues() {
    const leagueSelect = $('leagueSelect');
    if (!leagueSelect) return;
    leagueSelect.innerHTML = '<option value="">Selecciona una liga</option>';

    const groupedLeagues = {};
    for (const code in leagueNames) {
        const region = leagueRegions[code] || 'Otros';
        if (!groupedLeagues[region]) groupedLeagues[region] = [];
        groupedLeagues[region].push({ code, name: leagueNames[code] });
    }

    for (const region in groupedLeagues) {
        const optgroup = document.createElement('optgroup');
        optgroup.label = region;
        groupedLeagues[region].sort((a, b) => a.name.localeCompare(b.name)).forEach(league => {
            const option = document.createElement('option');
            option.value = league.code;
            option.textContent = league.name;
            optgroup.appendChild(option);
        });
        leagueSelect.appendChild(optgroup);
    }
    console.log('[displayLeagues] Ligas mostradas en el selector:', Object.keys(leagueNames));
}

// MOSTRAR EVENTOS DE LA LIGA SELECCIONADA
function displaySelectedLeagueEvents(leagueCode) {
    const eventList = $('selected-league-events');
    const transitionMessage = $('transition-message');
    if (!eventList || !transitionMessage) return;

    // Mostrar mensaje de transición
    transitionMessage.style.display = 'block';
    transitionMessage.querySelector('.loading-text').textContent = 'Cargando eventos...';
    eventList.innerHTML = '';

    const events = (allData.calendario || []).filter(event => event.league === leagueCode);
    console.log(`[displaySelectedLeagueEvents] Eventos para la liga ${leagueCode}:`, events);

    setTimeout(() => {
        transitionMessage.style.display = 'none';
        if (!events.length) {
            eventList.innerHTML = '<div class="event-item placeholder"><span>No hay eventos próximos para esta liga.</span></div>';
            return;
        }

        const template = document.getElementById('event-item-template');
        events.forEach(event => {
            const eventItem = template.content.cloneNode(true).querySelector('.event-item');
            eventItem.dataset.event = JSON.stringify(event);
            eventItem.querySelector('[data-home-team]').textContent = event.local || 'Local';
            eventItem.querySelector('[data-away-team]').textContent = event.visitante || 'Visitante';
            const homeLogo = eventItem.querySelector('.home-logo');
            const awayLogo = eventItem.querySelector('.away-logo');
            if (event.localLogo) {
                homeLogo.src = event.localLogo;
                homeLogo.classList.remove('hidden');
            }
            if (event.visitanteLogo) {
                awayLogo.src = event.visitanteLogo;
                awayLogo.classList.remove('hidden');
            }
            eventItem.querySelector('[data-datetime]').textContent = event.datetime || 'Fecha no disponible';
            eventItem.querySelector('[data-stadium]').textContent = event.stadium || 'Estadio no disponible';
            eventItem.addEventListener('click', () => selectEvent(event));
            eventList.appendChild(eventItem);
        });
    }, 500);
}

// SELECCIONAR UN EVENTO
function selectEvent(event) {
    console.log('[selectEvent] Evento seleccionado:', event);
    const teamHomeSelect = $('teamHome');
    const teamAwaySelect = $('teamAway');
    if (!teamHomeSelect || !teamAwaySelect) return;

    teamHomeSelect.value = event.local;
    teamAwaySelect.value = event.visitante;
    teamHomeSelect.dispatchEvent(new Event('change'));
    teamAwaySelect.dispatchEvent(new Event('change'));

    const selectedEvent = document.querySelector('.event-item.selected');
    if (selectedEvent) selectedEvent.classList.remove('selected');
    const eventItems = document.querySelectorAll('.event-item');
    eventItems.forEach(item => {
        if (JSON.stringify(JSON.parse(item.dataset.event)) === JSON.stringify(event)) {
            item.classList.add('selected');
        }
    });
}

// LIMPIAR DATOS DE EQUIPOS
function clearTeamData() {
    const fields = {
        home: ['posHome', 'gfHome', 'gaHome', 'winRateHome'],
        away: ['posAway', 'gfAway', 'gaAway', 'winRateAway']
    };
    for (const side in fields) {
        fields[side].forEach(field => {
            const element = $(field);
            if (element) element.textContent = '--';
        });
        const formBox = $(`form${side.charAt(0).toUpperCase() + side.slice(1)}Box`);
        if (formBox) {
            const stats = formBox.querySelectorAll('[data-stat]');
            stats.forEach(stat => {
                stat.textContent = `${stat.dataset.stat.toUpperCase()}: 0`;
            });
        }
    }
    const integratedPrediction = $('integrated-prediction');
    if (integratedPrediction) {
        integratedPrediction.innerHTML = '<p>Esperando análisis integrado...</p>';
    }
}

// RELLENAR DATOS DE EQUIPO
function fillTeamData(teamName, side, leagueCode) {
    console.log(`[fillTeamData] Rellenando datos para ${teamName} (${side}) en liga ${leagueCode}`);
    const teams = teamsByLeague[leagueCode] || [];
    const team = teams.find(t => t.name === teamName);
    if (!team) {
        console.warn(`[fillTeamData] Equipo ${teamName} no encontrado en liga ${leagueCode}`);
        return;
    }

    const prefix = side === 'home' ? 'Home' : 'Away';
    $(`pos${prefix}`).textContent = team.pos || '--';
    $(`gf${prefix}`).textContent = team.gf || '--';
    $(`ga${prefix}`).textContent = team.ga || '--';
    const winRate = team.pj > 0 ? (team.g / team.pj) : 0;
    $(`winRate${prefix}`).textContent = formatPct(winRate);

    const formBox = $(`form${prefix}Box`);
    if (formBox) {
        const stats = {
            pj: team.pj,
            points: team.points,
            dg: team.gf - team.ga,
            pjHome: team.pjHome,
            winsHome: team.winsHome,
            dgHome: team.gfHome - team.gaHome,
            pjAway: team.pjAway,
            winsAway: team.winsAway,
            dgAway: team.gfAway - team.gaAway
        };
        for (const [key, value] of Object.entries(stats)) {
            const statElement = formBox.querySelector(`[data-stat="${key}"]`);
            if (statElement) {
                statElement.textContent = `${key.toUpperCase()}: ${value}`;
            }
        }
    }
}

// OBTENER PRONÓSTICO INTEGRADO
async function getIntegratedPrediction(localTeam, awayTeam, leagueCode) {
    console.log(`[getIntegratedPrediction] Generando pronóstico para ${localTeam} vs ${awayTeam} en liga ${leagueCode}`);
    const integratedPrediction = $('integrated-prediction');
    const suggestionBox = $('suggestion');
    if (!integratedPrediction || !suggestionBox) return;

    integratedPrediction.innerHTML = '<p>Generando pronóstico...</p>';
    suggestionBox.innerHTML = '<p>Esperando datos...</p>';

    const teams = teamsByLeague[leagueCode] || [];
    const homeTeam = teams.find(t => t.name === localTeam);
    const awayTeam = teams.find(t => t.name === awayTeam);

    if (!homeTeam || !awayTeam) {
        console.warn(`[getIntegratedPrediction] Equipo no encontrado: Local=${localTeam}, Visitante=${awayTeam}`);
        integratedPrediction.innerHTML = '<p class="error">Error: Uno o ambos equipos no encontrados.</p>';
        return;
    }

    // Cálculos estadísticos
    const homeGoalsAvg = homeTeam.pjHome > 0 ? homeTeam.gfHome / homeTeam.pjHome : 0;
    const awayGoalsAvg = awayTeam.pjAway > 0 ? awayTeam.gfAway / awayTeam.pjAway : 0;
    const homeDefenseAvg = homeTeam.pjHome > 0 ? homeTeam.gaHome / homeTeam.pjHome : 0;
    const awayDefenseAvg = awayTeam.pjAway > 0 ? awayTeam.gaAway / awayTeam.pjAway : 0;

    const expectedHomeGoals = (homeGoalsAvg + awayDefenseAvg) / 2;
    const expectedAwayGoals = (awayGoalsAvg + homeDefenseAvg) / 2;

    let pHome = 0, pDraw = 0, pAway = 0, pBTTS = 0, pO25 = 0;
    for (let i = 0; i <= 5; i++) {
        for (let j = 0; j <= 5; j++) {
            const prob = poissonProbability(expectedHomeGoals, i) * poissonProbability(expectedAwayGoals, j);
            if (i > j) pHome += prob;
            else if (i === j) pDraw += prob;
            else pAway += prob;
            if (i > 0 && j > 0) pBTTS += prob;
            if (i + j > 2.5) pO25 += prob;
        }
    }

    const total = pHome + pDraw + pAway;
    if (total > 0) {
        pHome /= total;
        pDraw /= total;
        pAway /= total;
    }

    // Actualizar probabilidades en la interfaz
    $('pHome').innerHTML = `${formatPct(pHome)} <small>(Stats)</small>`;
    $('pDraw').innerHTML = `${formatPct(pDraw)} <small>(Stats)</small>`;
    $('pAway').innerHTML = `${formatPct(pAway)} <small>(Stats)</small>`;
    $('pBTTS').innerHTML = `${formatPct(pBTTS)} <small>(Stats)</small>`;
    $('pO25').innerHTML = `${formatPct(pO25)} <small>(Stats)</small>`;

    // Obtener predicción de IA
    const matchData = {
        local: localTeam,
        visitante: awayTeam,
        liga: leagueCodeToName[leagueCode] || leagueCode
    };
    let aiPrediction;
    try {
        const res = await fetch(`${WEBAPP_URL}?tipo=pronostico&local=${encodeURIComponent(localTeam)}&visitante=${encodeURIComponent(awayTeam)}&liga=${encodeURIComponent(matchData.liga)}`);
        if (!res.ok) throw new Error(`Error HTTP ${res.status}`);
        aiPrediction = await res.json();
        console.log('[getIntegratedPrediction] Predicción de IA:', aiPrediction);
        if (!aiPrediction['1X2']) {
            console.warn('[getIntegratedPrediction] Predicción de IA inválida, intentando parsear texto plano');
            aiPrediction = parsePlainText(aiPrediction.text || aiPrediction.toString(), matchData);
        }
    } catch (error) {
        console.error('[getIntegratedPrediction] Error al obtener predicción de IA:', error);
        aiPrediction = parsePlainText('', matchData);
    }

    // Combinar predicciones
    const finalProbs = {
        home: aiPrediction['1X2'].victoria_local.probabilidad.replace('%', '') / 100 || pHome,
        draw: aiPrediction['1X2'].empate.probabilidad.replace('%', '') / 100 || pDraw,
        away: aiPrediction['1X2'].victoria_visitante.probabilidad.replace('%', '') / 100 || pAway,
        btts: aiPrediction.BTTS.si.probabilidad.replace('%', '') / 100 || pBTTS,
        o25: aiPrediction.Goles.mas_2_5.probabilidad.replace('%', '') / 100 || pO25
    };

    const totalFinal = finalProbs.home + finalProbs.draw + finalProbs.away;
    if (totalFinal > 0) {
        finalProbs.home /= totalFinal;
        finalProbs.draw /= totalFinal;
        finalProbs.away /= totalFinal;
    }

    // Actualizar probabilidades combinadas
    $('pHome').innerHTML = `${formatPct(finalProbs.home)} <small>(Stats/IA)</small>`;
    $('pDraw').innerHTML = `${formatPct(finalProbs.draw)} <small>(Stats/IA)</small>`;
    $('pAway').innerHTML = `${formatPct(finalProbs.away)} <small>(Stats/IA)</small>`;
    $('pBTTS').innerHTML = `${formatPct(finalProbs.btts)} <small>(IA/Stats)</small>`;
    $('pO25').innerHTML = `${formatPct(finalProbs.o25)} <small>(IA/Stats)</small>`;

    // Generar recomendaciones
    const recommendations = [
        { bet: `Victoria ${localTeam}`, prob: finalProbs.home, justification: aiPrediction['1X2'].victoria_local.justificacion },
        { bet: 'Empate', prob: finalProbs.draw, justification: aiPrediction['1X2'].empate.justificacion },
        { bet: `Victoria ${awayTeam}`, prob: finalProbs.away, justification: aiPrediction['1X2'].victoria_visitante.justificacion },
        { bet: 'Ambos Anotan (Sí)', prob: finalProbs.btts, justification: aiPrediction.BTTS.si.justificacion || 'Basado en estadísticas de goles.' },
        { bet: 'Más de 2.5 Goles', prob: finalProbs.o25, justification: aiPrediction.Goles.mas_2_5.justificacion || 'Basado en promedio de goles.' }
    ].sort((a, b) => b.prob - a.prob).slice(0, 3);

    // Actualizar sugerencias
    const suggestionTemplate = document.getElementById('rec-suggestion-template');
    const suggestionNode = suggestionTemplate.content.cloneNode(true);
    const recList = suggestionNode.querySelector('#rec-list');
    const recItemTemplate = document.getElementById('rec-item-template');

    recommendations.forEach((rec, index) => {
        const recItem = recItemTemplate.content.cloneNode(true).querySelector('.rec-item');
        recItem.querySelector('.rec-rank').textContent = `${index + 1}.`;
        recItem.querySelector('.rec-bet').textContent = rec.bet;
        recItem.querySelector('.rec-prob').textContent = formatPct(rec.prob);
        recList.appendChild(recItem);
    });
    suggestionBox.innerHTML = '';
    suggestionBox.appendChild(suggestionNode);

    // Actualizar análisis
    const analysisTemplate = document.getElementById('analysis-template');
    const analysisNode = analysisTemplate.content.cloneNode(true);
    const analysisList = analysisNode.querySelector('#analysis-list');
    analysisList.querySelector('[data-home-justification]').textContent = `${localTeam}: ${aiPrediction['1X2'].victoria_local.justificacion}`;
    analysisList.querySelector('[data-draw-justification]').textContent = `Empate: ${aiPrediction['1X2'].empate.justificacion}`;
    analysisList.querySelector('[data-away-justification]').textContent = `${awayTeam}: ${aiPrediction['1X2'].victoria_visitante.justificacion}`;
    analysisNode.querySelector('[data-btts]').textContent = formatPct(finalProbs.btts);
    analysisNode.querySelector('[data-o25]').textContent = formatPct(finalProbs.o25);

    const verdict = recommendations[0].bet;
    analysisNode.querySelector('[data-verdict]').textContent = verdict;
    integratedPrediction.innerHTML = '';
    integratedPrediction.appendChild(analysisNode);

    // Manejo de truncamiento para móviles
    const recItems = integratedPrediction.querySelectorAll('.rec-item');
    recItems.forEach(item => {
        const recBet = item.querySelector('.rec-bet');
        if (!recBet) return;
        const lineHeight = parseFloat(getComputedStyle(recBet).lineHeight);
        const maxHeight = parseFloat(getComputedStyle(recBet).maxHeight);
        const maxLines = Math.floor(maxHeight / lineHeight);
        const lines = recBet.scrollHeight / lineHeight;

        if (lines > maxLines) {
            recBet.classList.add('truncated');
            const button = document.createElement('button');
            button.textContent = 'Leer más';
            button.addEventListener('click', () => {
                if (recBet.classList.contains('truncated')) {
                    recBet.classList.remove('truncated');
                    recBet.classList.add('expanded');
                    button.textContent = 'Leer menos';
                } else {
                    recBet.classList.remove('expanded');
                    recBet.classList.add('truncated');
                    button.textContent = 'Leer más';
                }
            });
            recBet.appendChild(button);
        }
    });
}

// INICIALIZAR SELECCIÓN DE EQUIPOS
function setupTeamSelects(leagueCode) {
    const teamHomeSelect = $('teamHome');
    const teamAwaySelect = $('teamAway');
    if (!teamHomeSelect || !teamAwaySelect) return;

    teamHomeSelect.innerHTML = '<option value="">Selecciona equipo local</option>';
    teamAwaySelect.innerHTML = '<option value="">Selecciona equipo visitante</option>';

    const teams = teamsByLeague[leagueCode] || [];
    teams.sort((a, b) => a.name.localeCompare(b.name)).forEach(team => {
        const optionHome = document.createElement('option');
        const optionAway = document.createElement('option');
        optionHome.value = optionAway.value = team.name;
        optionHome.textContent = optionAway.textContent = team.name;
        teamHomeSelect.appendChild(optionHome);
        teamAwaySelect.appendChild(optionAway);
    });

    teamHomeSelect.onchange = () => {
        clearTeamData();
        if (teamHomeSelect.value && teamAwaySelect.value) {
            getIntegratedPrediction(teamHomeSelect.value, teamAwaySelect.value, leagueCode);
        }
        fillTeamData(teamHomeSelect.value, 'home', leagueCode);
    };
    teamAwaySelect.onchange = () => {
        clearTeamData();
        if (teamHomeSelect.value && teamAwaySelect.value) {
            getIntegratedPrediction(teamHomeSelect.value, teamAwaySelect.value, leagueCode);
        }
        fillTeamData(teamAwaySelect.value, 'away', leagueCode);
    };
}

// ACTUALIZAR EVENTOS CADA 5 MINUTOS
function startEventUpdate() {
    if (eventInterval) clearInterval(eventInterval);
    eventInterval = setInterval(() => {
        const leagueSelect = $('leagueSelect');
        if (leagueSelect && leagueSelect.value) {
            console.log('[startEventUpdate] Actualizando eventos para la liga:', leagueSelect.value);
            displaySelectedLeagueEvents(leagueSelect.value);
        }
    }, 5 * 60 * 1000);
}

// MOSTRAR MENSAJE DE ERROR
function showError(message) {
    const integratedPrediction = $('integrated-prediction');
    if (integratedPrediction) {
        integratedPrediction.innerHTML = `<p class="error">${message}</p>`;
    }
}

// INICIALIZACIÓN
document.addEventListener('DOMContentLoaded', () => {
    const leagueSelect = $('leagueSelect');
    const resetButton = $('reset');
    if (leagueSelect) {
        leagueSelect.onchange = () => {
            clearTeamData();
            if (leagueSelect.value) {
                displaySelectedLeagueEvents(leagueSelect.value);
                setupTeamSelects(leagueSelect.value);
            } else {
                const eventList = $('selected-league-events');
                if (eventList) {
                    eventList.innerHTML = '<div class="event-item placeholder"><span>Selecciona una liga para ver eventos próximos.</span></div>';
                }
                $('teamHome').innerHTML = '<option value="">Selecciona equipo local</option>';
                $('teamAway').innerHTML = '<option value="">Selecciona equipo visitante</option>';
            }
        };
    }
    if (resetButton) {
        resetButton.onclick = () => {
            if (leagueSelect) leagueSelect.value = '';
            clearTeamData();
            const eventList = $('selected-league-events');
            if (eventList) {
                eventList.innerHTML = '<div class="event-item placeholder"><span>Selecciona una liga para ver eventos próximos.</span></div>';
            }
            $('teamHome').innerHTML = '<option value="">Selecciona equipo local</option>';
            $('teamAway').innerHTML = '<option value="">Selecciona equipo visitante</option>';
        };
    }
    fetchAllData();
});
