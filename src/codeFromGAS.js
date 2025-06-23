const { ASANA_TOKEN, PROJECT_ID, SECTION_ID, OPENWEATHER_KEY } = process.env;

// Função utilitária para formatar data no formato YYYY-MM-DD
const formatDate = (date) => date.toISOString().split('T')[0];

const regions = [
  {
    nome: 'Nordeste',
    cidade: 'Salvador',
    lat: -12.9777,
    lon: -38.5016,
    descricao: 'Lojas da região Nordeste',
  },/*
  {
    nome: 'Sudeste',
    cidade: 'São Paulo',
    lat: -23.5505,
    lon: -46.6333,
    descricao: 'Lojas da região Sudeste',
  },
  {
    nome: 'Sul',
    cidade: 'Porto Alegre',
    lat: -30.0346,
    lon: -51.2177,
    descricao: 'Lojas da região Sul',
  },
  {
    nome: 'Centro-Oeste',
    cidade: 'Brasília',
    lat: -15.7939,
    lon: -47.8828,
    descricao: 'Lojas da região Centro-Oeste',
  },
  {
    nome: 'Norte',
    cidade: 'Manaus',
    lat: -3.1190,
    lon: -60.0217,
    descricao: 'Lojas da região Norte',
  }*/
];

// Move uma tarefa para uma seção
function moverTarefaParaSecao(taskGid) {
  const url = `https://app.asana.com/api/1.0/sections/${SECTION_ID}/addTask`;

  const payload = {
    data: {
      task: taskGid
    }
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: 'Bearer ' + ASANA_TOKEN
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    UrlFetchApp.fetch(url, options);
    Logger.log('✅ Tarefa movida com sucesso!');
  } catch (error) {
    Logger.log('❌ Erro ao mover tarefa: ' + error.message);
  }
}

function criarTarefa({ name, notes, due_on }) {
  const payload = {
    data: {
      name,
      notes,
      projects: [PROJECT_ID],
      due_on
    }
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: 'Bearer ' + ASANA_TOKEN
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch('https://app.asana.com/api/1.0/tasks', options);
    const result = JSON.parse(response.getContentText());
    const taskId = result.data?.gid || "ERRO";

    if (taskId !== "ERRO") {
      moverTarefaParaSecao(taskId);
    }

    return taskId;
  } catch (err) {
    Logger.log("Erro ao criar tarefa: " + err.message);
    return "ERRO";
  }
}

function onFormSubmit(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const formData = e.namedValues;
  const lastRow = sheet.getLastRow();

  const taskName = formData["Pergunta sem título"][0]; // ajuste para o nome correto da sua pergunta

  const taskId = criarTarefa({
    name: taskName,
    notes: 'text',
    due_on: formatDate(new Date())
  }); // Chamada da função separada

  // Cria coluna "Task ID" se não existir
  const header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  let taskIdCol = header.indexOf("Task ID") + 1;
  if (taskIdCol === 0) {
    taskIdCol = sheet.getLastColumn() + 1;
    sheet.getRange(1, taskIdCol).setValue("Task ID");
  }

  // Escreve o ID da tarefa criada na mesma linha do formulário
  sheet.getRange(lastRow, taskIdCol).setValue(taskId);
}

function verificarTarefasConcluidas() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();

  const header = data[0];
  const taskIdCol = header.indexOf("Task ID");
  const concluidoCol = header.indexOf("Concluído");

  if (taskIdCol === -1 || concluidoCol === -1) {
    Logger.log("Coluna 'Task ID' ou 'Concluído' não encontrada.");
    return;
  }

  for (let i = 1; i < data.length; i++) {
    const taskId = data[i][taskIdCol];
    const jaConcluido = data[i][concluidoCol];

    if (!taskId || jaConcluido === "SIM") continue;

    const url = `https://app.asana.com/api/1.0/tasks/${taskId}`;
    const options = {
      method: 'get',
      headers: {
        Authorization: 'Bearer ' + ASANA_TOKEN
      },
      muteHttpExceptions: true
    };

    try {
      const response = UrlFetchApp.fetch(url, options);
      const json = JSON.parse(response.getContentText());
      const completed = json.data.completed;

      if (completed) {
        sheet.getRange(i + 1, concluidoCol + 1).setValue("SIM");
        console.log("✅ Concluido")
        return;
      }

      console.log("Nada :(")
    } catch (err) {
      Logger.log("Erro ao verificar tarefa: " + taskId);
    }
  }
}

// Busca o próximo dia sem chuva (ignorando hoje e amanhã)
function buscarDiaBomParaAtividade(previsao) {
  const diasMap = {};

  for (const item of previsao.list) {
    const data = item.dt_txt.split(' ')[0];

    if (!diasMap[data]) {
      diasMap[data] = { data, vaiChover: false };
    }

    if (item.weather?.[0]?.main?.toLowerCase() === 'rain') {
      diasMap[data].vaiChover = true;
    }
  }

  const amanhaStr = formatDate(new Date(Date.now() + 24 * 60 * 60 * 1000));

  const diasViaveis = Object.values(diasMap)
    .filter(({ data, vaiChover }) => data > amanhaStr && !vaiChover)
    .sort((a, b) => new Date(a.data) - new Date(b.data));

  const dia = diasViaveis[0]?.data || null;

  return {
    temDiaViavel: !!dia,
    dia,
  };
}

// Verifica previsão e cria tarefa de aviso se necessário
function verificarClimaPorRegioes() {
  for (let i = 0; i < regions.length; i++) {
    const region = regions[i];
    const { lat, lon, nome, cidade, descricao } = region;

    try {
      const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_KEY}&units=metric&lang=pt_br`;

      const response = UrlFetchApp.fetch(url);
      const previsao = JSON.parse(response.getContentText());

      const resultado = buscarDiaBomParaAtividade(previsao); // precisa ser síncrona
      const temDiaViavel = resultado.temDiaViavel;
      const dia = resultado.dia;

      if (temDiaViavel) {
        criarTarefa({
          name: `☔ Reforçar estoque de palhetas – previsão de chuva (${nome}) em ${dia}`,
          notes: `Previsão de chuva em ${cidade} (${nome}) no dia ${dia}. ${descricao}.`,
          due_on: formatDate(new Date()), // hoje
        });
      } else {
        Logger.log(`🌤️ Sem chuva prevista para a região ${nome}`);
      }
    } catch (err) {
      Logger.log(`❌ Erro ao verificar clima da região ${region.nome}: ${err.message}`);
    }
  }
}
