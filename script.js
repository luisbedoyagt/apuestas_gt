// ----------------------
// CONFIGURACIÓN DE LIGAS
// ----------------------
const ligas = {
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
  "usa.1": "EstadosUnidos_MLS",
  "bra.1": "Brasil_Brasileirao",
  "gua.1": "Guatemala_LigaNacional",
  "crc.1": "CostaRica_LigaPromerica",
  "hon.1": "Honduras_LigaNacional",
  "ksa.1": "Arabia_Saudi_ProLeague"
};

// ----------------------
// FUNCIÓN PRINCIPAL: ACTUALIZAR TODAS LAS LIGAS
// ----------------------
function actualizarLigasCompleto() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  for (const ligaId in ligas) {
    const sheetName = ligas[ligaId];
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) sheet = ss.insertSheet(sheetName);
    else sheet.clear();

    const url = `https://site.web.api.espn.com/apis/site/v2/sports/soccer/${ligaId}/teams`;
    const resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });

    if (resp.getResponseCode() !== 200) {
      sheet.getRange(1, 1).setValue(`⚠️ Error al obtener datos: ${resp.getResponseCode()}`);
      continue;
    }

    const data = JSON.parse(resp.getContentText());
    if (!data.sports || !data.sports[0].leagues || !data.sports[0].leagues[0].teams) {
      sheet.getRange(1, 1).setValue(`⚠️ No se encontraron datos`);
      continue;
    }

    const teams = data.sports[0].leagues[0].teams;

    // Cabecera de la hoja
    const headers = [
      "Equipo",
      "PJ",
      "Victorias",
      "Empates",
      "Derrotas",
      "Puntos",
      "GF",
      "GC",
      "Rank",
      "PJ Local",
      "Victorias Local",
      "GF Local",
      "GC Local",
      "PJ Visitante",
      "Victorias Visitante",
      "GF Visitante",
      "GC Visitante",
      "Logo URL"
    ];
    const output = [];

    teams.forEach(t => {
      try {
        const teamUrl = `https://site.web.api.espn.com/apis/site/v2/sports/soccer/${ligaId}/teams/${t.team.id}`;
        const teamResp = UrlFetchApp.fetch(teamUrl, { muteHttpExceptions: true });
        const teamData = JSON.parse(teamResp.getContentText());

        if (!teamData.team || !teamData.team.record || !teamData.team.record.items) {
          return;
        }

        const stats = teamData.team.record.items[0].stats;
        function getStat(name) {
          const s = stats.find(st => st.name === name);
          return s ? s.value : 0;
        }

        const logoUrl = teamData.team.logos && teamData.team.logos[0] && teamData.team.logos[0].href
          ? teamData.team.logos[0].href
          : '';

        output.push([
          teamData.team.displayName,
          getStat("gamesPlayed"),
          getStat("wins"),
          getStat("ties"),
          getStat("losses"),
          getStat("points"),
          getStat("pointsFor"),
          getStat("pointsAgainst"),
          getStat("rank"),
          getStat("homeGamesPlayed"),
          getStat("homeWins"),
          getStat("homePointsFor"),
          getStat("homePointsAgainst"),
          getStat("awayGamesPlayed"),
          getStat("awayWins"),
          getStat("awayPointsFor"),
          getStat("awayPointsAgainst"),
          logoUrl
        ]);
      } catch (eTeam) {
        Logger.log(`Error procesando equipo ${t.team.displayName}: ${eTeam}`);
      }
    });

    // Ordenar y escribir datos
    if (ligaId === "usa.1") {
      const standingsUrl = "https://site.api.espn.com/apis/v2/sports/soccer/usa.1/standings";
      const standingsResp = UrlFetchApp.fetch(standingsUrl, { muteHttpExceptions: true });
      if (standingsResp.getResponseCode() !== 200) {
        output.sort((a, b) => a[8] - b[8]);
        sheet.getRange(1, 1, output.length + 1, headers.length).setValues([headers, ...output]);
      } else {
        const standingsData = JSON.parse(standingsResp.getContentText());
        if (!standingsData.children || !standingsData.children.length) {
          output.sort((a, b) => a[8] - b[8]);
          sheet.getRange(1, 1, output.length + 1, headers.length).setValues([headers, ...output]);
        } else {
          const confMap = {};
          standingsData.children.forEach(conf => {
            const confName = conf.name === "Eastern Conference" ? "Conferencia Este" : "Conferencia Oeste";
            conf.standings.entries.forEach(entry => {
              confMap[entry.team.displayName] = confName;
            });
          });

          output.sort((a, b) => {
            const confA = confMap[a[0]] || "Conferencia Oeste";
            const confB = confMap[b[0]] || "Conferencia Oeste";
            if (confA === confB) return a[8] - b[8];
            return confA === "Conferencia Este" ? -1 : 1;
          });

          const updatedOutput = output.map(row => {
            const plainName = row[0].replace(/\s*\(Conferencia.*\)/, "");
            const confName = confMap[plainName] || "";
            row[0] = confName ? `${plainName} (${confName})` : plainName;
            return row;
          });

          sheet.getRange(1, 1, updatedOutput.length + 1, headers.length).setValues([headers, ...updatedOutput]);
        }
      }
    } else {
      output.sort((a, b) => a[8] - b[8]);
      sheet.getRange(1, 1, output.length + 1, headers.length).setValues([headers, ...output]);
    }

    sheet.autoResizeColumns(1, headers.length);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f0f0f0");
    sheet.getRange(1, 1, output.length + 1, headers.length).setBorder(true, true, true, true, true, true);

    Logger.log(`✅ ${sheetName} actualizada.`);
  }
}

// ----------------------
// WEB APP: ENTREGAR JSON PARA JS
// ----------------------
function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const normalized = {};

  for (const code in ligas) {
    const sheet = ss.getSheetByName(ligas[code]);
    if (!sheet) continue;
    const values = sheet.getDataRange().getValues();
    if (values.length < 2) continue;

    normalized[code] = values.slice(1).map(row => ({
      name: row[0] || '',
      gamesPlayed: parseFloat(row[1] || 0),
      wins: parseFloat(row[2] || 0),
      ties: parseFloat(row[3] || 0),
      losses: parseFloat(row[4] || 0),
      points: parseFloat(row[5] || 0),
      goalsFor: parseFloat(row[6] || 0),
      goalsAgainst: parseFloat(row[7] || 0),
      rank: parseFloat(row[8] || 0),
      gamesPlayedHome: parseFloat(row[9] || 0),
      winsHome: parseFloat(row[10] || 0),
      goalsForHome: parseFloat(row[11] || 0),
      goalsAgainstHome: parseFloat(row[12] || 0),
      gamesPlayedAway: parseFloat(row[13] || 0),
      winsAway: parseFloat(row[14] || 0),
      goalsForAway: parseFloat(row[15] || 0),
      goalsAgainstAway: parseFloat(row[16] || 0),
      logoUrl: row[17] || ''
    }));
  }

  const output = ContentService.createTextOutput();
  output.setContent(JSON.stringify(normalized));
  output.setMimeType(ContentService.MimeType.JSON);
  output.setHeader('Access-Control-Allow-Origin', '*');
  output.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  output.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  return output;
}

// ----------------------
// GUARDAR APUESTAS
// ----------------------
function doPost(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('SavedBets');
    if (!sheet) {
      sheet = ss.insertSheet('SavedBets');
      const headers = [
        'Timestamp',
        'League',
        'Home Team',
        'Away Team',
        'Home Win Prob (%)',
        'Draw Prob (%)',
        'Away Win Prob (%)',
        'BTTS Prob (%)',
        'Over 2.5 Prob (%)',
        'Main Bet',
        'BTTS Recommendation',
        'Over 2.5 Recommendation'
      ];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#f0f0f0');
    }

    const data = JSON.parse(e.postData.contents);
    const row = [
      new Date().toISOString(),
      data.league || '',
      data.homeTeam || '',
      data.awayTeam || '',
      data.homeProb || 0,
      data.drawProb || 0,
      data.awayProb || 0,
      data.bttsProb || 0,
      data.o25Prob || 0,
      data.mainBet || '',
      data.bttsRecommendation || '',
      data.o25Recommendation || ''
    ];

    sheet.appendRow(row);
    sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).setBorder(true, true, true, true, true, true);
    sheet.autoResizeColumns(1, sheet.getLastColumn());

    const output = ContentService.createTextOutput();
    output.setContent(JSON.stringify({ status: 'success' }));
    output.setMimeType(ContentService.MimeType.JSON);
    output.setHeader('Access-Control-Allow-Origin', '*');
    output.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    output.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return output;
  } catch (error) {
    const output = ContentService.createTextOutput();
    output.setContent(JSON.stringify({ status: 'error', message: error.message }));
    output.setMimeType(ContentService.MimeType.JSON);
    output.setHeader('Access-Control-Allow-Origin', '*');
    output.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    output.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return output;
  }
}

// ----------------------
// MANEJAR SOLICITUDES OPTIONS
// ----------------------
function doOptions(e) {
  const output = ContentService.createTextOutput();
  output.setContent('');
  output.setMimeType(ContentService.MimeType.JSON);
  output.setHeader('Access-Control-Allow-Origin', '*');
  output.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  output.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  return output;
}
