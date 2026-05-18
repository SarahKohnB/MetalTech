// Esse código é um Model (Modelo) em JavaScript (Node.js) que gerencia as operações de um sistema do metaltech no banco de dados SQLite. 
// Ele lida com a criação, leitura, atualização e exclusão de pedidos.

// Importa as funções de conexão e comandos do banco de dados SQLite
const { ready, query, run, get } = require('../database/sqlite');

// Define um "molde" de comando SQL para buscar pedidos trazendo também os dados do cliente (JOIN)
const SELECT_PEDIDO = `
  SELECT
    p.*,
    c.nome     AS cliente_nome,
    c.telefone AS cliente_telefone
  FROM pedidos p
  LEFT JOIN clientes c ON c.id = p.cliente_id
`;

// Função auxiliar que organiza os dados brutos do banco em um objeto "bonitinho" para o sistema
function formatarPedido(row, itens = []) {
  if (!row) return null; // Se não houver dados, retorna vazio
  return {
    _id:           row.id,
    id:            row.id,
    numeroPedido:  row.numero_pedido,
    cliente: { // Agrupa dados do cliente em um sub-objeto
      _id:      row.cliente_id,
      id:       row.cliente_id,
      nome:     row.cliente_nome,
      telefone: row.cliente_telefone,
    },
    // Transforma a lista de itens do banco para o formato usado no Front-end
    itens: itens.map(it => ({
      _id:           it.id,
      produto:         it.produto_id,
      nomeProduto:     it.nome_produto,
      medida:       it.medida,
      quantidade:    it.quantidade,
      precoUnitario: it.preco_unitario,
      subtotal:      it.subtotal,
    })),
    subtotal:       row.subtotal,
    taxaEntrega:    row.taxa_entrega,
    total:          row.total,
    formaPagamento: row.forma_pagamento,
    troco:          row.troco,
    status:         row.status,
    observacoes:    row.observacoes,
    mesa:           row.mesa,
    origem:         row.origem,
    garcom:         row.garcom_id,
    createdAt:      row.created_at,
    updatedAt:      row.updated_at,
  };
}

// Objeto principal que contém as funções de gerenciamento de Pedidos
const Pedido = {

  // Busca TODOS os pedidos (pode filtrar por Garçom se for passado o ID)
  async findAll({ garcomId } = {}) {
    await ready; // Espera o banco de dados estar pronto
    let rows;
    
    // Se enviou ID de garçom, filtra por ele. Se não, traz tudo ordenado pelos mais novos
    if (garcomId) {
      rows = query(`${SELECT_PEDIDO} WHERE p.garcom_id = ? ORDER BY p.created_at DESC`, [garcomId]);
    } else {
      rows = query(`${SELECT_PEDIDO} ORDER BY p.created_at DESC`);
    }

    // Para cada pedido encontrado, busca também os itens (produtos) que pertencem a ele
    return rows.map(row => {
      const itens = query('SELECT * FROM itens_pedido WHERE pedido_id = ?', [row.id]);
      return formatarPedido(row, itens);
    });
  },

  // Busca um pedido específico pelo ID dele
  async findById(id) {
    await ready;
    const row = get(`${SELECT_PEDIDO} WHERE p.id = ?`, [id]);
    if (!row) return null;
    
    // Busca os itens vinculados a esse pedido específico
    const itens = query('SELECT * FROM itens_pedido WHERE pedido_id = ?', [id]);
    return formatarPedido(row, itens);
  },

  // Cria um novo pedido no sistema
  async create({ clienteId, itens, taxaEntrega = 0, formaPagamento, troco = 0, observacoes = '', mesa = null, origem = 'balcao', garcomId = null }) {
    await ready;

    const Produto = require('./Produto'); // Importa o modelo de Produto para validar preços
    let subtotal = 0;
    const itensProcessados = [];

    // Loop para processar cada item do pedido, conferindo preços e calculando totais
    for (const item of itens) {
    const produto = await Produto.findById(item.produto);
    if (!produto) throw new Error(`Produto ID ${item.produto} não encontrado`);

    const preco = produto.preco || 0;
    const subItem = preco * item.quantidade;
    subtotal += subItem;

  itensProcessados.push({
    produtoId: produto.id,
    nomeProduto: produto.nome,
    medida: item.medida || 'Unidade',
    quantidade: item.quantidade,
    precoUnitario: preco,
    subtotal: subItem,
  });
}

    const total = subtotal + (taxaEntrega || 0);
    
    // Gera o próximo número sequencial do pedido (Ex: Pedido #10, #11...)
    const contagem     = get('SELECT COUNT(*) as total FROM pedidos');
    const numeroPedido = (contagem?.total || 0) + 1;

    // Insere os dados principais na tabela de 'pedidos'
    const infoPedido = run(`
      INSERT INTO pedidos
        (numero_pedido, cliente_id, subtotal, taxa_entrega, total,
         forma_pagamento, troco, observacoes, mesa, origem, garcom_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [numeroPedido, clienteId, subtotal, taxaEntrega || 0, total,
        formaPagamento, troco || 0, observacoes, mesa, origem, garcomId]);

    const pedidoId = infoPedido.lastInsertRowid; // Pega o ID que o banco acabou de gerar

    // Insere cada item (produto) na tabela de 'itens_pedido' vinculando ao ID do pedido acima
    for (const item of itensProcessados) {
      run(`
  INSERT INTO itens_pedido
    (pedido_id, produto_id, nome_produto, medida, quantidade, preco_unitario, subtotal)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [
    pedidoId,
    item.produtoId,
    item.nomeProduto,
    item.medida,
    item.quantidade,
    item.precoUnitario,
    item.subtotal
  ]);
    }

    // Retorna o pedido completo já formatado
    return this.findById(pedidoId);
  },

  // Atualiza apenas o status (Ex: "Pendente" para "Entregue")
  async updateStatus(id, status) {
    await ready;
    const info = run(
      "UPDATE pedidos SET status = ?, updated_at = datetime('now') WHERE id = ?",
      [status, id]
    );
    return info.changes > 0 ? this.findById(id) : null;
  },

  // Deleta um pedido (e seus itens) do sistema
  async delete(id) {
    await ready;
    run('DELETE FROM itens_pedido WHERE pedido_id = ?', [id]); // Primeiro remove os itens (limpeza)
    const info = run('DELETE FROM pedidos WHERE id = ?', [id]); // Depois remove o pedido
    return info.changes > 0;
  },
};

// Exporta o módulo para ser usado em outras partes do site
module.exports = Pedido;