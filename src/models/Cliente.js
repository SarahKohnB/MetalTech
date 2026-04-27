const { ready, query, run, get } = require('../database/sqlite');
// Importa funções para interagir com o banco de dados SQLite:
// - ready: espera o banco de dados estar pronto para interações.
// - query: executa uma consulta de leitura.
// - run: executa comandos de escrita (inserção, atualização, exclusão).
// - get: obtém uma única linha com base em uma consulta.


function formatarCliente(row) {
  // Função auxiliar que formata um registro de cliente, convertendo os dados para um formato consistente
  if (!row) return null; // Se a linha for nula, retorna null
  return {
    _id:        row.id,                    // Mapeia o ID para '_id' (compatível com o formato de retorno)
    id:         row.id,                    // ID do cliente
    nome:       row.nome,                  // Nome do cliente
    telefone:   row.telefone,              // Telefone do cliente
    endereco:   JSON.parse(row.endereco || '{}'), // Endereço do cliente (armazenado como JSON, precisa ser convertido para objeto)
    observacoes: row.observacoes,         // Observações sobre o cliente
    ativo:      row.ativo === 1,           // Converte o valor 1/0 em um valor booleano para o campo 'ativo'
    createdAt:  row.created_at,            // Data de criação do cliente
    updatedAt:  row.updated_at,            // Data da última atualização do cliente
  };
}


const Cliente = {


  async findAll(busca = '') {
    // Método que encontra todos os clientes ou clientes filtrados por nome ou telefone, se 'busca' for fornecida
    await ready;  // Espera o banco de dados estar pronto
    let rows;
    if (busca) {
      // Se houver uma busca, filtra os clientes com nome ou telefone semelhante
      const t = `%${busca}%`; // Define o padrão de busca
      rows = query(
        'SELECT * FROM clientes WHERE ativo = 1 AND (nome LIKE ? OR telefone LIKE ?) ORDER BY nome',
        [t, t]  // Passa os parâmetros para a consulta SQL
      );
    } else {
      // Se não houver busca, retorna todos os clientes ativos, ordenados pelo nome
      rows = query('SELECT * FROM clientes WHERE ativo = 1 ORDER BY nome');
    }
    return rows.map(formatarCliente);  // Retorna os clientes formatados
  },


  async findById(id) {
    // Método para encontrar um cliente específico pelo ID
    await ready;  // Espera o banco de dados estar pronto
    return formatarCliente(get('SELECT * FROM clientes WHERE id = ?', [id]));  // Retorna o cliente formatado
  },


  async create({ nome, telefone, endereco = {}, observacoes = '' }) {
    // Método para criar um novo cliente
    await ready;  // Espera o banco de dados estar pronto
    const info = run(
      'INSERT INTO clientes (nome, telefone, endereco, observacoes) VALUES (?, ?, ?, ?)',
      [nome.trim(), telefone.trim(), JSON.stringify(endereco), observacoes]  // Insere o cliente no banco, convertendo o endereço para JSON
    );
    return this.findById(info.lastInsertRowid);  // Retorna o cliente recém-criado com base no ID gerado
  },


  async update(id, { nome, telefone, endereco, observacoes, ativo }) {
    // Método para atualizar os dados de um cliente existente
    await ready;  // Espera o banco de dados estar pronto
    const atual = get('SELECT * FROM clientes WHERE id = ?', [id]);  // Obtém os dados atuais do cliente
    if (!atual) return null;  // Se o cliente não for encontrado, retorna null


    // Combina o endereço atual com as novas informações, se fornecido
    const endAtual = JSON.parse(atual.endereco || '{}');
    const endFinal = endereco ? { ...endAtual, ...endereco } : endAtual;


    // Executa a atualização no banco de dados
    run(`
      UPDATE clientes SET
        nome        = ?,
        telefone    = ?,
        endereco    = ?,
        observacoes = ?,
        ativo       = ?,
        updated_at  = datetime('now')
      WHERE id = ?
    `, [
      nome        ?? atual.nome,          // Se 'nome' não for fornecido, usa o valor atual
      telefone    ?? atual.telefone,      // Se 'telefone' não for fornecido, usa o valor atual
      JSON.stringify(endFinal),           // Converte o novo endereço para JSON
      observacoes ?? atual.observacoes,  // Se 'observacoes' não for fornecido, usa o valor atual
      ativo !== undefined ? (ativo ? 1 : 0) : atual.ativo, // Atualiza o campo 'ativo', com conversão booleana
      id                                     // ID do cliente para atualização
    ]);
   
    return this.findById(id);  // Retorna o cliente atualizado
  },


  async delete(id) {
    // Método para excluir um cliente pelo ID
    await ready;  // Espera o banco de dados estar pronto
    const info = run('DELETE FROM clientes WHERE id = ?', [id]);  // Executa a exclusão do cliente no banco
    return info.changes > 0;  // Retorna true se a exclusão foi bem-sucedida (baseado no número de linhas afetadas)
  },
};


module.exports = Cliente;  // Exporta o objeto Cliente, que contém os métodos acima
