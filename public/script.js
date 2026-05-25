const API = '/api';

let cProdutos   = [];
let cClientes = [];

let TOKEN          = localStorage.getItem('pz_token') || '';
let USUARIO_LOGADO = JSON.parse(localStorage.getItem('pz_usuario') || 'null');
let setorEmFechamento = null;

async function fazerLogin() {
  const email = document.getElementById('l-email').value.trim();
  const senha = document.getElementById('l-senha').value;
  const btn   = document.getElementById('btn-login');
  const erro  = document.getElementById('login-erro');

  if (!email || !senha) {
    erro.style.display = 'block';
    erro.textContent   = 'Preencha e-mail e senha.';
    return;
  }

  btn.disabled    = true;
  btn.textContent = 'Entrando...';
  erro.style.display = 'none';

  try {
    const res  = await fetch(API + '/auth/login', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, senha }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.erro || 'Credenciais inválidas');

    TOKEN = data.token;
    USUARIO_LOGADO = data.usuario;
    localStorage.setItem('pz_token', TOKEN);
    localStorage.setItem('pz_usuario', JSON.stringify(data.usuario));

    aplicarPerfil(data.usuario);
    document.body.classList.add('logado');

  } catch (e) {
    erro.style.display = 'block';
    erro.textContent   = e.message;
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Entrar';
  }
}

function sair() {
  TOKEN = '';
  USUARIO_LOGADO = null;
  localStorage.removeItem('pz_token');
  localStorage.removeItem('pz_usuario');
  document.body.classList.remove('logado');
  document.getElementById('l-senha').value = '';
}

if (TOKEN && USUARIO_LOGADO) {
  aplicarPerfil(USUARIO_LOGADO);
  document.body.classList.add('logado');
}

function toast(msg, tipo = 'ok') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className   = `show ${tipo}`;
  setTimeout(() => el.className = '', 3000);
}

function abrir(id)  { document.getElementById(id).classList.add('open'); }
function fechar(id) { document.getElementById(id).classList.remove('open'); }

document.querySelectorAll('.modal-bg').forEach(bg =>
  bg.addEventListener('click', e => { if (e.target === bg) bg.classList.remove('open'); })
);

function R$(v) {
  return 'R$ ' + Number(v || 0).toFixed(2).replace('.', ',');
}

function badge(s) {
  const r = {
    recebido:     '📥 Recebido',
    em_preparo:   '🏭 Em Produção',
    saiu_entrega: '🛵 Saiu p/ Entrega',
    entregue:     '✅ Entregue',
    cancelado:    '❌ Cancelado',
  };
  return `<span class="badge b-${s}">${r[s] || s}</span>`;
}

async function api(method, url, body) {
  const opts = {
    method,
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${TOKEN}`,
    },
  };
  if (body) opts.body = JSON.stringify(body);

  const res  = await fetch(API + url, opts);
  const data = await res.json();

  if (res.status === 401) { sair(); throw new Error('Sessão expirada'); }
  if (!res.ok) throw new Error(data.erro || 'Erro na requisição');
  return data;
}

function aplicarPerfil(usuario) {
  document.getElementById('sb-nome').textContent   = usuario.nome;
  document.getElementById('sb-perfil').textContent = usuario.perfil;

  const perfil  = usuario.perfil;
  const isAdmin = perfil === 'Administrador';
  const isGar   = perfil === 'Funcionário';

  function show(id, visible, type = 'flex') {
    const el = document.getElementById(id);
    if (el) el.style.display = visible ? type : 'none';
  }

  function showEl(el, visible, type = 'flex') {
  if (el) el.style.display = visible ? type : 'none';
}

show('menu-usuarios', isAdmin, 'block');
show('btn-usuarios', isAdmin, 'flex');

showEl(document.querySelector('[onclick*="clientes"]'), true);
showEl(document.querySelector('[onclick*="pedidos"]'), true);
showEl(document.querySelector('[onclick*="dashboard"]'), true);
showEl(document.querySelector('.sb-group'), true, 'block');

const labelProdutos = document.getElementById('nav-produtos-label');
if (labelProdutos) labelProdutos.textContent = 'Produtos';

const tituloProdutos = document.getElementById('pg-produtos-titulo');
const subProdutos = document.getElementById('pg-produtos-sub');

if (tituloProdutos) tituloProdutos.textContent = 'Produtos';
if (subProdutos) subProdutos.textContent = 'Gerencie o catálogo';

show('btn-novo-produto', true, 'inline-flex');

show('stat-fat', true, 'block');
show('stat-cli', true, 'block');

ir('dashboard', document.querySelector('[onclick*="dashboard"]'));
}

function ir(pg, btn) {
  const perfil = document.getElementById('sb-perfil').textContent;

  if (pg === 'usuarios' && perfil !== 'Administrador') {
    toast('Acesso restrito a Administradores', 'err');
    return;
  }

  document.querySelectorAll('.secao')
    .forEach(s => s.classList.remove('ativa'));

  document.querySelectorAll('.nav-btn')
    .forEach(b => b.classList.remove('ativo'));

  document.getElementById('pg-' + pg)
    .classList.add('ativa');

  if (btn) btn.classList.add('ativo');

  const loaders = {
    dashboard: carregarDashboard,
    pedidos: carregarPedidos,
    produtos: carregarProdutos,
    clientes: carregarClientes,
    usuarios: carregarUsuarios,
  };

  if (loaders[pg]) loaders[pg]();
}

async function carregarDashboard() {
  const h = new Date().getHours();
  const s = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';

  document.getElementById('dash-sub').textContent = `${s}! Aqui está o resumo.`;

  try {
    const [produtos, clientes, pedidos] = await Promise.all([
      api('GET', '/produtos'),
      api('GET', '/clientes'),
      api('GET', '/pedidos'),
    ]);

    cProdutos = produtos;
    cClientes = clientes;

    const pedidosNaoCancelados = pedidos.filter(p => p.status !== 'cancelado');

    const faturamento = pedidosNaoCancelados
      .reduce((acc, p) => acc + (Number(p.total) || 0), 0);

    const pedidosAtivos = pedidos.filter(p =>
      !['entregue', 'cancelado'].includes(p.status)
    ).length;

    document.getElementById('s-piz').textContent = produtos.length;
    document.getElementById('s-cli').textContent = clientes.length;
    document.getElementById('s-ped').textContent = pedidos.length;
    document.getElementById('s-ent').textContent = pedidosAtivos;
    document.getElementById('s-fat').textContent = R$(faturamento);
    document.getElementById('s-ped-sub').textContent = `${pedidosAtivos} pendente(s)`;

    const elP = document.getElementById('dash-pedidos');

    elP.innerHTML = pedidos.slice(0, 8).map(p => `
      <div class="mini-row">
        <div>
          <div class="mn">
            #${String(p.numeroPedido || '?').padStart(3, '0')} · ${p.cliente?.nome || '—'}
          </div>
          <div class="mc">
            ${new Date(p.createdAt).toLocaleString('pt-BR')}
          </div>
        </div>

        <div style="text-align:right">
          ${badge(p.status)}<br>
          <small style="color:var(--muted)">
            ${p.status === 'cancelado' ? 'Não contabilizado' : R$(p.total)}
          </small>
        </div>
      </div>
    `).join('') || '<div class="empty"><span class="ei">📋</span>Nenhum pedido registrado</div>';

    const elC = document.getElementById('dash-catalogo');

    elC.innerHTML = produtos
      .filter(p => p.disponivel)
      .slice(0, 8)
      .map(p => `
        <div class="mini-row">
          <div style="display:flex;align-items:center;gap:10px">
            <img
              src="${p.imagem || 'images/produtos/chapa_lisa.jpg'}"
              style="width:46px;height:46px;object-fit:cover;border-radius:12px;border:2px solid #f6bd16"
              onerror="this.src='images/produtos/chapa_lisa.jpg'"
            >

            <div>
              <strong>${p.nome}</strong><br>
              <small style="color:var(--muted)">
                ${p.material || 'Material industrial'}
              </small>
            </div>
          </div>

          <small style="color:var(--muted)">
            ${R$(p.preco)}
          </small>
        </div>
      `).join('') || '<div class="empty"><span class="ei">⛓️‍💥</span>Nenhum produto</div>';

  } catch (e) {
    toast('Erro dashboard: ' + e.message, 'err');
  }
}

async function carregarProdutos() {
  const el = document.getElementById('tbl-produtos');
  el.innerHTML = '<div class="spin-wrap"><div class="spin"></div> Carregando...</div>';

  try {
    cProdutos = await api('GET', '/produtos');

    if (!cProdutos.length) {
      el.innerHTML = '<div class="empty"><span class="ei">⛓️‍💥</span>Nenhum produto</div>';
      return;
    }

    el.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Produto</th>
            <th>Categoria</th>
            <th>Material</th>
            <th>Preço</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>

        <tbody>
          ${cProdutos.map(p => `
            <tr>
              <td>
                <div style="display:flex;align-items:center;gap:12px">
                  <img 
                    src="${p.imagem || 'images/produtos/chapa_lisa.jpg'}"
                    style="width:58px;height:58px;object-fit:cover;border-radius:14px;border:2px solid #f6bd16"
                    onerror="this.src='images/produtos/chapa_lisa.jpg'"
                  >

                  <div>
                    <strong>${p.nome}</strong><br>
                    <small style="color:var(--muted)">${p.descricao || ''}</small>
                  </div>
                </div>
              </td>

              <td><span class="badge b-cat">${p.categoria || 'metal'}</span></td>

              <td style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                ${p.material}
              </td>

              <td><strong style="color:var(--gold)">${R$(p.preco)}</strong></td>

              <td>
                <span class="badge ${p.disponivel ? 'b-on' : 'b-off'}">
                  ${p.disponivel ? '✅ Disponível' : '❌ Off'}
                </span>
              </td>

              <td>
                <div style="display:flex;gap:5px">
                  <button class="btn btn-ghost btn-sm" onclick="editarProduto('${p._id}')">✏️</button>
                  <button class="btn btn-danger btn-sm" onclick="deletarProduto('${p._id}','${p.nome}')">🗑️</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;
  } catch (e) {
    el.innerHTML = `<div class="empty" style="color:var(--red)">${e.message}</div>`;
  }
}

function abrirProduto() {
  document.getElementById('m-produto-t').textContent = 'Novo Produto';

  ['p-id', 'p-nome', 'p-material', 'p-desc', 'p-preco', 'p-img'].forEach(id => {
    const campo = document.getElementById(id);
    if (campo) campo.value = '';
  });

  document.getElementById('p-cat').value = 'Chapas';
  document.getElementById('p-disp').value = 'true';
  document.getElementById('p-img').value = 'images/produtos/chapa_lisa.jpg';

  abrir('m-produto');
}

function editarProduto(id) {
  const p = cProdutos.find(x => String(x._id) === String(id));
  if (!p) return;

  document.getElementById('m-produto-t').textContent = 'Editar Produto';

  document.getElementById('p-id').value = p._id;
  document.getElementById('p-nome').value = p.nome;
  document.getElementById('p-material').value = p.material || '';
  document.getElementById('p-desc').value = p.descricao || '';
  document.getElementById('p-preco').value = p.preco || '';
  document.getElementById('p-img').value = p.imagem || 'images/produtos/chapa_lisa.jpg';
  document.getElementById('p-cat').value = p.categoria || 'metal';
  document.getElementById('p-disp').value = String(p.disponivel);

  abrir('m-produto');
}

async function salvarProduto() {
  const id = document.getElementById('p-id').value;
  const nome = document.getElementById('p-nome').value.trim();
  const material = document.getElementById('p-material').value.trim();

  if (!nome || !material) {
    toast('Nome e material são obrigatórios', 'err');
    return;
  }

  const d = {
    nome: nome,
    material: material,
    descricao: document.getElementById('p-desc').value.trim(),
    preco: parseFloat(document.getElementById('p-preco').value) || 0,
    imagem: document.getElementById('p-img').value,
    categoria: document.getElementById('p-cat').value,
    disponivel: document.getElementById('p-disp').value === 'true',
  };

  try {
    if (id) {
      await api('PUT', '/produtos/' + id, d);
    } else {
      await api('POST', '/produtos', d);
    }

    toast(id ? 'Produto atualizado!' : 'Produto criado!');
    fechar('m-produto');
    carregarProdutos();

  } catch (e) {
    toast('Erro: ' + e.message, 'err');
  }
}

async function deletarProduto(id, nome) {
  if (!confirm(`Deletar "${nome}"?`)) return;
  try {
    await api('DELETE', '/produtos/' + id);
    toast('Produto deletado!');
    carregarProdutos();
  } catch (e) { toast('Erro: ' + e.message, 'err'); }
}

async function carregarClientes(busca = '') {
  const el = document.getElementById('tbl-clientes');
  el.innerHTML = '<div class="spin-wrap"><div class="spin"></div> Carregando...</div>';
  try {
    const url = busca ? `/clientes?busca=${encodeURIComponent(busca)}` : '/clientes';
    cClientes = await api('GET', url);

    if (!cClientes.length) {
      el.innerHTML = '<div class="empty"><span class="ei">👥</span>Nenhum cliente</div>';
      return;
    }

    el.innerHTML = `
      <table>
        <thead><tr><th>Nome</th><th>Telefone</th><th>Endereço</th><th>Obs</th><th>Ações</th></tr></thead>
        <tbody>
          ${cClientes.map(c => `
            <tr>
              <td><strong>${c.nome}</strong></td>
              <td>${c.telefone}</td>
              <td style="font-size:.76rem;color:var(--muted)">${[c.endereco?.rua, c.endereco?.numero, c.endereco?.bairro, c.endereco?.cidade].filter(Boolean).join(', ') || '—'}</td>
              <td style="font-size:.76rem;color:var(--muted)">${c.observacoes || '—'}</td>
              <td><div style="display:flex;gap:5px"><button class="btn btn-ghost btn-sm" onclick="editarCliente('${c._id}')">✏️</button><button class="btn btn-danger btn-sm" onclick="deletarCliente('${c._id}','${c.nome}')">🗑️</button></div></td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  } catch (e) {
    el.innerHTML = `<div class="empty" style="color:var(--red)">${e.message}</div>`;
  }
}

let _t;
function buscarCli(v) {
  clearTimeout(_t);
  _t = setTimeout(() => carregarClientes(v), 400);
}

function abrirCliente() {
  document.getElementById('m-cli-t').textContent = 'Novo Cliente';
  ['c-id','c-nome','c-tel','c-rua','c-num','c-bairro','c-cidade','c-cep','c-comp','c-obs']
    .forEach(id => { const e = document.getElementById(id); if (e) e.value = ''; });
  abrir('m-cliente');
}

function editarCliente(id) {
  const c = cClientes.find(x => x._id === id);
  if (!c) return;
  document.getElementById('m-cli-t').textContent    = 'Editar Cliente';
  document.getElementById('c-id').value     = c._id;
  document.getElementById('c-nome').value   = c.nome;
  document.getElementById('c-tel').value    = c.telefone;
  document.getElementById('c-rua').value    = c.endereco?.rua || '';
  document.getElementById('c-num').value    = c.endereco?.numero || '';
  document.getElementById('c-bairro').value = c.endereco?.bairro || '';
  document.getElementById('c-cidade').value = c.endereco?.cidade || '';
  document.getElementById('c-cep').value    = c.endereco?.cep || '';
  document.getElementById('c-comp').value   = c.endereco?.complemento || '';
  document.getElementById('c-obs').value    = c.observacoes || '';
  abrir('m-cliente');
}

async function salvarCliente() {
  const id   = document.getElementById('c-id').value;
  const nome = document.getElementById('c-nome').value.trim();
  const tel  = document.getElementById('c-tel').value.trim();
  if (!nome || !tel) { toast('Nome e telefone são obrigatórios', 'err'); return; }

  const d = {
    nome,
    telefone: tel,
    endereco: {
      rua:         document.getElementById('c-rua').value.trim(),
      numero:      document.getElementById('c-num').value.trim(),
      bairro:      document.getElementById('c-bairro').value.trim(),
      cidade:      document.getElementById('c-cidade').value.trim(),
      cep:         document.getElementById('c-cep').value.trim(),
      complemento: document.getElementById('c-comp').value.trim(),
    },
    observacoes: document.getElementById('c-obs').value.trim(),
  };

  try {
    id ? await api('PUT', '/clientes/' + id, d) : await api('POST', '/clientes', d);
    toast(id ? 'Cliente atualizado!' : 'Cliente cadastrado!');
    fechar('m-cliente');
    carregarClientes();
  } catch (e) { toast('Erro: ' + e.message, 'err'); }
}

async function deletarCliente(id, nome) {
  if (!confirm(`Deletar "${nome}"?`)) return;
  try {
    await api('DELETE', '/clientes/' + id);
    toast('Cliente deletado!');
    carregarClientes();
  } catch (e) { toast('Erro: ' + e.message, 'err'); }
}

async function carregarPedidos() {
  const el = document.getElementById('tbl-pedidos');

  el.innerHTML =
    '<div class="spin-wrap"><div class="spin"></div> Carregando...</div>';

  try {

    const pedidos = await api('GET', '/pedidos');

    const filtro =
      document.getElementById('filtro-status')?.value || '';

    let lista = pedidos;

    if (filtro) {
      lista = pedidos.filter(p => p.status === filtro);
    }

    if (!lista.length) {
      el.innerHTML =
        '<div class="empty"><span class="ei">📋</span>Nenhum pedido</div>';
      return;
    }
    el.innerHTML = `
      <table>
        <thead>
          <tr><th>#</th><th>Cliente</th><th>Itens</th><th>Subtotal</th><th>Entrega</th><th>Total</th><th>Pagamento</th><th>Status</th><th>Data</th><th>Ações</th>
        </thead>
        <tbody>
          ${lista.map(p => `
            <tr>
              <td><strong style="color:var(--red)">#${String(p.numeroPedido||'?').padStart(3,'0')}</strong></td>
              <td><strong>${p.cliente?.nome || '—'}</strong><br><small style="color:var(--muted)">${p.cliente?.telefone || ''}</small></td>
              <td style="font-size:.76rem">${p.itens.map(it => `${it.quantidade}x ${it.nomeProduto || '?'} (${it.medida})`).join('<br>')}</td>
              <td>${R$(p.subtotal)}</td><td>${R$(p.taxaEntrega)}</td>
              <td><strong style="color:var(--gold)">${R$(p.total)}</strong></td>
              <td style="font-size:.76rem">${(p.formaPagamento || '—').replace('_', ' ')}</td>
              <td>${badge(p.status)}</td>
              <td style="font-size:.7rem;color:var(--muted)">${new Date(p.createdAt).toLocaleString('pt-BR')}</td>
              <td><div style="display:flex;gap:5px"><button class="btn btn-blue btn-sm" onclick="abrirStatus('${p._id}','${p.status}')">📝</button><button class="btn btn-danger btn-sm" onclick="deletarPedido('${p._id}')">🗑️</button></div></td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  } catch (e) {
    el.innerHTML = `<div class="empty" style="color:var(--red)">${e.message}</div>`;
  }
}

async function abrirPedido() {
  try {
    cProdutos = await api('GET', '/produtos');
    cClientes = await api('GET', '/clientes');
  } catch (e) {
    toast('Erro ao carregar dados', 'err');
    return;
  }

  document.getElementById('ped-cli').innerHTML =
    '<option value="">— Selecione o cliente —</option>' +
    cClientes.map(c => `<option value="${c._id}">${c.nome} · ${c.telefone}</option>`).join('');

  document.getElementById('itens-lista').innerHTML = '';
  document.getElementById('ped-taxa').value = '0';
  document.getElementById('ped-obs').value = '';
  document.getElementById('ped-pag').value = 'pix';
  document.getElementById('ped-sub').textContent = 'R$ 0,00';
  document.getElementById('ped-tot').textContent = 'R$ 0,00';
  document.getElementById('wrap-troco').style.display = 'none';

  addItem();
  abrir('m-pedido');
}

function addItem() {
  const d = document.createElement('div');
  d.className = 'item-row';

  const opts = cProdutos
    .map(p => `<option value="${p._id}" data-preco="${p.preco || 0}">${p.nome}</option>`)
    .join('');

  d.innerHTML = `
    <select class="ip" onchange="recalc()">
      <option value="">Selecione...</option>
      ${opts}
    </select>

    <input class="iq" type="number" value="1" min="1" oninput="recalc()">

    <div class="is" style="font-size:.8rem;text-align:right;color:var(--muted)">R$ 0,00</div>

    <button class="btn-rm" onclick="this.parentElement.remove(); recalc()">×</button>
  `;

  document.getElementById('itens-lista').appendChild(d);
}

function recalc() {
  let sub = 0;
  document.querySelectorAll('#itens-lista .item-row').forEach(row => {
    const sel = row.querySelector('.ip');
    const qtd = parseInt(row.querySelector('.iq').value) || 0;
    const opt = sel.options[sel.selectedIndex];
    const pc  = parseFloat(opt?.dataset?.preco || 0);
    const s   = pc * qtd;
    sub += s;
    row.querySelector('.is').textContent = R$(s);
  });

  const taxa = parseFloat(document.getElementById('ped-taxa').value) || 0;
  document.getElementById('ped-sub').textContent = R$(sub);
  document.getElementById('ped-tot').textContent = R$(sub + taxa);
}

function toggleTroco() {
  const pag = document.getElementById('ped-pag').value;
  document.getElementById('wrap-troco').style.display =
    pag === 'dinheiro' ? 'block' : 'none';
}

async function salvarPedido() {
  const cliId = document.getElementById('ped-cli').value;
  if (!cliId) { toast('Selecione um cliente', 'err'); return; }

  const itens = [];
  let valido = true;
  document.querySelectorAll('#itens-lista .item-row').forEach(row => {
    const pid = row.querySelector('.ip').value;
    if (!pid) { valido = false; return; }
    itens.push({
  produto: pid,
  medida: 'Unidade',
  quantidade: parseInt(row.querySelector('.iq').value) || 1,
});
  });

  if (!valido || !itens.length) {
    toast('Adicione ao menos um item válido', 'err'); return;
  }

  try {
    await api('POST', '/pedidos', {
      cliente:        cliId,
      itens,
      taxaEntrega:    parseFloat(document.getElementById('ped-taxa').value) || 0,
      formaPagamento: document.getElementById('ped-pag').value,
      troco:          parseFloat(document.getElementById('ped-troco')?.value) || 0,
      observacoes:    document.getElementById('ped-obs').value,
    });
    toast('Pedido criado!');
    fechar('m-pedido');
    carregarPedidos();
  } catch (e) { toast('Erro: ' + e.message, 'err'); }
}

function abrirStatus(id, status) {
  document.getElementById('st-id').value  = id;
  document.getElementById('st-val').value = status;
  abrir('m-status');
}

async function salvarStatus() {
  const id     = document.getElementById('st-id').value;
  const status = document.getElementById('st-val').value;
  try {
    await api('PATCH', '/pedidos/' + id + '/status', { status });
    toast('Status atualizado!');
    fechar('m-status');
    carregarPedidos();
  } catch (e) { toast('Erro: ' + e.message, 'err'); }
}

async function deletarPedido(id) {
  if (!confirm('Deletar este pedido?')) return;
  try {
    await api('DELETE', '/pedidos/' + id);
    toast('Pedido deletado!');
    carregarPedidos();
  } catch (e) { toast('Erro: ' + e.message, 'err'); }
}

async function carregarUsuarios() {
  const el = document.getElementById('tbl-usuarios');
  el.innerHTML = '<div class="spin-wrap"><div class="spin"></div> Carregando...</div>';
  try {
    const us = await api('GET', '/usuarios');
    if (!us.length) {
      el.innerHTML = '<div class="empty"><span class="ei">🔐</span>Nenhum usuário</div>';
      return;
    }
    el.innerHTML = `
      <table>
        <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Status</th><th>Criado em</th><th>Ações</th></tr></thead>
        <tbody>
          ${us.map(u => `
            <tr>
              <td><strong>${u.nome}</strong></td>
              <td>${u.email}</td>
              <td><span class="badge ${u.perfil === 'Administrador' ? 'b-admin' : 'b-atend'}">${u.perfil}</span></td>
              <td><span class="badge ${u.ativo ? 'b-on' : 'b-off'}">${u.ativo ? 'Ativo' : 'Inativo'}</span></td>
              <td style="font-size:.73rem;color:var(--muted)">${new Date(u.createdAt).toLocaleDateString('pt-BR')}</td>
              <td><button class="btn btn-danger btn-sm" onclick="deletarUsuario('${u._id}','${u.nome}')">🗑️</button></td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  } catch (e) {
    el.innerHTML = `<div class="empty" style="color:var(--red)">${e.message}</div>`;
  }
}

function abrirUsuario() {
  ['u-nome','u-email','u-senha'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('u-perfil').value = 'Atendente';
  abrir('m-usuario');
}

async function salvarUsuario() {
  const nome  = document.getElementById('u-nome').value.trim();
  const email = document.getElementById('u-email').value.trim();
  const senha = document.getElementById('u-senha').value;
  if (!nome || !email || !senha) { toast('Preencha todos os campos', 'err'); return; }

  try {
    await api('POST', '/usuarios', {
      nome, email, senha,
      perfil: document.getElementById('u-perfil').value,
    });
    toast('Usuário criado!');
    fechar('m-usuario');
    carregarUsuarios();
  } catch (e) { toast('Erro: ' + e.message, 'err'); }
}

async function deletarUsuario(id, nome) {
  if (!confirm(`Deletar "${nome}"?`)) return;
  try {
    await api('DELETE', '/usuarios/' + id);
    toast('Usuário deletado!');
    carregarUsuarios();
  } catch (e) { toast('Erro: ' + e.message, 'err'); }
}
