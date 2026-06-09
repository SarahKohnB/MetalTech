//Esse código é o Router (ou Roteador). 
//Ele funciona como a "recepção" ou o "garçom" da API: ele recebe os pedidos que vêm da internet (HTTP), verifica se a pessoa tem permissão para entrar e decide qual função dos arquivos anteriores (Models) deve ser executada.

const express  = require('express');
const jwt      = require('jsonwebtoken'); // Para gerar o "crachá" de acesso (Token)
const router   = express.Router();
const auth     = require('../middlewares/auth'); // O segurança que barra quem não tem Token

// Importa todos os "gerentes" (Models) de cada parte do sistema
const Usuario  = require('../models/Usuario');
const Produto = require('../models/Produto');
const Cliente  = require('../models/Cliente');
const Pedido   = require('../models/Pedido');

// --- ROTA DE LOGIN ---
router.post('/auth/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) return res.status(400).json({ erro: 'E-mail e senha são obrigatórios' });

    // 1. Procura o usuário pelo e-mail
    const usuario = await Usuario.findByEmail(email);
    if (!usuario) return res.status(401).json({ erro: 'Credenciais inválidas' });

    // 2. Verifica se a senha digitada bate com a do banco
    const ok = await Usuario.verificarSenha(senha, usuario.senha);
    if (!ok) return res.status(401).json({ erro: 'Credenciais inválidas' });

    // 3. Se tudo estiver certo, gera um Token (crachá) que vale por 8 horas
    const token = jwt.sign(
      { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ token, usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil } });
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

// --- ROTAS DE PRODUTOS ---
// O 'auth' no meio significa: "Só passa por aqui se estiver logado"

router.get('/produtos', auth, async (req, res) => {
  try { res.json(await Produto.findAll()); } // Lista todas
  catch (e) { res.status(500).json({ erro: e.message }); }
});

router.get('/produtos/:id', auth, async (req, res) => {
  try {
    const p = await Produto.findById(req.params.id); // Busca uma específica pelo ID na URL
    if (!p) return res.status(404).json({ erro: 'Produto não encontrado' });
    res.json(p);
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

router.post('/produtos', auth, async (req, res) => {
  try {
   if (!req.body.nome || !req.body.material)
  return res.status(400).json({ erro: 'Nome e material são obrigatórios' });
    res.status(201).json(await Produto.create(req.body)); // Cria novo Produto
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

router.put('/produtos/:id', auth, async (req, res) => {
  try {
    const p = await Produto.update(req.params.id, req.body); // Atualiza dados dos produtos
    if (!p) return res.status(404).json({ erro: 'Produto não encontrado' });
    res.json(p);
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

router.delete('/produtos/:id', auth, async (req, res) => {
  try {
    const ok = await Produto.delete(req.params.id); // Deleta o produto
    if (!ok) return res.status(404).json({ erro: 'Produto não encontrado' });
    res.json({ mensagem: 'Produto deletado' });
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

// --- ROTAS DE CLIENTES ---

router.get('/clientes', auth, async (req, res) => {
  try { res.json(await Cliente.findAll(req.query.busca)); }
  catch (e) { res.status(500).json({ erro: e.message }); }
});

router.post('/clientes', auth, async (req, res) => {
  try {
    if (!req.body.nome || !req.body.telefone)
      return res.status(400).json({ erro: 'Nome e telefone são obrigatórios' });
    res.status(201).json(await Cliente.create(req.body));
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

router.put('/clientes/:id', auth, async (req, res) => {
  try {
    const c = await Cliente.update(req.params.id, req.body);
    if (!c) return res.status(404).json({ erro: 'Cliente não encontrado' });
    res.json(c);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

router.delete('/clientes/:id', auth, async (req, res) => {
  try {
    const ok = await Cliente.delete(req.params.id);
    if (!ok) return res.status(404).json({ erro: 'Cliente não encontrado' });
    res.json({ mensagem: 'Cliente deletado' });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// --- ROTAS DE PEDIDOS ---

router.get('/pedidos', auth, async (req, res) => {
  try {
    const filtros = {};
    if (req.query.garcom) filtros.garcomId = req.query.garcom; // Filtra se vier "?garcom=1" na URL
    res.json(await Pedido.findAll(filtros));
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

router.post('/pedidos', auth, async (req, res) => {
  try {
    const { cliente, itens, formaPagamento } = req.body;
    if (!cliente || !itens?.length || !formaPagamento)
      return res.status(400).json({ erro: 'cliente, itens e formaPagamento são obrigatórios' });

    const novo = await Pedido.create({
      clienteId:      cliente,
      itens,
      taxaEntrega:    req.body.taxaEntrega,
      formaPagamento,
      troco:          req.body.troco,
      observacoes:    req.body.observacoes,
      estoque:           req.body.estoque,
      origem:         req.body.origem,
      // Se não informar o garçom, pega automaticamente o ID do usuário que está logado
      garcomId:       req.body.garcom || req.usuario?.id,
    });
    res.status(201).json(novo);
  } catch (e) { res.status(400).json({ erro: e.message }); }
});

// PATCH serve para atualizações parciais (neste caso, só o status do pedido)
router.patch('/pedidos/:id/status', auth, async (req, res) => {
  try {
    const validos = ['recebido','em_preparo','saiu_entrega','entregue','cancelado'];
    if (!validos.includes(req.body.status))
      return res.status(400).json({ erro: 'Status inválido' });
    const p = await Pedido.updateStatus(req.params.id, req.body.status);
    if (!p) return res.status(404).json({ erro: 'Pedido não encontrado' });
    res.json(p);
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

// --- ROTAS DE USUÁRIOS (SÓ PARA ADMIN) ---

router.get('/usuarios', auth, async (req, res) => {
  try {
    // Verifica se o perfil do usuário logado é "Administrador"
    if (req.usuario.perfil !== 'Administrador')
      return res.status(403).json({ erro: 'Acesso restrito a Administradores' });
    res.json(await Usuario.findAll());
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

router.post('/usuarios', auth, async (req, res) => {
  try {
    if (req.usuario.perfil !== 'Administrador')
      return res.status(403).json({ erro: 'Acesso restrito a Administradores' });
    
    const { nome, email, senha, perfil } = req.body;
    if (!nome || !email || !senha)
      return res.status(400).json({ erro: 'Nome, email e senha são obrigatórios' });
    
    res.status(201).json(await Usuario.create({ nome, email, senha, perfil }));
  } catch (e) {
    // Tratamento especial para erro de e-mail duplicado
    if (e.message?.includes('UNIQUE')) return res.status(400).json({ erro: 'E-mail já cadastrado' });
    res.status(500).json({ erro: e.message });
  }
});
router.put('/usuarios/:id', auth, async (req, res) => {
  try {
    if (req.usuario.perfil !== 'Administrador')
      return res.status(403).json({ erro: 'Acesso restrito a Administradores' });

    const u = await Usuario.update(req.params.id, req.body);
    if (!u) return res.status(404).json({ erro: 'Usuário não encontrado' });

    res.json(u);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

router.delete('/usuarios/:id', auth, async (req, res) => {
  try {
    if (req.usuario.perfil !== 'Administrador')
      return res.status(403).json({ erro: 'Acesso restrito a Administradores' });

    const ok = await Usuario.delete(req.params.id);
    if (!ok) return res.status(404).json({ erro: 'Usuário não encontrado' });

    res.json({ mensagem: 'Usuário deletado' });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});
router.get('/', (req, res) => {
  res.json({
    sistema: 'FactoryTrack',
    status: 'online',
    versao: '2.0'
  });
});

module.exports = router;
