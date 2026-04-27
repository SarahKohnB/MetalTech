// Esse código é o Model de Pizza.
// Vai permitir editar e excluir pizzas
// Ele funciona de forma muito parecida com o de pedidos, mas com um detalhe importante: ele lida com a conversão de objetos para texto (JSON), já que o SQLite não guarda "listas de preços".

// Importa as ferramentas para conversar com o banco de dados SQLite
const { ready, query, run, get } = require('../database/sqlite');

// Função que "limpa" e organiza os dados da pizza que vêm do banco
function formatarPizza(row) {
  if (!row) return null; // Se não encontrou a pizza, retorna vazio
  return {
    _id:          row.id,
    id:           row.id,
    nome:         row.nome,
    descricao:    row.descricao,
    ingredientes: row.ingredientes,
    // O banco guarda os preços como texto. Aqui, transformamos de volta em um objeto JS.
    precos:       JSON.parse(row.precos || '{"P":0,"M":0,"G":0}'),
    // No banco, 1 é true (disponível) e 0 é false (esgotada)
    disponivel:   row.disponivel === 1,
    categoria:    row.categoria,
    createdAt:    row.created_at,
    updatedAt:    row.updated_at,
  };
}

// Objeto que contém as ações que podemos fazer com as Pizzas
const Pizza = {

  // Busca todas as pizzas cadastradas, ordenadas por categoria e nome
  async findAll() {
    await ready; // Garante que o banco está conectado
    return query('SELECT * FROM pizzas ORDER BY categoria, nome').map(formatarPizza);
  },

  // Busca uma única pizza pelo ID dela
  async findById(id) {
    await ready;
    return formatarPizza(get('SELECT * FROM pizzas WHERE id = ?', [id]));
  },

  // Cadastra uma nova pizza no sistema
  async create({ nome, descricao = '', ingredientes, precos = {}, disponivel = true, categoria = 'tradicional' }) {
    await ready;
    const info = run(
      'INSERT INTO pizzas (nome, descricao, ingredientes, precos, disponivel, categoria) VALUES (?, ?, ?, ?, ?, ?)',
      [
        nome.trim(), // Remove espaços extras no início e fim
        descricao.trim(), 
        ingredientes.trim(),
        // Transforma o objeto de preços {P: 10, M: 20...} em texto para salvar no banco
        JSON.stringify({ P: precos.P || 0, M: precos.M || 0, G: precos.G || 0 }),
        disponivel ? 1 : 0, // Salva como 1 ou 0
        categoria
      ]
    );
    // Após criar, busca a pizza recém-criada para confirmar
    return this.findById(info.lastInsertRowid);
  },

  // Atualiza as informações de uma pizza existente
  async update(id, { nome, descricao, ingredientes, precos, disponivel, categoria }) {
    await ready;
    // Primeiro, busca como a pizza está agora no banco
    const atual = get('SELECT * FROM pizzas WHERE id = ?', [id]);
    if (!atual) return null;

    // Lógica para atualizar preços: se não enviar novos, mantém os antigos
    const precosAtuais = JSON.parse(atual.precos || '{"P":0,"M":0,"G":0}');
    const precosFinal  = precos
      ? { P: precos.P ?? precosAtuais.P, M: precos.M ?? precosAtuais.M, G: precos.G ?? precosAtuais.G }
      : precosAtuais;

    // Executa a atualização no banco de dados
    run(`
      UPDATE pizzas SET
        nome         = ?,
        descricao    = ?,
        ingredientes = ?,
        precos       = ?,
        disponivel   = ?,
        categoria    = ?,
        updated_at   = datetime('now') -- Atualiza a data de modificação para "agora"
      WHERE id = ?
    `, [
      nome         ?? atual.nome,         // Se não enviou nome novo, usa o atual
      descricao    ?? atual.descricao,
      ingredientes ?? atual.ingredientes,
      JSON.stringify(precosFinal),        // Salva os preços atualizados como texto
      disponivel   !== undefined ? (disponivel ? 1 : 0) : atual.disponivel,
      categoria    ?? atual.categoria,
      id
    ]);

    return this.findById(id); // Retorna a pizza já com as alterações
  },

  // Remove uma pizza do banco de dados
  async delete(id) {
    await ready;
    const info = run('DELETE FROM pizzas WHERE id = ?', [id]);
    return info.changes > 0; // Retorna true se algo foi deletado
  },
};

module.exports = Pizza;