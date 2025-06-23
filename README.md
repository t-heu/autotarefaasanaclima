## 🧠 Visão geral da lógica:

1. Servidor roda 1x por semana (cron).
2. Ele consulta a previsão do tempo.
3. Se detectar **chuva em 7 dias** por região, cria tarefa no Asana.

---

## 🔧 Etapas detalhadas:

### 1. Obter chave da API do Asana

* Vá em: [https://app.asana.com/0/developer-console](https://app.asana.com/0/developer-console)
* Crie um “Personal Access Token”
* Guarde esse token (ex: `ASANA_TOKEN`)

### 2. Obter ID do Projeto

* Vá na sua URL do projeto, exemplo: `https://app.asana.com/1/1210576223500129/project/1210576473264083/board/1210576473951326
`
* Contém três IDs, mas o que você precisa como PROJECT_ID é este aqui: `1210576473264083` esse é o ID do projeto onde suas tarefas vão ser criadas via API.
* Guarde esse token (ex: `PROJECT_ID`)

### 3. Obter chave da API de tempo

* Exemplo: [https://openweathermap.org/api](https://openweathermap.org/api)
* Crie sua conta
* Use a **One Call API (ou 5 Day Forecast API)**
* Pegue a `API_KEY`
ou
* Acesse https://home.openweathermap.org/users/sign_up e crie sua conta.
* Vá em API keys e copie sua `API_KEY`.

### 4. Adicione seus segredos no GitHub
Vá em: 🔐 Settings → Secrets → Actions → New repository secret

Crie:
Nome	Valor
- OPENWEATHER_KEY	Sua chave da API de clima
- ASANA_TOKEN	Seu token do Asana (Bearer)
- PROJECT_ID	GID do seu projeto
- SECTION_ID	GID da seção do Asana
