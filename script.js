document.addEventListener('DOMContentLoaded', () => {
  const leagueSelect = document.getElementById('leagueSelect');
  const teamHome = document.getElementById('teamHome');
  const teamAway = document.getElementById('teamAway');
  const posHome = document.getElementById('posHome');
  const posAway = document.getElementById('posAway');
  const gfHome = document.getElementById('gfHome');
  const gaHome = document.getElementById('gaHome');
  const gfAway = document.getElementById('gfAway');
  const gaAway = document.getElementById('gaAway');
  const formHomeTeam = document.getElementById('formHomeTeam');
  const formAwayTeam = document.getElementById('formAwayTeam');
  const formHomeBox = document.getElementById('formHomeBox');
  const formAwayBox = document.getElementById('formAwayBox');
  const pHome = document.getElementById('pHome');
  const pDraw = document.getElementById('pDraw');
  const pAway = document.getElementById('pAway');
  const pBTTS = document.getElementById('pBTTS');
  const pO25 = document.getElementById('pO25');
  const homeAdvantageFactor = document.getElementById('homeAdvantageFactor');
  const strengthFactor = document.getElementById('strengthFactor');
  const dixonColesFactor = document.getElementById('dixonColesFactor');
  const details = document.getElementById('details');
  const suggestion = document.getElementById('suggestion');
  const recalc = document.getElementById('recalc');
  const reset = document.getElementById('reset');

  let leagueData = null;

  // Cargar ligas desde la API
  fetch('https://script.google.com/macros/s/AKfycbxMy0n4GbjzkGxC8NksxW5xX700jhzWERVNhSY5FXjJHHzyYAlikq56c30Zl689Ecsy1Q/exec')
    .then(response => response.json())
    .then(data => {
      data.data.forEach(league => {
        const option = document.createElement('option');
        option.value = league.id;
        option.textContent = league.name;
        leagueSelect.appendChild(option);
      });
    })
    .catch(error => console.error('Error al cargar ligas:', error));

  // Cargar equipos cuando se selecciona una liga
  leagueSelect.addEventListener('change', () => {
    const leagueId = leagueSelect.value;
    teamHome.innerHTML = '<option value="">-- Selecciona equipo --</option>';
    teamAway.innerHTML = '<option value="">-- Selecciona equipo --</option>';
    resetFields();

    if (leagueId) {
      fetch(`https://api.football-data-api.com/league-teams?key=example&league_id=${leagueId}`)
        .then(response => response.json())
        .then(data => {
          leagueData = data.data;
          data.data.forEach(team => {
            const optionHome = document.createElement('option');
            const optionAway = document.createElement('option');
            optionHome.value = team.id;
            optionAway.value = team.id;
            optionHome.textContent = team.name;
            optionAway.textContent = team.name;
            teamHome.appendChild(optionHome);
            teamAway.appendChild(optionAway);
          });
        })
        .catch(error => console.error('Error al cargar equipos:', error));
    }
  });

  // Actualizar estadísticas al seleccionar equipos
  teamHome.addEventListener('change', () => updateTeamStats('home'));
  teamAway.addEventListener('change', () => updateTeamStats('away'));

  function updateTeamStats(teamType) {
    const teamSelect = teamType === 'home' ? teamHome : teamAway;
    const teamId = teamSelect.value;
    const posInput = teamType === 'home' ? posHome : posAway;
    const gfInput = teamType === 'home' ? gfHome : gaHome;
    const gaInput = teamType === 'home' ? gaHome : gaAway;
    const formTeam = teamType === 'home' ? formHomeTeam : formAwayTeam;
    const formBox = teamType === 'home' ? formHomeBox : formAwayBox;
    const probElement = teamType === 'home' ? pHome.parentElement.querySelector('.small') : pAway.parentElement.querySelector('.small');

    if (teamId && leagueData) {
      const team = leagueData.find(t => t.id === parseInt(teamId));
      if (team) {
        posInput.value = team.position || '—';
        gfInput.value = team.goals_scored || '—';
        gaInput.value = team.goals_conceded || '—';
        formTeam.textContent = `${teamType === 'home' ? 'Local' : 'Visitante'}: ${team.name}`;
        formBox.textContent = `PJ: ${team.matches_played || '—'} | G: ${team.wins || '—'} | E: ${team.draws || '—'} | P: ${team.losses || '—'}`;
        probElement.textContent = `Probabilidad: ${team.name}`; // Actualizar texto con el nombre del equipo
      }
    } else {
      posInput.value = '—';
      gfInput.value = '—';
      gaInput.value = '—';
      formTeam.textContent = `${teamType === 'home' ? 'Local' : 'Visitante'}: —`;
      formBox.textContent = 'PJ: — | G: — | E: — | P: —';
      probElement.textContent = 'Probabilidad: —'; // Valor por defecto
    }

    validateInputs();
  }

  // Validar entradas
  function validateInputs() {
    if (teamHome.value && teamAway.value && teamHome.value === teamAway.value) {
      details.innerHTML = '<div class="error"><strong>ALERTA:</strong> No puedes seleccionar el mismo equipo para local y visitante.</div>';
      recalc.disabled = true;
    } else if (teamHome.value && teamAway.value) {
      details.innerHTML = '';
      recalc.disabled = false;
    } else {
      details.innerHTML = '<div class="error"><strong>ALERTA:</strong> Selecciona ambos equipos para calcular las probabilidades.</div>';
      recalc.disabled = true;
    }
  }

  // Calcular probabilidades
  recalc.addEventListener('click', () => {
    if (!teamHome.value || !teamAway.value) return;

    const homeTeam = leagueData.find(t => t.id === parseInt(teamHome.value));
    const awayTeam = leagueData.find(t => t.id === parseInt(teamAway.value));

    const homeGoals = parseInt(homeTeam.goals_scored) / parseInt(homeTeam.matches_played);
    const awayGoals = parseInt(awayTeam.goals_scored) / parseInt(awayTeam.matches_played);
    const homeConceded = parseInt(homeTeam.goals_conceded) / parseInt(homeTeam.matches_played);
    const awayConceded = parseInt(awayTeam.goals_conceded) / parseInt(awayTeam.matches_played);

    const homeAttack = homeGoals / leagueData.reduce((sum, t) => sum + parseInt(t.goals_scored) / parseInt(t.matches_played), 0) / leagueData.length;
    const awayAttack = awayGoals / leagueData.reduce((sum, t) => sum + parseInt(t.goals_scored) / parseInt(t.matches_played), 0) / leagueData.length;
    const homeDefense = homeConceded / leagueData.reduce((sum, t) => sum + parseInt(t.goals_conceded) / parseInt(t.matches_played), 0) / leagueData.length;
    const awayDefense = awayConceded / leagueData.reduce((sum, t) => sum + parseInt(t.goals_conceded) / parseInt(t.matches_played), 0) / leagueData.length;

    const homeAdvantage = 1.2;
    const expectedHomeGoals = homeAttack * awayDefense * homeAdvantage;
    const expectedAwayGoals = awayAttack * homeDefense;

    const maxGoals = 10;
    let homeProbs = Array(maxGoals + 1).fill(0);
    let awayProbs = Array(maxGoals + 1).fill(0);

    for (let i = 0; i <= maxGoals; i++) {
      homeProbs[i] = (Math.pow(expectedHomeGoals, i) * Math.exp(-expectedHomeGoals)) / factorial(i);
      awayProbs[i] = (Math.pow(expectedAwayGoals, i) * Math.exp(-expectedAwayGoals)) / factorial(i);
    }

    let homeWinProb = 0, drawProb = 0, awayWinProb = 0, bttsProb = 0, over25Prob = 0;
    for (let i = 0; i <= maxGoals; i++) {
      for (let j = 0; j <= maxGoals; j++) {
        const prob = homeProbs[i] * awayProbs[j];
        if (i > j) homeWinProb += prob;
        else if (i === j) drawProb += prob;
        else awayWinProb += prob;
        if (i > 0 && j > 0) bttsProb += prob;
        if (i + j > 2) over25Prob += prob;
      }
    }

    const dixonColesAdjustment = 0.95;
    homeWinProb *= dixonColesAdjustment;
    awayWinProb *= dixonColesAdjustment;
    drawProb = 1 - homeWinProb - awayWinProb;

    pHome.textContent = (homeWinProb * 100).toFixed(1) + '%';
    pDraw.textContent = (drawProb * 100).toFixed(1) + '%';
    pAway.textContent = (awayWinProb * 100).toFixed(1) + '%';
    pBTTS.textContent = (bttsProb * 100).toFixed(1) + '%';
    pO25.textContent = (over25Prob * 100).toFixed(1) + '%';

    homeAdvantageFactor.textContent = homeAdvantage.toFixed(2);
    strengthFactor.textContent = ((homeAttack + awayDefense) / (awayAttack + homeDefense)).toFixed(2);
    dixonColesFactor.textContent = dixonColesAdjustment.toFixed(2);

    const maxProb = Math.max(homeWinProb, drawProb, awayWinProb);
    let recommendation = '';
    if (maxProb === homeWinProb) {
      recommendation = `Gana ${homeTeam.name}`;
    } else if (maxProb === drawProb) {
      recommendation = 'Empate';
    } else {
      recommendation = `Gana ${awayTeam.name}`;
    }

    suggestion.innerHTML = `
      <p>⚡️</p>
      <p><strong>${(maxProb * 100).toFixed(1)}% de acierto</strong></p>
      <p>Recomendación: ${recommendation}</p>
      <p>Según el pronóstico</p>
      <p>El fútbol es impredecible, ¡apuesta con cautela!</p>
    `;

    details.innerHTML = `
      <div>Probabilidad de victoria del equipo local (${homeTeam.name}): ${(homeWinProb * 100).toFixed(1)}%</div>
      <div>Probabilidad de empate: ${(drawProb * 100).toFixed(1)}%</div>
      <div>Probabilidad de victoria del equipo visitante (${awayTeam.name}): ${(awayWinProb * 100).toFixed(1)}%</div>
      <div>Probabilidad de ambos equipos anotan (BTTS): ${(bttsProb * 100).toFixed(1)}%</div>
      <div>Probabilidad de más de 2.5 goles: ${(over25Prob * 100).toFixed(1)}%</div>
    `;
  });

  // Resetear campos
  reset.addEventListener('click', () => {
    leagueSelect.value = '';
    teamHome.innerHTML = '<option value="">-- Selecciona equipo --</option>';
    teamAway.innerHTML = '<option value="">-- Selecciona equipo --</option>';
    resetFields();
  });

  function resetFields() {
    posHome.value = '—';
    posAway.value = '—';
    gfHome.value = '—';
    gaHome.value = '—';
    gfAway.value = '—';
    gaAway.value = '—';
    formHomeTeam.textContent = 'Local: —';
    formAwayTeam.textContent = 'Visitante: —';
    formHomeBox.textContent = 'PJ: — | G: — | E: — | P: —';
    formAwayBox.textContent = 'PJ: — | G: — | E: — | P: —';
    pHome.textContent = '—';
    pDraw.textContent = '—';
    pAway.textContent = '—';
    pBTTS.textContent = '—';
    pO25.textContent = '—';
    pHome.parentElement.querySelector('.small').textContent = 'Probabilidad: —'; // Resetear texto
    pAway.parentElement.querySelector('.small').textContent = 'Probabilidad: —'; // Resetear texto
    homeAdvantageFactor.textContent = '—';
    strengthFactor.textContent = '—';
    dixonColesFactor.textContent = '—';
    details.innerHTML = '<div class="error"><strong>ALERTA:</strong> Selecciona ambos equipos para calcular las probabilidades.</div>';
    suggestion.innerHTML = 'Esperando datos para tu apuesta estelar...';
    recalc.disabled = true;
  }

  // Función factorial
  function factorial(n) {
    if (n === 0 || n === 1) return 1;
    return n * factorial(n - 1);
  }
});
