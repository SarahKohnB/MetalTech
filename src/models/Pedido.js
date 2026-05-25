// Model de Pedido - MetalTech
// Gerencia criação, listagem, atualização de status e exclusão de pedidos.

const { ready, query, run, get } = require('../database/sqlite');

const SELECT_PEDIDO = `
  SELECT
    p.*,
    c.nome     AS cliente_nome,
    c.telefone AS cliente_telefone
  FROM pedidos p
  LEFT JOIN clientes c ON c.id = p.cliente_id
`;

function formatarPedido(row, itens = []) {
  if (!row) return null;

  return {
    _id: row.id,
    id: row.id,
    numeroPedido: row.numero_pedido,

    cliente: {
      _id: row.cliente_id,
      id: row.cliente_id,
      nome: row.cliente_nome,
      telefone: row.cliente_telefone,
    },

    itens: itens.map(it => ({
      _id: it.id,
      produto: it.produto_id,
      nomeProduto: it.nome_produto,
      medida: it.medida,
      quantidade: it.quantidade,
      precoUnitario: it.preco_unitario,
      subtotal: it.subtotal,
    })),

    subtotal: row.subtotal,
    taxaEntrega: row.taxa_entrega,
    total: row.total,
    formaPagamento: row.forma_pagamento,
    troco: row.troco,
    status: row.status,
    observacoes: row.observacoes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const Pedido = {
  async findAll() {
    await ready;

    const rows = query(`${SELECT_PEDIDO} ORDER BY p.created_at DESC`);

    return rows.map(row => {
      const itens = query(
        'SELECT * FROM itens_pedido WHERE pedido_id = ?',
        [row.id]
      );

      return formatarPedido(row, itens);
    });
  },

  async findById(id) {
    await ready;

    const row = get(`${SELECT_PEDIDO} WHERE p.id = ?`, [id]);

    if (!row) return null;

    const itens = query(
      'SELECT * FROM itens_pedido WHERE pedido_id = ?',
      [id]
    );

    return formatarPedido(row, itens);
  },

  async create({
    clienteId,
    itens,
    taxaEntrega = 0,
    formaPagamento,
    troco = 0,
    observacoes = ''
  }) {
    await ready;

    const Produto = require('./Produto');

    let subtotal = 0;
    const itensProcessados = [];

    for (const item of itens) {
      const produto = await Produto.findById(item.produto);

      if (!produto) {
        throw new Error(`Produto ID ${item.produto} não encontrado`);
      }

      const quantidade = Number(item.quantidade) || 1;
      const preco = Number(produto.preco) || 0;
      const subItem = preco * quantidade;

      subtotal += subItem;

      itensProcessados.push({
        produtoId: produto.id,
        nomeProduto: produto.nome,
        medida: item.medida || 'Unidade',
        quantidade,
        precoUnitario: preco,
        subtotal: subItem,
      });
    }

    const total = subtotal + (Number(taxaEntrega) || 0);

    const contagem = get('SELECT COUNT(*) as total FROM pedidos');
    const numeroPedido = (contagem?.total || 0) + 1;

    const infoPedido = run(`
      INSERT INTO pedidos
        (
          numero_pedido,
          cliente_id,
          subtotal,
          taxa_entrega,
          total,
          forma_pagamento,
          troco,
          observacoes
        )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      numeroPedido,
      clienteId,
      subtotal,
      Number(taxaEntrega) || 0,
      total,
      formaPagamento,
      Number(troco) || 0,
      observacoes
    ]);

    const pedidoId = infoPedido.lastInsertRowid;

    for (const item of itensProcessados) {
      run(`
        INSERT INTO itens_pedido
          (
            pedido_id,
            produto_id,
            nome_produto,
            medida,
            quantidade,
            preco_unitario,
            subtotal
          )
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

    return this.findById(pedidoId);
  },

  async updateStatus(id, status) {
    await ready;

    const info = run(
      `UPDATE pedidos
       SET status = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [status, id]
    );

    return info.changes > 0 ? this.findById(id) : null;
  },

  async delete(id) {
    await ready;

    run('DELETE FROM itens_pedido WHERE pedido_id = ?', [id]);

    const info = run('DELETE FROM pedidos WHERE id = ?', [id]);

    return info.changes > 0;
  },
};

module.exports = Pedido;