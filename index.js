//Esse código é o Entry Point (Ponto de Entrada) da aplicação. 
//É tipo o "cérebro" que liga o motor, conecta os fios e coloca o servidor de pé para começar a atender os clientes.
//É aqui que as configurações globais são definidas.

// Carrega as variáveis de ambiente do arquivo .env (como senhas e portas)
require('dotenv').config();

const express = require('express'); // O framework para criar o servidor
const cors    = require('cors');    // Permite que o Front-end (em outro endereço) acesse esta API
const path    = require('path');    // Ajuda a lidar com caminhos de pastas no computador

const app  = express();
// Define a porta do servidor: usa a do arquivo .env ou a 3001 por padrão
const PORT = process.env.PORT || 3001;

// --- CONFIGURAÇÕES (MIDDLEWARES) ---

app.use(cors()); // Ativa a permissão de acesso externo
app.use(express.json()); // Ensina o servidor a entender mensagens no formato JSON
// Define que a pasta 'public' contém arquivos estáticos (HTML, CSS, Imagens)
app.use(express.static(path.join(__dirname, 'public')));

// Importa a conexão com o banco de dados e as rotas
const { ready } = require('./src/database/sqlite');
const routes    = require('./src/routes/index');

// --- INICIALIZAÇÃO ---

// Só liga o servidor DEPOIS que o banco de dados estiver pronto (ready)
ready.then(() => {
  
  // Todas as rotas do sistema agora começam com /api (Ex: /api/produtos)
  app.use('/api', routes);

  // Rota simples apenas para testar se a API está "viva"
  app.get('/teste', (req, res) => {
    res.json({ mensagem: 'API Metal Tech funcionando!', status: 'online', porta: PORT });
  });

  // Rota principal: entrega o arquivo HTML do seu site para o navegador
  app.get('', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  // Inicia o servidor e mostra as mensagens bonitinhas no terminal
  app.listen(PORT, () => {
    console.log('=================================');
    console.log('Servidor rodando na porta ' + PORT);
    console.log('API: http://localhost:' + PORT + '/api');
    console.log('Front-end: http://localhost:' + PORT);
    console.log('=================================');
  });
  
}).catch(err => {
  // Se o banco de dados falhar ao iniciar, o sistema nem tenta ligar e mostra o erro
  console.error('Erro ao inicializar banco:', err);
  process.exit(1); // Fecha o programa com código de erro
});
