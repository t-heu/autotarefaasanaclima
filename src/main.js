require('dotenv').config();
const axios = require('axios');

const ASANA_TOKEN = process.env.ASANA_TOKEN
const PROJECT_ID = process.env.PROJECT_ID
const SECTION_ID = process.env.SECTION_ID
const OPENWEATHER_KEY = process.env.OPENWEATHER_KEY
const LAT = '-12.2569'; // Latitude de Feira de Santana
const LON = '-38.9645'; // Longitude de Feira de Santana

async function move(res) {
  try {
    await axios.post(
      `https://app.asana.com/api/1.0/sections/${SECTION_ID}/addTask`,
      {
        data: {
          task: res.data.data.gid
        }
      },
      {
        headers: {
          Authorization: `Bearer ${ASANA_TOKEN}`,
          'Content-Type': 'application/json',
        }
      }
    );

    console.log('✅ Tarefa movida com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao criar tarefa:', error.response?.data || error.message);
  }
}

async function checkWeatherAndAddTask() {
  try {
    // Buscar previsão para 7 dias
    const clima = await axios.get(`https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&appid=${OPENWEATHER_KEY}`)
    /*(
      `https://api.openweathermap.org/data/2.5/onecall?lat=${LAT}&lon=${LON}&exclude=current,minutely,hourly,alerts&appid=${OPENWEATHER_KEY}&units=metric`
    );*/
    console.log(clima)
    const previsaoDia4 = clima.data.daily[4]; // Índice 4 = 4 dias à frente

    const vaiChover = previsaoDia4.weather.some(w => w.main.toLowerCase().includes('rain'));

    if (vaiChover) {
      const dataChuva = new Date(previsaoDia4.dt * 1000).toLocaleDateString('pt-BR');

      const response = await axios.post('https://app.asana.com/api/1.0/tasks', {
        data: {
          name: `⚠️ Previsão de chuva em ${dataChuva}`,
          notes: `Vai chover em ${dataChuva} em Feira de Santana. Prepare-se!`,
          projects: [PROJECT_ID],
          due_on: new Date().toISOString().split('T')[0], // hoje
        }
      }, {
        headers: {
          Authorization: `Bearer ${ASANA_TOKEN}`
        }
      });

      await move(response)

      console.log('✅ Tarefa criada no Asana!');
    } else {
      console.log('Sem chuva prevista para daqui 4 dias.');
    }
  } catch (error) {
    console.error('❌ Erro ao criar tarefa:', error.response?.data || error.message);
  }
}

async function createSimpleTask() {
  try {
    const resposta = await axios.post(
      'https://app.asana.com/api/1.0/tasks',
      {
        data: {
          name: '🧪 Teste automático via script',
          notes: 'Esta é uma tarefa de teste criada via API do Asana.',
          projects: [PROJECT_ID],
          due_on: new Date().toISOString().split('T')[0], // Prazo: hoje
        },
      },
      {
        headers: {
          Authorization: `Bearer ${ASANA_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    await move(resposta)

    console.log('✅ Tarefa criada com sucesso!');
    console.log(`🔗 Link: https://app.asana.com/0/${PROJECT_ID}/${resposta.data.data.gid}`);
  } catch (error) {
    console.error('❌ Erro ao criar tarefa:', error.response?.data || error.message);
  }
}

async function sectionView() {
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
    console.error('❌ Algo deu errado:', error.response?.data || error.message);
  }
}

//createSimpleTask();
//sectionView()
checkWeatherAndAddTask();
