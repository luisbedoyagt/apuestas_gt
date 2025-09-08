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
    const aiProbs = { home: 0, draw: 0, away: 0 };
    const aiJustification = {
        home: "Análisis basado en estadísticas recientes del equipo local.",
        draw: "Análisis basado en el equilibrio entre ambos equipos.",
        away: "Análisis basado en estadísticas recientes del equipo visitante."
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
            if (total < 0.5 || total > 1.5) {
                console.warn(`[parsePlainText] Probabilidades de IA inválidas (suma=${total.toFixed(2)}): Normalizando`);
                const scale = total > 0 ? 1 / total : 1;
                aiProbs.home *= scale;
                aiProbs.draw *= scale;
                aiProbs.away *= scale;
            }
            console.log(`[parsePlainText] Probabilidades extraídas: Local=${aiProbs.home}, Empate=${aiProbs.draw}, Visitante=${aiProbs.away}`);
        } else {
            console.warn(`[parsePlainText] No se encontraron suficientes probabilidades en el texto: ${probsText}`);
        }
    } else {
        console.warn(`[parsePlainText] No se encontró la sección de probabilidades en el texto: ${text}`);
    }

    // Extraer análisis del partido
    const analysisMatch = text.match(/Análisis del Partido:([\s\S]*?)(?:Probabilidades:|$)/i);
    if (analysisMatch && analysisMatch[1]) {
        const analysisText = analysisMatch[1].trim();
        console.log(`[parsePlainText] Texto de análisis encontrado: ${analysisText}`);

        const normalizedLocal = normalizeName(matchData.local);
        const normalizedVisitante = normalizeName(matchData.visitante);

        // Extraer justificaciones con expresiones más flexibles
        const localJustification = analysisText.match(new RegExp(`(?:${matchData.local}|${normalizedLocal})\\s*:([\\s\\S]*?)(?=(?:Empate\\s*:|${matchData.visitante}\\s*:|${normalizedVisitante}\\s*:|$))`, 'i'));
        const drawJustification = analysisText.match(/Empate\s*:([\s\S]*?)(?=(?:(?:[^:]+:)|$))/i);
        const awayJustification = analysisText.match(new RegExp(`(?:${matchData.visitante}|${normalizedVisitante})\\s*:([\\s\\S]*?)(?=(?:Probabilidades:|$))`, 'i'));

        if (localJustification && localJustification[1].trim()) {
            aiJustification.home = localJustification[1].trim();
            console.log(`[parsePlainText] Justificación Local: ${aiJustification.home}`);
        } else {
            console.warn(`[parsePlainText] No se encontró justificación para ${matchData.local}, usando respaldo`);
        }

        if (drawJustification && drawJustification[1].trim()) {
            aiJustification.draw = drawJustification[1].trim();
            console.log(`[parsePlainText] Justificación Empate: ${aiJustification.draw}`);
        } else {
            console.warn(`[parsePlainText] No se encontró justificación para Empate, usando respaldo`);
        }

        if (awayJustification && awayJustification[1].trim()) {
            aiJustification.away = awayJustification[1].trim();
            console.log(`[parsePlainText] Justificación Visitante: ${aiJustification.away}`);
        } else {
            console.warn(`[parsePlainText] No se encontró justificación para ${matchData.visitante}, usando respaldo`);
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
                probabilidad: aiProbs.home > 0 ? (aiProbs.home * 100).toFixed(0) + '%' : '0%',
                justificacion: aiJustification.home
            },
            empate: {
                probabilidad: aiProbs.draw > 0 ? (aiProbs.draw * 100).toFixed(0) + '%' : '0%',
                justificacion: aiJustification.draw
            },
            victoria_visitante: {
                probabilidad: aiProbs.away > 0 ? (aiProbs.away * 100).toFixed(0) + '%' : '0%',
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

// MUESTRA DE EVENTOS DE LA LIGA SELECCIONADA
function displaySelectedLeagueEvents(leagueCode) {
    const selectedEventsList = $('selected-league-events');
    if (!selectedEventsList) {
        console.warn('[displaySelectedLeagueEvents] Elemento selected-league-events no encontrado');
        return;
    }
    if (eventInterval) {
        clearInterval(eventInterval);
        eventInterval = null;
    }
    selectedEventsList.innerHTML = '';
    if (!allData.calendario) {
        selectedEventsList.innerHTML = '<div class="event-item placeholder"><span>Selecciona una liga para ver eventos próximos.</span></div>';
        console.log('[displaySelectedLeagueEvents] Sin allData.calendario');
        return;
    }
    let events = [];
    if (!leagueCode) {
        Object.keys(allData.calendario).forEach(ligaName => {
            events = events.concat(allData.calendario[ligaName] || []);
        });
    } else {
        const ligaName = leagueCodeToName[leagueCode];
        events = allData.calendario[ligaName] || [];
    }
    if (events.length === 0) {
        selectedEventsList.innerHTML = '<div class="event-item placeholder"><span>No hay eventos próximos para esta liga.</span></div>';
        console.log(`[displaySelectedLeagueEvents] No hay eventos para ${leagueCode || 'todas las ligas'}`);
        return;
    }
    const eventsPerPage = 1;
    const totalPages = Math.ceil(events.length / eventsPerPage);
    let currentPage = 0;
    function showCurrentPage() {
        const startIndex = currentPage * eventsPerPage;
        const eventsToShow = events.slice(startIndex, startIndex + eventsPerPage);
        const currentItems = selectedEventsList.querySelectorAll('.event-item');
        if (currentItems.length > 0) {
            currentItems.forEach(item => {
                item.classList.remove('slide-in');
                item.classList.add('slide-out');
            });
        }
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
                
                let eventDateTime;
                let isInProgress = false;
                try {
                    const parsedDate = new Date(event.fecha);
                    if (isNaN(parsedDate.getTime())) {
                        throw new Error("Fecha inválida");
                    }
                    const now = new Date();
                    const matchDuration = 120 * 60 * 1000;
                    if (now >= parsedDate && now < new Date(parsedDate.getTime() + matchDuration)) {
                        isInProgress = true;
                    }
                    const dateOptions = { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'America/Guatemala' };
                    const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Guatemala' };
                    const formattedDate = parsedDate.toLocaleDateString('es-ES', dateOptions);
                    const formattedTime = parsedDate.toLocaleTimeString('es-ES', timeOptions);
                    eventDateTime = `${formattedDate} ${formattedTime} (GT)`;
                } catch (err) {
                    console.warn(`[displaySelectedLeagueEvents] Error parseando fecha para el evento: ${event.local} vs. ${event.visitante}`, err);
                    eventDateTime = `${event.fecha} (Hora no disponible)`;
                }
                let statusText = isInProgress ? ' - Evento en Juego' : '';
                div.innerHTML = `
                    <div class="event-content">
                        <div class="team-logo-container">
                            <span class="team-name">${event.local.trim()}</span>
                            <img src="${homeLogo}" class="team-logo home-logo ${!homeLogo ? 'hidden' : ''}" alt="Logo de ${event.local.trim()}">
                            <span class="vs">vs.</span>
                            <img src="${awayLogo}" class="team-logo away-logo ${!awayLogo ? 'hidden' : ''}" alt="Logo de ${event.visitante.trim()}">
                            <span class="team-name">${event.visitante.trim()}</span>
                        </div>
                        <span class="event-details">${eventDateTime}${statusText}</span>
                        <span class="event-details">Estadio: ${event.estadio || 'Por confirmar'}</span>
                    </div>
                `;
                if (isInProgress) {
                    div.classList.add('in-progress');
                    div.style.cursor = 'not-allowed';
                    div.title = 'Evento en curso, no seleccionable';
                } else {
                    div.addEventListener('click', () => {
                        selectEvent(event.local.trim(), event.visitante.trim());
                    });
                }
                selectedEventsList.appendChild(div);
            });
            currentPage = (currentPage + 1) % totalPages;
        }, 800);
    }
    showCurrentPage();
    if (totalPages > 1) {
        eventInterval = setInterval(showCurrentPage, 10000);
    }
}

// INICIALIZACIÓN
async function init() {
    console.log('[init] Iniciando aplicación a las', new Date().toLocaleString('es-ES', { timeZone: 'America/Guatemala' }));
    clearAll();
    const leagueSelect = $('leagueSelect');
    const teamHomeSelect = $('teamHome');
    const teamAwaySelect = $('teamAway');
    if (!leagueSelect || !teamHomeSelect || !teamAwaySelect) {
        console.error('[init] Elementos DOM no encontrados: leagueSelect=', !!leagueSelect, 'teamHome=', !!teamHomeSelect, 'teamAway=', !!teamAwaySelect);
        const details = $('details');
        if (details) {
            details.innerHTML = '<div class="error"><strong>Error:</strong> Problema con la interfaz HTML. Verifica que los elementos select (leagueSelect, teamHome, teamAway) existan.</div>';
        }
        return;
    }
    leagueSelect.style.display = 'block';
    leagueSelect.innerHTML = '<option value="">Cargando ligas...</option>';
    const details = $('details');
    if (details) {
        details.innerHTML = '<div class="info"><strong>Instrucciones:</strong> Selecciona una liga y los equipos local y visitante para obtener el pronóstico.</div>';
    }
    await fetchAllData();
    console.log('[init] Ligas recibidas en allData.ligas:', Object.keys(allData.ligas));
    if (!allData.ligas || !Object.keys(allData.ligas).length) {
        console.warn('[init] No hay ligas disponibles en allData.ligas');
        leagueSelect.innerHTML = '<option value="">No hay ligas disponibles</option>';
        const details = $('details');
        if (details) {
            details.innerHTML = '<div class="warning"><strong>Advertencia:</strong> No se encontraron ligas disponibles. Verifica la conexión con la API o los datos en la hoja de cálculo.</div>';
        }
        return;
    }
    leagueSelect.innerHTML = '<option value="">-- Selecciona liga --</option>';
    const regionsMap = {};
    Object.keys(allData.ligas).forEach(code => {
        const region = leagueRegions[code] || 'Otras Ligas';
        if (!regionsMap[region]) {
            regionsMap[region] = [];
        }
        regionsMap[region].push(code);
        console.log(`[init] Asignando liga ${code} a la región ${region}`);
    });
    console.log('[init] Regiones mapeadas:', regionsMap);
    
    const customOrder = ["Europa", "Sudamérica", "Norteamérica", "Centroamérica", "Asia", "Copas Internacionales", "Eliminatorias Mundiales", "Otras Ligas"];
    const sortedRegions = Object.keys(regionsMap).sort((a, b) => {
        const aIndex = customOrder.indexOf(a);
        const bIndex = customOrder.indexOf(b);
        if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
    });
    console.log('[init] Regiones ordenadas:', sortedRegions);
    sortedRegions.forEach(regionName => {
        const optgroup = document.createElement('optgroup');
        optgroup.label = regionName;
        regionsMap[regionName].sort().forEach(code => {
            const opt = document.createElement('option');
            opt.value = code;
            opt.textContent = leagueNames[code] || code;
            optgroup.appendChild(opt);
            console.log(`[init] Añadiendo liga ${code} (${leagueNames[code] || code}) al optgroup ${regionName}`);
        });
        if (optgroup.children.length > 0) {
            leagueSelect.appendChild(optgroup);
            console.log(`[init] Optgroup ${regionName} añadido con ${optgroup.children.length} ligas`);
        } else {
            console.log(`[init] Optgroup ${regionName} vacío, no se añade`);
        }
    });
    if (leagueSelect.children.length <= 1) {
        console.warn('[init] No se añadieron ligas al select. Verifica allData.ligas y leagueRegions.');
        leagueSelect.innerHTML = '<option value="">No hay ligas disponibles</option>';
        const details = $('details');
        if (details) {
            details.innerHTML = '<div class="warning"><strong>Advertencia:</strong> No se encontraron ligas disponibles. Verifica la conexión con la API o los datos en la hoja de cálculo.</div>';
        }
    } else {
        console.log(`[init] Select llenado con ${leagueSelect.children.length} elementos (incluyendo opción por defecto)`);
        leagueSelect.style.display = 'block';
    }
    leagueSelect.addEventListener('change', onLeagueChange);
    teamHomeSelect.addEventListener('change', () => {
        if (restrictSameTeam()) {
            const leagueCode = $('leagueSelect').value;
            const teamHome = $('teamHome').value;
            const teamAway = $('teamAway').value;
            console.log('[teamHome change] Valores:', { leagueCode, teamHome, teamAway });
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
            console.log('[teamAway change] Valores:', { leagueCode, teamHome, teamAway });
            if (leagueCode && teamHome && teamAway) {
                fillTeamData(teamAway, leagueCode, 'Away');
                calculateAll();
            }
        }
    });
    const resetButton = $('reset');
    if (resetButton) {
        resetButton.addEventListener('click', clearAll);
    } else {
        console.warn('[init] Botón reset no encontrado');
    }
    displaySelectedLeagueEvents('');
}

// FUNCIONES AUXILIARES DE UI
function onLeagueChange() {
    const code = $('leagueSelect').value;
    console.log('[onLeagueChange] Liga seleccionada:', code);
    const teamHomeSelect = $('teamHome');
    const teamAwaySelect = $('teamAway');
    teamHomeSelect.disabled = !code;
    teamAwaySelect.disabled = !code;
    if (!teamHomeSelect || !teamAwaySelect) {
        console.error('[onLeagueChange] Elementos teamHome o teamAway no encontrados');
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
        console.log('[onLeagueChange] Sin datos para la liga:', code);
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
    console.log(`[selectEvent] Seleccionando evento: ${homeTeamName} vs ${awayTeamName}`);
    const teamHomeSelect = $('teamHome');
    const teamAwaySelect = $('teamAway');
    const leagueSelect = $('leagueSelect');
    
    if (!teamHomeSelect || !teamAwaySelect || !leagueSelect) {
        console.error('[selectEvent] Elementos DOM no encontrados: teamHomeSelect=', !!teamHomeSelect, 'teamAwaySelect=', !!teamAwaySelect, 'leagueSelect=', !!leagueSelect);
        const details = $('details');
        if (details) {
            details.innerHTML = '<div class="error"><strong>Error:</strong> Problema con la interfaz HTML. Verifica los elementos select.</div>';
        }
        return;
    }

    let eventLeagueCode = '';
    const ligaName = Object.keys(allData.calendario).find(liga =>
        (allData.calendario[liga] || []).some(e =>
            normalizeName(e.local) === normalizeName(homeTeamName) &&
            normalizeName(e.visitante) === normalizeName(awayTeamName)
        )
    );
    if (ligaName) {
        eventLeagueCode = Object.keys(leagueCodeToName).find(key => leagueCodeToName[key] === ligaName) || '';
        console.log(`[selectEvent] Liga encontrada: ${ligaName} (code: ${eventLeagueCode})`);
    } else {
        console.error('[selectEvent] No se pudo encontrar la liga para el evento:', { homeTeamName, awayTeamName });
        const details = $('details');
        if (details) {
            details.innerHTML = `<div class="error"><strong>Error:</strong> No se pudo encontrar la liga del evento ${homeTeamName} vs ${awayTeamName}.</div>`;
        }
        return;
    }

    if (eventLeagueCode) {
        leagueSelect.value = eventLeagueCode;
        const changeEvent = new Event('change');
        leagueSelect.dispatchEvent(changeEvent);
    } else {
        console.error('[selectEvent] Código de liga no encontrado para el evento.');
        const details = $('details');
        if (details) {
            details.innerHTML = `<div class="error"><strong>Error:</strong> No se pudo encontrar el código de la liga para el evento.</div>`;
        }
        return;
    }

    const waitForTeams = async () => {
        let attempts = 0;
        const maxAttempts = 10;
        while (teamHomeSelect.options.length <= 1 && teamAwaySelect.options.length <= 1 && attempts < maxAttempts) {
            console.log(`[selectEvent] Esperando a que los selectores de equipos se llenen... (intento ${attempts + 1})`);
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        if (attempts >= maxAttempts) {
            console.error('[selectEvent] Tiempo de espera agotado para llenar los selectores de equipos.');
            const details = $('details');
            if (details) {
                details.innerHTML = `<div class="error"><strong>Error:</strong> No se pudieron cargar los equipos para la liga seleccionada.</div>`;
            }
            return false;
        }
        return true;
    };

    waitForTeams().then(success => {
        if (!success) return;

        const homeTeamNameNormalized = normalizeName(homeTeamName);
        const awayTeamNameNormalized = normalizeName(awayTeamName);

        const homeOption = Array.from(teamHomeSelect.options).find(opt => normalizeName(opt.text) === homeTeamNameNormalized);
        const awayOption = Array.from(teamAwaySelect.options).find(opt => normalizeName(opt.text) === awayTeamNameNormalized);

        if (!homeOption) {
            console.error('[selectEvent] Equipo local no encontrado en el selector:', homeTeamName, { normalized: homeTeamNameNormalized });
        }
        if (!awayOption) {
            console.error('[selectEvent] Equipo visitante no encontrado en el selector:', awayTeamName, { normalized: awayTeamNameNormalized });
        }

        if (homeOption && awayOption) {
            teamHomeSelect.value = homeOption.value;
            teamAwaySelect.value = awayOption.value;
            console.log('[selectEvent] Equipos seleccionados:', { home: teamHomeSelect.value, away: teamAwaySelect.value });

            if (restrictSameTeam()) {
                fillTeamData(homeTeamName, eventLeagueCode, 'Home');
                fillTeamData(awayTeamName, eventLeagueCode, 'Away');
                calculateAll();
            } else {
                console.error('[selectEvent] Fallo en restrictSameTeam');
                const details = $('details');
                if (details) {
                    details.innerHTML = `<div class="error"><strong>Error:</strong> No se pueden seleccionar los mismos equipos para local y visitante.</div>`;
                }
            }
        } else {
            const details = $('details');
            if (details) {
                details.innerHTML = `<div class="error"><strong>Error:</strong> No se pudo encontrar uno o ambos equipos (${homeTeamName} vs ${awayTeamName}) en la lista de la liga.</div>`;
            }
        }
    });
}

function restrictSameTeam() {
    const teamHome = $('teamHome').value;
    const teamAway = $('teamAway').value;
    if (teamHome && teamAway && normalizeName(teamHome) === normalizeName(teamAway)) {
        const details = $('details');
        if (details) {
            details.innerHTML = '<div class="error"><strong>Error:</strong> No puedes seleccionar el mismo equipo para local y visitante.</div>';
            setTimeout(() => {
                details.innerHTML = '<div class="info"><strong>Instrucciones:</strong> Selecciona una liga y los equipos local y visitante para obtener el pronóstico.</div>';
            }, 5000);
        }
        if (document.activeElement === $('teamHome')) {
            $('teamHome').value = '';
            clearTeamData('Home');
        } else {
            $('teamAway').value = '';
            clearTeamData('Away');
        }
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
        box.innerHTML = `
        <div class="team-details">
            <div class="stat-section">
                <span class="section-title">General</span>
                <div class="stat-metrics">
                    <span>PJ: 0</span>
                    <span>Puntos: 0</span>
                    <span>DG: 0</span>
                </div>
            </div>
            <div class="stat-section">
                <span class="section-title">Local</span>
                <div class="stat-metrics">
                    <span>PJ: 0</span>
                    <span>PG: 0</span>
                    <span>DG: 0</span>
                </div>
            </div>
            <div class="stat-section">
                <span class="section-title">Visitante</span>
                <div class="stat-metrics">
                    <span>PJ: 0</span>
                    <span>PG: 0</span>
                    <span>DG: 0</span>
                </div>
            </div>
        </div>
        `;
    }
    const cardHeader = $(`card-${typeLower}`)?.querySelector('.card-header');
    const h3 = cardHeader ? cardHeader.querySelector('h3') : null;
    const logoImg = h3 ? cardHeader.querySelector('.team-logo') : null;
    if (logoImg) {
        logoImg.remove();
    }
}

function clearAll() {
    document.querySelectorAll('.stat-value').forEach(el => el.textContent = '--');
    document.querySelectorAll('select').forEach(s => s.selectedIndex = 0);
    ['pHome', 'pDraw', 'pAway', 'pBTTS', 'pO25'].forEach(id => {
        const el = $(id);
        if (el) el.textContent = '--';
    });
    const details = $('details');
    if (details) {
        details.innerHTML = '<div class="info"><strong>Instrucciones:</strong> Selecciona una liga y los equipos local y visitante para obtener el pronóstico.</div>';
    }
    const suggestion = $('suggestion');
    if (suggestion) {
        suggestion.innerHTML = '<p>Esperando datos...</p>';
    }
    const integratedPrediction = $('integrated-prediction');
    if (integratedPrediction) {
        integratedPrediction.innerHTML = '<p>Esperando análisis integrado...</p>';
    }
    clearTeamData('Home');
    clearTeamData('Away');
    displaySelectedLeagueEvents('');
}

// BÚSQUEDA Y LLENADO DE EQUIPO
function findTeam(leagueCode, teamName) {
    if (leagueCode) {
        if (!teamsByLeague[leagueCode]) return null;
        return teamsByLeague[leagueCode].find(t => normalizeName(t.name) === normalizeName(teamName)) || null;
    } else {
        if (!teamsByLeague) return null;
        for (const code in teamsByLeague) {
            const team = teamsByLeague[code].find(t => normalizeName(t.name) === normalizeName(teamName));
            if (team) return team;
        }
        return null;
    }
}

function fillTeamData(teamName, leagueCode, type) {
    const t = findTeam(leagueCode, teamName);
    const typeLower = type.toLowerCase();
    if (!t) {
        console.error(`[fillTeamData] Equipo no encontrado: ${teamName} en liga ${leagueCode}`);
        const details = $('details');
        if (details) {
            details.innerHTML = `<div class="error"><strong>Error:</strong> Equipo ${teamName} no encontrado en la liga seleccionada.</div>`;
        }
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
        box.innerHTML = `
        <div class="team-details">
            <div class="stat-section">
                <span class="section-title">General</span>
                <div class="stat-metrics">
                    <span>PJ: ${t.pj || 0}</span>
                    <span>Puntos: ${t.points || 0}</span>
                    <span>DG: ${dg >= 0 ? '+' + dg : dg || 0}</span>
                </div>
            </div>
            <div class="stat-section">
                <span class="section-title">Local</span>
                <div class="stat-metrics">
                    <span>PJ: ${t.pjHome || 0}</span>
                    <span>PG: ${t.winsHome || 0}</span>
                    <span>DG: ${dgHome >= 0 ? '+' + dgHome : dgHome || 0}</span>
                </div>
            </div>
            <div class="stat-section">
                <span class="section-title">Visitante</span>
                <div class="stat-metrics">
                    <span>PJ: ${t.pjAway || 0}</span>
                    <span>PG: ${t.winsAway || 0}</span>
                    <span>DG: ${dgAway >= 0 ? '+' + dgAway : dgAway || 0}</span>
                </div>
            </div>
        </div>
        `;
    }
    const cardHeader = $(`card-${typeLower}`)?.querySelector('.card-header');
    if (cardHeader) {
        let logoImg = cardHeader.querySelector('.team-logo');
        if (!logoImg) {
            logoImg = document.createElement('img');
            logoImg.className = 'team-logo';
            logoImg.alt = `Logo de ${t.name}`;
            const h3 = cardHeader.querySelector('h3');
            if (h3) {
                h3.insertAdjacentElement('beforebegin', logoImg);
            }
        }
        logoImg.src = t.logoUrl || '';
        logoImg.style.display = t.logoUrl ? 'inline-block' : 'none';
    }
}



// CÁLCULO DE PROBABILIDADES CON DIXON-COLES Y SHRINKAGE MEJORADO
function dixonColesProbabilities(tH, tA, league) {
    console.log(`[dixonColesProbabilities] Calculando para ${tH.name} vs ${tA.name} en liga ${league}`);
    
    // Validar datos de entrada
    if (!tH || !tA || !teamsByLeague[league]) {
        console.error('[dixonColesProbabilities] Datos inválidos:', { tH, tA, league });
        return { finalHome: 0.333, finalDraw: 0.333, finalAway: 0.333, pBTTSH: 0.5, pO25H: 0.5 };
    }

    // Validar que los equipos tengan datos suficientes
    if (!tH.pjHome || tH.pjHome < 1 || !tA.pjAway || tA.pjAway < 1) {
        console.warn(`[dixonColesProbabilities] Datos insuficientes: pjHome=${tH.pjHome}, pjAway=${tA.pjAway}, usando valores por defecto`);
        return { finalHome: 0.333, finalDraw: 0.333, finalAway: 0.333, pBTTSH: 0.5, pO25H: 0.5 };
    }

    // Calcular rho dinámicamente basado en la proporción de empates en la liga
    let rho = -0.1;
    const ligaName = leagueCodeToName[league];
    if (allData.calendario && allData.calendario[ligaName]) {
        const matches = allData.calendario[ligaName];
        let totalMatches = 0;
        let totalDraws = 0;
        matches.forEach(match => {
            if (match.resultado && match.resultado.includes('-')) {
                const [homeGoals, awayGoals] = match.resultado.split('-').map(Number);
                if (!isNaN(homeGoals) && !isNaN(awayGoals)) {
                    totalMatches++;
                    if (homeGoals === awayGoals) totalDraws++;
                }
            }
        });
        const drawRate = totalMatches > 0 ? totalDraws / totalMatches : 0.25;
        const expectedDrawRate = 0.25; // Promedio típico de empates en fútbol
        rho = -0.1 * (drawRate / expectedDrawRate);
        rho = Math.max(-0.2, Math.min(-0.05, rho)); // Limitar rho entre -0.2 y -0.05
        console.log(`[dixonColesProbabilities] Rho calculado: ${rho.toFixed(3)} (drawRate=${drawRate.toFixed(3)}, totalMatches=${totalMatches})`);
    }

    // Calcular promedios de la liga
    const teams = teamsByLeague[league];
    let totalGames = 0, totalGfHome = 0, totalGaHome = 0, totalGfAway = 0, totalGaAway = 0;
    teams.forEach(t => {
        if (t.pjHome >= 3 && t.pjAway >= 3) { // Solo contar equipos con suficientes partidos
            totalGames += (t.pjHome || 0) + (t.pjAway || 0);
            totalGfHome += t.gfHome || 0;
            totalGaHome += t.gaHome || 0;
            totalGfAway += t.gfAway || 0;
            totalGaAway += t.gaAway || 0;
        }
    });
    totalGames = Math.max(totalGames, 1); // Evitar división por cero
    const leagueAvgGfHome = totalGfHome / (totalGames / 2) || 1.5; // Respaldo si no hay datos
    const leagueAvgGaHome = totalGaHome / (totalGames / 2) || 1.5;
    const leagueAvgGfAway = totalGfAway / (totalGames / 2) || 1.5;
    const leagueAvgGaAway = totalGaAway / (totalGames / 2) || 1.5;
    console.log(`[dixonColesProbabilities] Promedios de liga: GfHome=${leagueAvgGfHome.toFixed(2)}, GaHome=${leagueAvgGaHome.toFixed(2)}, GfAway=${leagueAvgGfAway.toFixed(2)}, GaAway=${leagueAvgGaAway.toFixed(2)}`);

    // Calcular factor de shrinkage dinámico
    const minGames = 3;
    const shrinkageBase = 0.8;
    const shrinkageHome = tH.pjHome < minGames ? 0.5 : shrinkageBase * (1 - Math.exp(-tH.pjHome / 10));
    const shrinkageAway = tA.pjAway < minGames ? 0.5 : shrinkageBase * (1 - Math.exp(-tA.pjAway / 10));
    console.log(`[dixonColesProbabilities] Shrinkage: Home=${shrinkageHome.toFixed(2)}, Away=${shrinkageAway.toFixed(2)}`);

    // Calcular métricas de ataque y defensa
    const homeAttackRaw = tH.pjHome >= minGames ? (tH.gfHome / tH.pjHome) : leagueAvgGfHome;
    const homeDefenseRaw = tH.pjHome >= minGames ? (tH.gaHome / tH.pjHome) : leagueAvgGaHome;
    const awayAttackRaw = tA.pjAway >= minGames ? (tA.gfAway / tA.pjAway) : leagueAvgGfAway;
    const awayDefenseRaw = tA.pjAway >= minGames ? (tA.gaAway / tA.pjAway) : leagueAvgGaAway;
    console.log(`[dixonColesProbabilities] Métricas crudas: homeAttack=${homeAttackRaw.toFixed(2)}, homeDefense=${homeDefenseRaw.toFixed(2)}, awayAttack=${awayAttackRaw.toFixed(2)}, awayDefense=${awayDefenseRaw.toFixed(2)}`);

    const homeAttack = leagueAvgGfHome > 0 ? (homeAttackRaw / leagueAvgGfHome) * shrinkageHome + (1 - shrinkageHome) : 1;
    const homeDefense = leagueAvgGaHome > 0 ? (homeDefenseRaw / leagueAvgGaHome) * shrinkageHome + (1 - shrinkageHome) : 1;
    const awayAttack = leagueAvgGfAway > 0 ? (awayAttackRaw / leagueAvgGfAway) * shrinkageAway + (1 - shrinkageAway) : 1;
    const awayDefense = leagueAvgGaAway > 0 ? (awayDefenseRaw / leagueAvgGaAway) * shrinkageAway + (1 - shrinkageAway) : 1;
    console.log(`[dixonColesProbabilities] Métricas ajustadas: homeAttack=${homeAttack.toFixed(2)}, homeDefense=${homeDefense.toFixed(2)}, awayAttack=${awayAttack.toFixed(2)}, awayDefense=${awayDefense.toFixed(2)}`);

    // Calcular goles esperados
    const expectedHomeGoals = Math.max(0, homeAttack * awayDefense * leagueAvgGfHome);
    const expectedAwayGoals = Math.max(0, awayAttack * homeDefense * leagueAvgGaHome);
    console.log(`[dixonColesProbabilities] Goles esperados: Home=${expectedHomeGoals.toFixed(2)}, Away=${expectedAwayGoals.toFixed(2)}`);

    // Validar goles esperados
    if (expectedHomeGoals === 0 || expectedAwayGoals === 0) {
        console.warn('[dixonColesProbabilities] Goles esperados inválidos, usando valores por defecto');
        return { finalHome: 0.333, finalDraw: 0.333, finalAway: 0.333, pBTTSH: 0.5, pO25H: 0.5 };
    }

    // Calcular probabilidades iniciales con Poisson
    let homeWin = 0, draw = 0, awayWin = 0;
    const maxGoals = 10;
    for (let i = 0; i <= maxGoals; i++) {
        for (let j = 0; j <= maxGoals; j++) {
            const prob = poissonProbability(expectedHomeGoals, i) * poissonProbability(expectedAwayGoals, j);
            if (i > j) homeWin += prob;
            else if (i === j) draw += prob;
            else awayWin += prob;
        }
    }

    // Ajustar empate con tau
    const tau = (scoreH, scoreA) => {
        if (scoreH === 0 && scoreA === 0) return 1 - (expectedHomeGoals * expectedAwayGoals * rho);
        if (scoreH === 0 && scoreA === 1) return 1 + (expectedHomeGoals * rho);
        if (scoreH === 1 && scoreA === 0) return 1 + (expectedAwayGoals * rho);
        if (scoreH === 1 && scoreA === 1) return 1 - rho;
        return 1;
    };
    let adjustedDraw = 0;
    for (let i = 0; i <= maxGoals; i++) {
        const prob = poissonProbability(expectedHomeGoals, i) * poissonProbability(expectedAwayGoals, i) * tau(i, i);
        adjustedDraw += prob;
    }

    // Normalizar probabilidades
    const total = homeWin + draw + awayWin;
    if (total <= 0) {
        console.warn('[dixonColesProbabilities] Suma de probabilidades iniciales inválida, usando valores por defecto');
        return { finalHome: 0.333, finalDraw: 0.333, finalAway: 0.333, pBTTSH: 0.5, pO25H: 0.5 };
    }
    const scale = 1 / total;
    homeWin *= scale;
    draw *= scale;
    awayWin *= scale;

    const adjustedTotal = homeWin + adjustedDraw + awayWin;
    let finalHome = homeWin;
    let finalDraw = adjustedDraw;
    let finalAway = awayWin;
    if (adjustedTotal > 0) {
        const scale = 1 / adjustedTotal;
        finalHome *= scale;
        finalDraw *= scale;
        finalAway *= scale;
    }
    console.log(`[dixonColesProbabilities] Probabilidades iniciales: Home=${homeWin.toFixed(3)}, Draw=${draw.toFixed(3)}, Away=${awayWin.toFixed(3)}`);
    console.log(`[dixonColesProbabilities] Probabilidades ajustadas: Home=${finalHome.toFixed(3)}, Draw=${finalDraw.toFixed(3)}, Away=${finalAway.toFixed(3)}`);

    // Calcular BTTS con ajuste de rho
    let pBTTSH = 0;
    for (let i = 1; i <= maxGoals; i++) {
        for (let j = 1; j <= maxGoals; j++) {
            pBTTSH += poissonProbability(expectedHomeGoals, i) * poissonProbability(expectedAwayGoals, j) * tau(i, j);
        }
    }

    // Calcular Over 2.5 con ajuste de rho
    let pO25H = 0;
    for (let i = 0; i <= maxGoals; i++) {
        for (let j = 0; j <= maxGoals; j++) {
            if (i + j > 2) {
                pO25H += poissonProbability(expectedHomeGoals, i) * poissonProbability(expectedAwayGoals, j) * tau(i, j);
            }
        }
    }

    // Normalizar BTTS y Over 2.5
    pBTTSH = Math.min(1, Math.max(0, pBTTSH));
    pO25H = Math.min(1, Math.max(0, pO25H));
    console.log(`[dixonColesProbabilities] Probabilidades adicionales: BTTS=${pBTTSH.toFixed(3)}, Over2.5=${pO25H.toFixed(3)}`);

    return {
        finalHome,
        finalDraw,
        finalAway,
        pBTTSH,
        pO25H
    };
}

// ... (El resto del código hasta getIntegratedPrediction permanece igual)

// FUNCIÓN INTEGRADA: Fusión lógica de Stats + IA
function getIntegratedPrediction(stats, event, matchData) {
    const ai = event.pronostico_json || parsePlainText(event.pronostico || '', matchData);
    const hasAIProbs = ai && ai["1X2"] && Object.values(ai["1X2"]).some(p => p?.probabilidad && parseFloat(p.probabilidad) > 0);
    const hasAIJustifications = ai && ai["1X2"] && Object.values(ai["1X2"]).some(p => p?.justificacion && p.justificacion !== "Sin justificación detallada.");

    console.log(`[getIntegratedPrediction] Estado de datos de IA: hasAIProbs=${hasAIProbs}, hasAIJustifications=${hasAIJustifications}`);
    console.log(`[getIntegratedPrediction] Probabilidades estadísticas: Home=${stats.finalHome.toFixed(3)}, Draw=${stats.finalDraw.toFixed(3)}, Away=${stats.finalAway.toFixed(3)}`);

    // Validar probabilidades estadísticas
    const statsValid = stats.finalHome > 0 && stats.finalDraw > 0 && stats.finalAway > 0 && 
                      Math.abs(stats.finalHome + stats.finalDraw + stats.finalAway - 1) < 0.1;
    if (!statsValid) {
        console.warn('[getIntegratedPrediction] Probabilidades estadísticas inválidas, usando valores por defecto');
        stats.finalHome = 0.333;
        stats.finalDraw = 0.333;
        stats.finalAway = 0.333;
        stats.pBTTSH = 0.5;
        stats.pO25H = 0.5;
    }

    // Normalizar probabilidades de IA si están presentes
    let aiProbs = {
        home: parseFloat(ai["1X2"]?.victoria_local?.probabilidad) / 100 || stats.finalHome,
        draw: parseFloat(ai["1X2"]?.empate?.probabilidad) / 100 || stats.finalDraw,
        away: parseFloat(ai["1X2"]?.victoria_visitante?.probabilidad) / 100 || stats.finalAway
    };
    let totalAiProbs = aiProbs.home + aiProbs.draw + aiProbs.away;
    if (hasAIProbs && (totalAiProbs < 0.5 || totalAiProbs > 1.5)) {
        console.warn(`[getIntegratedPrediction] Suma de probabilidades IA inválida (${totalAiProbs.toFixed(2)}), normalizando`);
        const scale = totalAiProbs > 0 ? 1 / totalAiProbs : 1;
        aiProbs.home *= scale;
        aiProbs.draw *= scale;
        aiProbs.away *= scale;
        totalAiProbs = aiProbs.home + aiProbs.draw + aiProbs.away;
    }

    // Usar estadísticas como respaldo si no hay datos de IA válidos
    if (!hasAIProbs) {
        console.warn(`[getIntegratedPrediction] Usando solo estadísticas debido a falta de probabilidades de IA válidas`);
        return {
            header: "Análisis Estadístico",
            probabilities: [
                { id: 'pHome', value: stats.finalHome, label: `Victoria ${matchData.local}` },
                { id: 'pDraw', value: stats.finalDraw, label: 'Empate' },
                { id: 'pAway', value: stats.finalAway, label: `Victoria ${matchData.visitante}` },
                { id: 'pBTTS', value: stats.pBTTSH, label: 'Ambos Anotan' },
                { id: 'pO25', value: stats.pO25H, label: 'Más de 2.5 Goles' }
            ],
            recsHtml: `
                <div class="rec-suggestion">
                    <h4>Top Recomendaciones (Estadísticas)</h4>
                    <ul>
                        <li class="rec-item"><span class="rec-rank">1</span><span class="rec-bet">Victoria ${matchData.local}</span><span class="rec-prob">${formatPct(stats.finalHome)}</span></li>
                        <li class="rec-item"><span class="rec-rank">2</span><span class="rec-bet">Empate</span><span class="rec-prob">${formatPct(stats.finalDraw)}</span></li>
                        <li class="rec-item"><span class="rec-rank">3</span><span class="rec-bet">Victoria ${matchData.visitante}</span><span class="rec-prob">${formatPct(stats.finalAway)}</span></li>
                    </ul>
                </div>
            `,
            analysisHtml: `
                <div class="rec-suggestion">
                    <h4>Análisis Estadístico</h4>
                    <p>No se encontraron datos de IA completos. Recomendaciones basadas en estadísticas:</p>
                    <ul>
                        <li class="rec-item"><span class="rec-bet">Victoria ${matchData.local}: ${formatPct(stats.finalHome)}</span></li>
                        <li class="rec-item"><span class="rec-bet">Empate: ${formatPct(stats.finalDraw)}</span></li>
                        <li class="rec-item"><span class="rec-bet">Victoria ${matchData.visitante}: ${formatPct(stats.finalAway)}</span></li>
                    </ul>
                    <h4>Otras Apuestas</h4>
                    <ul>
                        <li class="rec-item"><span class="rec-bet">Ambos Anotan (Sí)</span><span class="rec-prob">${formatPct(stats.pBTTSH)}</span></li>
                        <li class="rec-item"><span class="rec-bet">Más de 2.5 Goles</span><span class="rec-prob">${formatPct(stats.pO25H)}</span></li>
                    </ul>
                    <h4>Apuesta Recomendada</h4>
                    <div class="rec-item verdict-item"><span class="rec-bet">Apuesta por la opción con mayor probabilidad (${formatPct(Math.max(stats.finalHome, stats.finalDraw, stats.finalAway))}) si supera el 50%.</span></div>
                </div>
            `,
            verdict: `Apuesta por la opción con mayor probabilidad si supera el 50%.`
        };
    }

    const statProbs = { home: stats.finalHome, draw: stats.finalDraw, away: stats.finalAway };
    const weightStats = hasAIJustifications ? 0.4 : 0.6; // Reducir peso de estadísticas si hay justificaciones de IA
    const weightIA = hasAIJustifications ? 0.6 : 0.4; // Aumentar peso de IA si hay justificaciones
    const integratedProbs = {
        home: (statProbs.home * weightStats + aiProbs.home * weightIA),
        draw: (statProbs.draw * weightStats + aiProbs.draw * weightIA),
        away: (statProbs.away * weightStats + aiProbs.away * weightIA)
    };

    // Normalizar integratedProbs
    const totalIntegrated = integratedProbs.home + integratedProbs.draw + integratedProbs.away;
    if (totalIntegrated > 0) {
        const scale = 1 / totalIntegrated;
        integratedProbs.home *= scale;
        integratedProbs.draw *= scale;
        integratedProbs.away *= scale;
    } else {
        console.warn('[getIntegratedPrediction] Suma de probabilidades integradas inválida, usando valores por defecto');
        integratedProbs.home = 0.333;
        integratedProbs.draw = 0.333;
        integratedProbs.away = 0.333;
    }

    const statMaxKey = Object.keys(statProbs).reduce((a, b) => statProbs[a] > statProbs[b] ? a : b);
    const aiMaxKey = Object.keys(aiProbs).reduce((a, b) => aiProbs[a] > aiProbs[b] ? a : b);
    const integratedMaxKey = Object.keys(integratedProbs).reduce((a, b) => integratedProbs[a] > integratedProbs[b] ? a : b);
    const diff = Math.abs(statProbs[statMaxKey] - aiProbs[aiMaxKey]);
    let header = '';
    let verdictText = '';
    if (statMaxKey === aiMaxKey && diff < 0.15) {
        header = `Recomendación Segura: ${integratedMaxKey === 'home' ? `Victoria ${matchData.local}` : integratedMaxKey === 'draw' ? 'Empate' : `Victoria ${matchData.visitante}`} (${formatPct(integratedProbs[integratedMaxKey])})`;
        verdictText = `Ambos análisis coinciden: la mejor apuesta es ${integratedMaxKey === 'home' ? `Victoria ${matchData.local}` : integratedMaxKey === 'draw' ? 'Empate' : `Victoria ${matchData.visitante}`} con un ${formatPct(integratedProbs[integratedMaxKey])}. Apuesta si la cuota es menor a ${(1 / integratedProbs[integratedMaxKey]).toFixed(1)}.`;
    } else {
        header = `Apuesta Recomendada: ${integratedMaxKey === 'home' ? `Victoria ${matchData.local}` : integratedMaxKey === 'draw' ? 'Empate' : `Victoria ${matchData.visitante}`} (${formatPct(integratedProbs[integratedMaxKey])})`;
        verdictText = `Las estadísticas (${formatPct(statProbs[statMaxKey])}) y la IA (${formatPct(aiProbs[aiMaxKey])}) difieren ligeramente. La mejor apuesta es ${integratedMaxKey === 'home' ? `Victoria ${matchData.local}` : integratedMaxKey === 'draw' ? 'Empate' : `Victoria ${matchData.visitante}`} con un ${formatPct(integratedProbs[integratedMaxKey])}. Revisa las cuotas y elige si supera el 55%.`;
    }

    const bttsValue = ai.BTTS?.si?.probabilidad && parseFloat(ai.BTTS.si.probabilidad) > 0 ? parseFloat(ai.BTTS.si.probabilidad) / 100 : stats.pBTTSH;
    const o25Value = ai.Goles?.mas_2_5?.probabilidad && parseFloat(ai.Goles.mas_2_5.probabilidad) > 0 ? parseFloat(ai.Goles.mas_2_5.probabilidad) / 100 : stats.pO25H;
    const probabilities = [
        { id: 'pHome', value: integratedProbs.home, label: `Victoria ${matchData.local}`, stats: statProbs.home, ia: aiProbs.home },
        { id: 'pDraw', value: integratedProbs.draw, label: 'Empate', stats: statProbs.draw, ia: aiProbs.draw },
        { id: 'pAway', value: integratedProbs.away, label: `Victoria ${matchData.visitante}`, stats: statProbs.away, ia: aiProbs.away },
        { id: 'pBTTS', value: bttsValue, label: 'Ambos Anotan', stats: stats.pBTTSH, ia: ai.BTTS?.si?.probabilidad ? parseFloat(ai.BTTS.si.probabilidad) / 100 : null },
        { id: 'pO25', value: o25Value, label: 'Más de 2.5 Goles', stats: stats.pO25H, ia: ai.Goles?.mas_2_5?.probabilidad ? parseFloat(ai.Goles.mas_2_5.probabilidad) / 100 : null }
    ];

    const recs = Object.entries(integratedProbs)
        .filter(([key, val]) => val >= 0.3)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([key, val], i) => {
            const just = key === 'home' ? `${matchData.local}: Basado en buen ataque local y análisis de IA.`
                : key === 'draw' ? `Empate: Equipos con fuerzas similares según estadísticas e IA.`
                : `${matchData.visitante}: Basado en sólida defensa visitante y análisis de IA.`;
            return `<li class="rec-item"><span class="rec-rank">${i+1}</span><span class="rec-bet">${key === 'home' ? `Victoria ${matchData.local}` : key === 'draw' ? 'Empate' : `Victoria ${matchData.visitante}`} (${formatPct(val)})</span><span class="rec-prob">${just}</span></li>`;
        }).join('');

    const recsHtml = `<div class="rec-suggestion"><h4>Top Recomendaciones</h4><ul>${recs || '<li><span>No hay recomendaciones con probabilidad mayor al 30%</span></li>'}</ul></div>`;

    // Usar justificaciones de IA si están disponibles, con respaldo
    const homeJust = truncateText(ai["1X2"]?.victoria_local?.justificacion || `Análisis basado en estadísticas recientes de ${matchData.local}.`, 15);
    const drawJust = truncateText(ai["1X2"]?.empate?.justificacion || "Análisis basado en el equilibrio entre ambos equipos.", 15);
    const awayJust = truncateText(ai["1X2"]?.victoria_visitante?.justificacion || `Análisis basado en estadísticas recientes de ${matchData.visitante}.`, 15);
    console.log(`[getIntegratedPrediction] Justificaciones:`, {
        home: homeJust.fullText,
        draw: drawJust.fullText,
        away: awayJust.fullText
    });

    const analysisHtml = `
        <div class="rec-suggestion">
            <h4>Análisis del Partido</h4>
            <ul>
                <li class="rec-item"><span class="rec-bet ${homeJust.needsButton ? 'truncated' : ''}" data-full-text="${escapeHtml(`<strong>${matchData.local}:</strong> ${homeJust.fullText}`)}" data-original-content="${escapeHtml(`<strong>${matchData.local}:</strong> ${homeJust.text}${homeJust.needsButton ? ' <button>Leer más</button>' : ''}`)}"><strong>${matchData.local}:</strong> ${homeJust.text}${homeJust.needsButton ? ' <button>Leer más</button>' : ''}</span></li>
                <li class="rec-item"><span class="rec-bet ${drawJust.needsButton ? 'truncated' : ''}" data-full-text="${escapeHtml(`<strong>Empate:</strong> ${drawJust.fullText}`)}" data-original-content="${escapeHtml(`<strong>Empate:</strong> ${drawJust.text}${drawJust.needsButton ? ' <button>Leer más</button>' : ''}`)}"><strong>Empate:</strong> ${drawJust.text}${drawJust.needsButton ? ' <button>Leer más</button>' : ''}</span></li>
                <li class="rec-item"><span class="rec-bet ${awayJust.needsButton ? 'truncated' : ''}" data-full-text="${escapeHtml(`<strong>${matchData.visitante}:</strong> ${awayJust.fullText}`)}" data-original-content="${escapeHtml(`<strong>${matchData.visitante}:</strong> ${awayJust.text}${awayJust.needsButton ? ' <button>Leer más</button>' : ''}`)}"><strong>${matchData.visitante}:</strong> ${awayJust.text}${awayJust.needsButton ? ' <button>Leer más</button>' : ''}</span></li>
            </ul>
            <h4>Otras Apuestas</h4>
            <ul>
                <li class="rec-item"><span class="rec-bet">Ambos Anotan (Sí)</span><span class="rec-prob">${formatPct(bttsValue)}</span></li>
                <li class="rec-item"><span class="rec-bet">Más de 2.5 Goles</span><span class="rec-prob">${formatPct(o25Value)}</span></li>
            </ul>
            <h4>Apuesta Recomendada</h4>
            <div class="rec-item verdict-item"><span class="rec-bet">${verdictText}</span></div>
        </div>
    `;

    return {
        header,
        probabilities,
        recsHtml,
        analysisHtml,
        verdict: verdictText
    };
}


// CÁLCULO DE TODAS LAS PREDICCIONES
async function calculateAll() {
    const leagueCode = $('leagueSelect').value;
    const teamHome = $('teamHome').value;
    const teamAway = $('teamAway').value;
    console.log('[calculateAll] Iniciando cálculo:', { leagueCode, teamHome, teamAway });

    if (!leagueCode || !teamHome || !teamAway) {
        console.warn('[calculateAll] Faltan datos: leagueCode=', leagueCode, 'teamHome=', teamHome, 'teamAway=', teamAway);
        const details = $('details');
        if (details) {
            details.innerHTML = '<div class="error"><strong>Error:</strong> Selecciona una liga y ambos equipos para calcular el pronóstico.</div>';
        }
        return;
    }

    const tH = findTeam(leagueCode, teamHome);
    const tA = findTeam(leagueCode, teamAway);
    if (!tH || !tA) {
        console.error('[calculateAll] Equipo(s) no encontrado(s):', { tH, tA });
        const details = $('details');
        if (details) {
            details.innerHTML = `<div class="error"><strong>Error:</strong> No se encontraron datos para ${!tH ? teamHome : ''} ${!tA ? teamAway : ''}.</div>`;
        }
        return;
    }

    const stats = dixonColesProbabilities(tH, tA, leagueCode);
    console.log('[calculateAll] Probabilidades estadísticas:', stats);

    const matchData = {
        local: teamHome,
        visitante: teamAway
    };

    let event = null;
    const ligaName = leagueCodeToName[leagueCode];
    if (allData.calendario && allData.calendario[ligaName]) {
        event = allData.calendario[ligaName].find(e =>
            normalizeName(e.local) === normalizeName(teamHome) &&
            normalizeName(e.visitante) === normalizeName(teamAway)
        );
        console.log('[calculateAll] Evento encontrado:', event);
    }

    const integrated = getIntegratedPrediction(stats, event || {}, matchData);

    ['pHome', 'pDraw', 'pAway', 'pBTTS', 'pO25'].forEach(id => {
        const el = $(id);
        if (el) {
            const prob = integrated.probabilities.find(p => p.id === id);
            el.textContent = prob ? formatPct(prob.value) : '--';
        }
    });

    const suggestion = $('suggestion');
    if (suggestion) {
        suggestion.innerHTML = integrated.recsHtml;
    }

    const integratedPrediction = $('integrated-prediction');
    if (integratedPrediction) {
        integratedPrediction.innerHTML = `
            <h3>${integrated.header}</h3>
            ${integrated.analysisHtml}
        `;
        integratedPrediction.querySelectorAll('.rec-bet.truncated button').forEach(button => {
            button.addEventListener('click', toggleText);
        });
    }

    const details = $('details');
    if (details) {
        details.innerHTML = `<div class="success"><strong>Veredicto:</strong> ${integrated.verdict}</div>`;
    }
}

// INICIAR LA APLICACIÓN
document.addEventListener('DOMContentLoaded', init);

