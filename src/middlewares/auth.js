// Importa a biblioteca para lidar com o Token (JSON Web Token)
const jwt = require('jsonwebtoken');

// Função principal que intercepta a requisição (req), prepara a resposta (res) e passa para o próximo (next)
function autenticar(req, res, next) {
  // Tenta pegar o cabeçalho 'authorization' enviado pelo navegador/app
  const authHeader = req.headers['authorization'];
  // O token geralmente vem no formato "Bearer [TOKEN]", então dividimos o texto e pegamos a segunda parte [1]
  const token      = authHeader && authHeader.split(' ')[1];

  // Se não houver token nenhum, barra o acesso imediatamente com erro 401 (Não autorizado)
  if (!token) {
    return res.status(401).json({ erro: 'Token não fornecido. Faça login.' });
  }

  try {
    // Tenta validar o token usando a chave secreta definida no seu arquivo .env
    const payload  = jwt.verify(token, process.env.JWT_SECRET);
    
    // Se o token for válido, os dados do usuário (ID, nome, perfil) são salvos dentro do objeto 'req'
    // Isso permite que as próximas funções saibam QUEM está fazendo a requisição
    req.usuario    = payload;
    
    // "Tudo certo, pode passar!" - Chama a próxima função da rota
    next();
  } catch (erro) {
    // Se o token foi alterado, é falso ou já passou das 8 horas de validade, retorna erro
    return res.status(401).json({ erro: 'Token inválido ou expirado.' });
  }
}

// Exporta a função para ser usada no arquivo de rotas
module.exports = autenticar;