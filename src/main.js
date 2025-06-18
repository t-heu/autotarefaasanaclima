require('dotenv').config();
const axios = require('axios');

const ASANA_TOKEN = process.env.ASANA_TOKEN
const PROJECT_ID = process.env.PROJECT_ID
const SECTION_ID = process.env.SECTION_ID
const OPENWEATHER_KEY = process.env.OPENWEATHER_KEY
const LAT = '-12.2569'; // Latitude de Feira de Santana
const LON = '-38.9645'; // Longitude de Feira de Santana

// Função utilitária para formatar data no formato YYYY-MM-DD
const formatDate = (date) => date.toISOString().split('T')[0];

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

  const hojeStr = formatDate(new Date());
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

// Move uma tarefa para uma seção
async function moverTarefaParaSecao(taskGid) {
  try {
    await axios.post(
      `https://app.asana.com/api/1.0/sections/${SECTION_ID}/addTask`,
      { data: { task: taskGid } },
      {
        headers: {
          Authorization: `Bearer ${ASANA_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log('✅ Tarefa movida com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao mover tarefa:', error.response?.data || error.message);
  }
}

// Cria uma tarefa no Asana
async function criarTarefa({ name, notes, due_on }) {
  try {
    const resposta = await axios.post(
      'https://app.asana.com/api/1.0/tasks',
      {
        data: {
          name,
          notes,
          projects: [PROJECT_ID],
          due_on,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${ASANA_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    await moverTarefaParaSecao(resposta.data.data.gid);

    console.log('✅ Tarefa criada com sucesso!');
    return resposta.data.data;
  } catch (error) {
    console.error('❌ Erro ao criar tarefa:', error.response?.data || error.message);
    return null;
  }
}

// Verifica previsão e cria tarefa de aviso se necessário
async function verificarClimaECriarTarefa() {
  try {
    const { data: previsao } = await axios.get(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${LAT}&lon=${LON}&appid=${OPENWEATHER_KEY}&units=metric&lang=pt_br`
    );

    const { temDiaViavel, dia } = buscarDiaBomParaAtividade(previsao);

    if (temDiaViavel) {
      await criarTarefa({
        name: `⚠️ Reforçar estoque de Palhetas nas lojas - previsão de chuva em ${dia}`,
        notes: `Previsão de chuva para o dia ${dia}. Reforce o estoque de palhetas em todas as lojas para atender à demanda em Feira de Santana.`,
        due_on: formatDate(new Date()), // hoje
      });
    } else {
      console.log('Sem chuva prevista para daqui 4 dias.');
    }
  } catch (error) {
    console.error('❌ Erro ao verificar clima ou criar tarefa:', error.response?.data || error.message);
  }
}

// Tarefa simples de teste
async function criarTarefaSimples() {
  await criarTarefa({
    name: '🧪 Teste automático via script',
    notes: 'Esta é uma tarefa de teste criada via API do Asana.',
    due_on: formatDate(new Date()),
  });
}

// Visualiza seções do projeto
async function listarSecoesDoProjeto() {
  try {
    const resposta = await axios.get(
      `https://app.asana.com/api/1.0/projects/${PROJECT_ID}/sections`,
      {
        headers: {
          Authorization: `Bearer ${ASANA_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log(resposta.data);
  } catch (error) {
    console.error('❌ Erro ao listar seções:', error.response?.data || error.message);
  }
}

// Execução principal
criarTarefaSimples();
//listarSecoesDoProjeto();
verificarClimaECriarTarefa();
