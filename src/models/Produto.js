const { ready, query, run, get } = require('../database/sqlite');

function formatarProduto(row) {
  if (!row) return null;

  return {
    _id: row.id,
    id: row.id,
    nome: row.nome,
    descricao: row.descricao,
    material: row.material,
    preco: row.preco,
    disponivel: row.disponivel === 1,
    categoria: row.categoria,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const Produto = {
  async findAll() {
    await ready;
    return query('SELECT * FROM produtos ORDER BY categoria, nome')
      .map(formatarProduto);
  },

  async findById(id) {
    await ready;
    return formatarProduto(
      get('SELECT * FROM produtos WHERE id = ?', [id])
    );
  },

  async create({
    nome,
    descricao = '',
    material,
    preco = 0,
    disponivel = true,
    categoria = 'metal'
  }) {
    await ready;

    const info = run(
      `INSERT INTO produtos 
      (nome, descricao, material, preco, disponivel, categoria) 
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        nome.trim(),
        descricao.trim(),
        material.trim(),
        Number(preco),
        disponivel ? 1 : 0,
        categoria
      ]
    );

    return this.findById(info.lastInsertRowid);
  },

  async update(id, {
    nome,
    descricao,
    material,
    preco,
    disponivel,
    categoria
  }) {
    await ready;

    const atual = get('SELECT * FROM produtos WHERE id = ?', [id]);
    if (!atual) return null;

    run(
      `UPDATE produtos SET
        nome = ?,
        descricao = ?,
        material = ?,
        preco = ?,
        disponivel = ?,
        categoria = ?,
        updated_at = datetime('now')
      WHERE id = ?`,
      [
        nome ?? atual.nome,
        descricao ?? atual.descricao,
        material ?? atual.material,
        preco ?? atual.preco,
        disponivel === undefined
          ? atual.disponivel
          : disponivel ? 1 : 0,
        categoria ?? atual.categoria,
        id
      ]
    );

    return this.findById(id);
  },

  async delete(id) {
    await ready;

    const existe = get('SELECT * FROM produtos WHERE id = ?', [id]);
    if (!existe) return false;

    run('DELETE FROM produtos WHERE id = ?', [id]);
    return true;
  }
};

module.exports = Produto;