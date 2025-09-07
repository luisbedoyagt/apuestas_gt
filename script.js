document.addEventListener('DOMContentLoaded', () => {
    // Elementos del DOM
    const leagueSelect = document.getElementById('leagueSelect');
    const selectedLeagueEvents = document.getElementById('selected-league-events');
    const teamHomeSelect = document.getElementById('teamHome');
    const teamAwaySelect = document.getElementById('teamAway');
    const posHome = document.getElementById('posHome');
    const gfHome = document.getElementById('gfHome');
    const gaHome = document.getElementById('gaHome');
    const winRateHome = document.getElementById('winRateHome');
    const posAway = document.getElementById('posAway');
    const gfAway = document.getElementById('gfAway');
    const gaAway = document.getElementById('gaAway');
    const winRateAway = document.getElementById('winRateAway');
    const formHomeBox = document.getElementById('formHomeBox');
    const formAwayBox = document.getElementById('formAwayBox');
    const pHome = document.getElementById('pHome');
    const pDraw = document.getElementById('pDraw');
    const pAway = document.getElementById('pAway');
    const pBTTS = document.getElementById('pBTTS');
    const pO25 = document.getElementById('pO25');
    const suggestionBox = document.getElementById('suggestion');
    const combinedPrediction = document.getElementById('combined-prediction');
    const resetButton = document.getElementById('reset');

    // Datos simulados (reemplaza con tu API o datos reales)
    const leagues = [
        { id: 1, name: 'Premier League' },
        { id: 2, name: 'La Liga' },
        { id: 3, name: 'Serie A' }
    ];

    const teams = {
        'Premier League': [
            { id: 1, name: 'Manchester United', logo: 'logos/manutd.png' },
            { id: 2, name: 'Liverpool', logo: 'logos/liverpool.png' },
            { id: 3, name: 'Chelsea', logo: 'logos/chelsea.png' }
        ],
        'La Liga': [
            { id: 4, name: 'Real Madrid', logo: 'logos/realmadrid.png' },
            { id: 5, name: 'Barcelona', logo: 'logos/barcelona.png' },
            { id: 6, name: 'Atlético Madrid', logo: 'logos/atletico.png' }
        ],
        'Serie A': [
            { id: 7, name: 'Juventus', logo: 'logos/juventus.png' },
            { id: 8, name: 'AC Milan', logo: 'logos/acmilan.png' },
            { id: 9, name: 'Inter Milan', logo: 'logos/intermilan.png' }
        ]
    };

    const events = {
        'Premier League': [
            { id: 1, home: 'Manchester United', away: 'Liverpool', date: '2025-09-10', time: '15:00' },
            { id: 2, home: 'Chelsea', away: 'Manchester United', date: '2025-09-12', time: '12:30' }
        ],
        'La Liga': [
            { id: 3, home: 'Real Madrid', away: 'Barcelona', date: '2025-09-11', time: '20:00' },
            { id: 4, home: 'Atlético Madrid', away: 'Real Madrid', date: '2025-09-13', time: '18:00' }
        ],
        'Serie A': [
            { id: 5, home: 'Juventus', away: 'AC Milan', date: '2025-09-10', time: '19:45' },
            { id: 6, home: 'Inter Milan', away: 'Juventus', date: '2025-09-12', time: '17:00' }
        ]
    };

    const teamStats = {
        'Manchester United': { position: 3, goalsFor: 20, goalsAgainst: 15, winRate: 60, form: { general: { pj: 10, points: 18, dg: 5 }, home: { pj: 5, pg: 3, dg: 4 }, away: { pj: 5, pg: 2, dg: 1 } } },
        'Liverpool': { position: 1, goalsFor: 25, goalsAgainst: 10, winRate: 75, form: { general: { pj: 10, points: 22, dg: 15 }, home: { pj: 5, pg: 4, dg: 10 }, away: { pj: 5, pg: 3, dg: 5 } } },
        'Chelsea': { position: 5, goalsFor: 18, goalsAgainst: 17, winRate: 50, form: { general: { pj: 10, points: 15, dg: 1 }, home: { pj: 5, pg: 2, dg: 0 }, away: { pj: 5, pg: 2, dg: 1 } } },
        'Real Madrid': { position: 2, goalsFor: 22, goalsAgainst: 12, winRate: 70, form: { general: { pj: 10, points: 20, dg: 10 }, home: { pj: 5, pg: 4, dg: 8 }, away: { pj: 5, pg: 2, dg: 2 } } },
        'Barcelona': { position: 4, goalsFor: 19, goalsAgainst: 14, winRate: 55, form: { general: { pj: 10, points: 16, dg: 5 }, home: { pj: 5, pg: 3, dg: 4 }, away: { pj: 5, pg: 2, dg: 1 } } },
        'Atlético Madrid': { position: 6, goalsFor: 15, goalsAgainst: 13, winRate: 45, form: { general: { pj: 10, points: 14, dg: 2 }, home: { pj: 5, pg: 2, dg: 1 }, away: { pj: 5, pg: 2, dg: 1 } } },
        'Juventus': { position: 2, goalsFor: 21, goalsAgainst: 11, winRate: 65, form: { general: { pj: 10, points: 19, dg: 10 }, home: { pj: 5, pg: 3, dg: 6 }, away: { pj: 5, pg: 2, dg: 4 } } },
        'AC Milan': { position: 3, goalsFor: 18, goalsAgainst: 14, winRate: 50, form: { general: { pj: 10, points: 15, dg: 4 }, home: { pj: 5, pg: 2, dg: 2 }, away: { pj: 5, pg: 2, dg: 2 } } },
        'Inter Milan': { position: 1, goalsFor: 24, goalsAgainst: 9, winRate: 80, form: { general: { pj: 10, points: 23, dg: 15 }, home: { pj: 5, pg: 4, dg: 10 }, away: { pj: 5, pg: 3, dg: 5 } } }
    };

    // Función para truncar texto largo
    function truncateText(text, maxLength = 100) {
        if (text.length > maxLength) {
            return text.substring(0, maxLength);
        }
        return text;
    }

    // Función para alternar texto truncado/expandido
    function toggleText(element) {
        element.classList.toggle('expanded');
        const button = element.querySelector('button');
        if (button) {
            button.textContent = element.classList.contains('expanded') ? 'Leer menos' : 'Leer más';
        }
    }

    // Cargar ligas en el select
    function loadLeagues() {
        leagueSelect.innerHTML = leagues.map(league => `<option value="${league.name}">${league.name}</option>`).join('');
        leagueSelect.insertAdjacentHTML('afterbegin', '<option value="" disabled selected>Selecciona una liga</option>');
    }

    // Cargar eventos para la liga seleccionada
    function loadEvents(league) {
