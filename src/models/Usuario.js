//A grande diferença aqui, em relação aos outros do models, é a segurança. 
//Ele utiliza uma biblioteca chamada bcryptjs para garantir que as senhas não sejam salvas como texto comum, mas sim como "hashes" (códigos criptografados) que ninguém consegue ler.

// Importa as ferramentas do banco de dados e a biblioteca de segurança (bcrypt)
const { ready, query, run, get } = require('../database/sqlite');
const bcrypt = require('bcryptjs');

// Organiza os dados do usuário para o sistema, escondendo informações sensíveis (como a senha)
function formatarUsuario(row) {
  if (!row) return null;
  return {
    _id:       row.id,
    id:        row.id,
    nome:      row.nome,
    email:     row.email,
    perfil:    row.perfil, // Ex: 'Admin', 'Atendente', 'Garçom'
    ativo:     row.ativo === 1, // Converte 1 para true e 0 para false
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const Usuario = {

  // Lista todos os usuários cadastrados (do mais novo para o mais antigo)
  async findAll() {
    await ready;
    const rows = query(`
      SELECT id, nome, email, perfil, ativo, created_at, updated_at
      FROM usuarios ORDER BY created_at DESC
    `);
    return rows.map(formatarUsuario);
  },

  // Busca um usuário pelo e-mail (usado no Login)
  async findByEmail(email) {
    await ready;
    // Converte para minúsculo e remove espaços para evitar erros de digitação
    return get('SELECT * FROM usuarios WHERE email = ?', [email.toLowerCase().trim()]);
  },

  // Busca um usuário pelo ID
  async findById(id) {
    await ready;
    const row = get(`
      SELECT id, nome, email, perfil, ativo, created_at, updated_at
      FROM usuarios WHERE id = ?
    `, [id]);
    return formatarUsuario(row);
  },

  // Cria um novo usuário com senha protegida
  async create({ nome, email, senha, perfil = 'Atendente' }) {
    await ready;
    // Criptografa a senha antes de salvar. O número 10 é o nível de segurança (custo).
    const hash = await bcrypt.hash(senha, 10);
    
    const info = run(
      'INSERT INTO usuarios (nome, email, senha, perfil) VALUES (?, ?, ?, ?)',
      [
        nome.trim(), 
        email.toLowerCase().trim(), 
        hash, // Salva o código seguro, NÃO a senha real
        perfil
      ]
    );
    return this.findById(info.lastInsertRowid);
  },

  // Atualiza os dados do usuário
  async update(id, { nome, email, senha, perfil, ativo }) {
    await ready;
    const atual = get('SELECT * FROM usuarios WHERE id = ?', [id]);
    if (!atual) return null;

    // Se uma nova senha foi enviada, criptografa ela. Se não, mantém a atual.
    let senhaFinal = atual.senha;
    if (senha) senhaFinal = await bcrypt.hash(senha, 10);

    run(`
      UPDATE usuarios SET
        nome       = ?,
        email      = ?,
        senha      = ?,
        perfil     = ?,
        ativo      = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `, [
      nome   ?? atual.nome,
      email  ?? atual.email,
      senhaFinal,
      perfil ?? atual.perfil,
      ativo !== undefined ? (ativo ? 1 : 0) : atual.ativo,
      id
    ]);

    return this.findById(id);
  },

  // Remove um usuário do sistema
  async delete(id) {
    await ready;
    const info = run('DELETE FROM usuarios WHERE id = ?', [id]);
    return info.changes > 0;
  },

  // Função especial para o Login: compara a senha digitada com a criptografada no banco
  verificarSenha(senhaDigitada, hashSalvo) {
    return bcrypt.compare(senhaDigitada, hashSalvo); // Retorna true ou false
  },
};

module.exports = Usuario;