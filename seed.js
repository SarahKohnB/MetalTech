//Esse arquivo é o que chamamos de Seed (Semente). 
//Em programação, um "Seeder" serve para popular o banco de dados com dados iniciais. (pesquisei essa informação no gemini)
//Imagine que você acabou de instalar o sistema e ele está vazio; este código "planta" os primeiros usuários, clientes e pizzas para que você possa testar o sistema imediatamente sem ter que cadastrar tudo na mão.

require('dotenv').config();
const { ready, run, query } = require('./src/database/sqlite');
const bcrypt = require('bcryptjs');

// Função principal que vai "semear" os dados
async function seed() {
  try {
    await ready; // Espera a conexão com o banco estar pronta
    console.log('🧹 Limpando banco...');

    // Remove todos os dados existentes para começar do zero (CUIDADO!)
    run('DELETE FROM itens_pedido');
    run('DELETE FROM pedidos');
    run('DELETE FROM produtos');
    run('DELETE FROM clientes');
    run('DELETE FROM usuarios');

    try {
      // Reinicia os contadores de ID (faz o próximo ID ser 1 novamente)
      run("DELETE FROM sqlite_sequence WHERE name IN ('itens_pedido','pedidos','produtos','clientes','usuarios')");
    } catch(_) { /* Se a tabela for nova, esse comando pode falhar silenciosamente */ }

    console.log('✅ Banco limpo');

    // Cria uma senha padrão "123456" criptografada para os usuários iniciais
    const hash = await bcrypt.hash('123456', 10);

    // --- CRIAÇÃO DE USUÁRIOS (EQUIPE) ---
    run('INSERT INTO usuarios (nome, email, senha, perfil) VALUES (?, ?, ?, ?)',
      ['Administrador Master', 'admin@metaltech.com', hash, 'Administrador']);
    run('INSERT INTO usuarios (nome, email, senha, perfil) VALUES (?, ?, ?, ?)',
      ['Atendente Oficial', 'atendente@metaltech.com', hash, 'Atendente']);
    run('INSERT INTO usuarios (nome, email, senha, perfil) VALUES (?, ?, ?, ?)',
      ['Estoque Oficial', 'estoque@metaltech.com', hash, 'Estoque']);

    console.log('✅ 3 usuários criados');

    // --- CRIAÇÃO DE CLIENTES ---
    // Lista de clientes fictícios com endereços e observações
    const clientes = [
      ['Lucas Ferreira Santos',   '11991234501', {rua:'Rua das Academias',numero:'142',bairro:'Vila Madalena',cidade:'São Paulo',cep:'05435-000'}, 'Cliente busca chapas de aço'],
      ['Camila Rodrigues Lima',   '11991234502', {rua:'Av. Paulista',numero:'900',bairro:'Bela Vista',cidade:'São Paulo',cep:'01310-100'}, ''],
      ['Rafael Oliveira Costa',   '11991234503', {rua:'Rua Oscar Freire',numero:'55',bairro:'Jardins',cidade:'São Paulo',cep:'01426-001'}, 'Prefere entrega após 18h'],
      ['Isabelly Sofia Domingues',   '11991234504', {rua:'Rua Consolação',numero:'310',bairro:'Consolação',cidade:'São Paulo',cep:'01302-000'}, ''],
      ['Bruno Almeida Pereira',   '11991234505', {rua:'Rua Augusta',numero:'780',bairro:'Cerqueira César',cidade:'São Paulo',cep:'01304-001'}, 'Prefere pagamento por PIX'],
      ['Juliana Nascimento Dias', '11991234506', {rua:'Rua Haddock Lobo',numero:'220',bairro:'Jardim América',cidade:'São Paulo',cep:'01414-000'}, ''],
      ['Thiago Carvalho Mendes',  '11991234507', {rua:'Alameda Santos',numero:'415',bairro:'Cerqueira César',cidade:'São Paulo',cep:'01419-000'}, 'Cliente VIP'],
      ['Fernanda Rodrigues Ferreira',  '11991234508', {rua:'Rua Fradique Coutinho',numero:'88',bairro:'Pinheiros',cidade:'São Paulo',cep:'05416-010'}, ''],
      ['Diego Barbosa Freitas',   '11991234509', {rua:'Rua Wisard',numero:'305',bairro:'Vila Madalena',cidade:'São Paulo',cep:'05434-080'}, 'Solicita orçamento antes da entrega'],
      ['Larissa Teixeira Moura',  '11991234510', {rua:'Rua Amauri',numero:'60',bairro:'Itaim Bibi',cidade:'São Paulo',cep:'01448-000'}, ''],
      ['Matheus Cardoso Nunes',   '11991234511', {rua:'Rua Pamplona',numero:'1200',bairro:'Jardim Paulista',cidade:'São Paulo',cep:'01405-002'}, ''],
      ['Sarah Kohn Baldoini',   '11991234512', {rua:'Av. Brigadeiro Faria Lima',numero:'2000',bairro:'Pinheiros',cidade:'São Paulo',cep:'01452-000'}, 'Prefere pagamento em dinheiro'],
      ['Anderson Silva Campos',   '11991234513', {rua:'Rua Estados Unidos',numero:'175',bairro:'Jardim América',cidade:'São Paulo',cep:'01427-000'}, ''],
      ['Natália Araújo Castro',   '11991234514', {rua:'Rua José Maria Lisboa',numero:'530',bairro:'Jardim Paulista',cidade:'São Paulo',cep:'01423-000'}, 'Cliente empresarial'],
      ['Felipe Cunha Rezende',    '11991234515', {rua:'Rua Ministro Rocha Azevedo',numero:'72',bairro:'Cerqueira César',cidade:'São Paulo',cep:'01410-001'}, ''],
      ['Vanessa Lopes Guimarães', '11991234516', {rua:'Rua Bela Cintra',numero:'450',bairro:'Consolação',cidade:'São Paulo',cep:'01415-000'}, 'Entrega em obra'],
      ['Gustavo Pires Andrade',   '11991234517', {rua:'Rua da Consolação',numero:'1800',bairro:'Higienópolis',cidade:'São Paulo',cep:'01301-100'}, ''],
      ['Aline Moreira Fonseca',   '11991234518', {rua:'Av. Higienópolis',numero:'618',bairro:'Higienópolis',cidade:'São Paulo',cep:'01238-001'}, 'Cliente frequente'],
      ['Rodrigo Tavares Monteiro','11991234519', {rua:'Rua Itapeva',numero:'286',bairro:'Bela Vista',cidade:'São Paulo',cep:'01332-000'}, ''],
      ['Carolina Batista Pinto',  '11991234520', {rua:'Rua Peixoto Gomide',numero:'1100',bairro:'Jardim Paulista',cidade:'São Paulo',cep:'01409-001'}, 'Pedido para manutenção industrial'],
    ];

    for (const [nome, tel, end, obs] of clientes) {
      run('INSERT INTO clientes (nome, telefone, endereco, observacoes) VALUES (?, ?, ?, ?)',
        [nome, tel, JSON.stringify(end), obs]); // O endereço vira texto (JSON) para caber no banco
    }
    console.log('✅ 20 clientes criados');

    // --- CRIAÇÃO DO CATÁLOGO (PRODUTOS) ---
    // Lista com: Nome, Descrição, Materiais, Preços (P, M, G) e Categoria
    const produtos = [
  {
    nome: 'Chapa de Aço',
    descricao: 'Chapa resistente para estruturas metálicas',
    material: 'Aço carbono',
    preco: 199.90,
    categoria: 'Estruturas'
  },

  {
    nome: 'Tubo Galvanizado',
    descricao: 'Tubo metálico galvanizado industrial',
    material: 'Aço galvanizado',
    preco: 89.50,
    categoria: 'Tubulações'
  },

  {
    nome: 'Barra de Alumínio',
    descricao: 'Barra leve para acabamento industrial',
    material: 'Alumínio',
    preco: 59.90,
    categoria: 'Acabamentos'
  },

  {
    nome: 'Perfil Metálico U',
    descricao: 'Perfil estrutural reforçado',
    material: 'Aço estrutural',
    preco: 149.90,
    categoria: 'Perfis'
  }
];

    for (const [nome, desc, ing, preco, cat] of pizzas) {
      run('INSERT INTO produtos (nome, descricao, material, preco, categoria) VALUES (?, ?, ?, ?, ?)',
        [nome, desc, ing, JSON.stringify(preco), cat]);
    }
    console.log('✅ 20 pizzas criadas');

    console.log('======================================');
    console.log('🔥 SEED EXECUTADO COM SUCESSO!');
    console.log('======================================');
    console.log('Login: admin@pizzaria.com | Senha: 123456');
    console.log('======================================');
    
    process.exit(0); // Finaliza o script com sucesso
  } catch (err) {
    console.error('❌ ERRO NO SEED:', err);
    process.exit(1); // Finaliza com erro
  }
}

// Chama a função para rodar
seed();
