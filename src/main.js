require('dotenv').config();
const axios = require('axios');

const ASANA_TOKEN = process.env.ASANA_TOKEN
const PROJECT_ID = process.env.PROJECT_ID
const SECTION_ID = process.env.SECTION_ID
const OPENWEATHER_KEY = process.env.OPENWEATHER_KEY

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

async function verificarClimaPorRegioes() {
  for (const region of regions) {
    try {
      const { lat, lon, nome, cidade, descricao } = region;
      
      const { data: previsao } = await axios.get(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_KEY}&units=metric&lang=pt_br`
      );

      const { temDiaViavel, dia } = buscarDiaBomParaAtividade(previsao);

      if (temDiaViavel) {
        await criarTarefa({
          name: `☔ Reforçar estoque de palhetas – previsão de chuva (${nome}) em ${dia}`,
          notes: `Previsão de chuva em ${cidade} (${nome}) no dia ${dia}. ${descricao}.`,
          due_on: formatDate(new Date()), // hoje
        });
      } else {
        console.log(`🌤️ Sem chuva prevista para a região ${nome}`);
      }
    } catch (error) {
      console.error(`❌ Erro ao verificar clima da região ${region.nome}:`, error.response?.data || error.message);
    }
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
//criarTarefaSimples();
//listarSecoesDoProjeto();
verificarClimaECriarTarefa();
