// ============================================================
// MONETO — app.js v2
// ============================================================
const API_URL = 'https://script.google.com/macros/s/AKfycbwcY9iAR3_IAl_nDiWMiJ1a68s9KETVsgAg9tkUWys-6WdfaLF9awVuqFkNDunf_5XNuQ/exec';

const Estado = {
  usuario: null, mesAtual: '',
  config:{}, categorias:[], contas:[], cartoes:[],
  transacoes:[], faturas:[], metas:[],
  dashboard: null, tipoModal:'Receita', editandoId:null,
  charts:{}
};

const CORES = ['#00E5A0','#4D9FFF','#FFB830','#FF4D6A','#7C6FFF','#F15BB5','#00BBF9','#FB5607','#8AC926','#FFBE0B'];

// ============================================================
// INIT
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
  const hoje = new Date();
  Estado.mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}`;
  atualizarLabelMes();
  mostrarLogin();
});

function mostrarLogin() {
  document.getElementById('tela-login').style.display = 'flex';
  document.getElementById('login-status').textContent = 'Verificando autenticação...';
  setTimeout(() => inicializar(), 800);
}

async function inicializar() {
  try {
    const res = await chamarAPI({ acao: 'getUsuario' });
    if (!res.autorizado) {
      document.getElementById('login-status').style.display = 'none';
      document.getElementById('login-erro').style.display = 'flex';
      return;
    }
    Estado.usuario = res;
    // Transição para o app
    document.getElementById('tela-login').style.display = 'none';
    document.getElementById('loading-screen').style.display = 'flex';

    await Promise.all([carregarConfig(), carregarCategorias(), carregarContas(), carregarCartoes()]);
    await carregarDashboard();

    const nome = res.nome || 'Usuário';
    atualizarNomeUsuario(nome);

    document.getElementById('loading-screen').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    preencherSelects();
  } catch(err) {
    console.error(err);
    // Sem auth (dev mode): mostrar app diretamente
    document.getElementById('tela-login').style.display = 'none';
    document.getElementById('loading-screen').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    atualizarNomeUsuario('Ana');
    preencherSelects();
    await carregarDashboard();
  }
}

function atualizarNomeUsuario(nome) {
  const primeiro = nome.split(' ')[0];
  document.getElementById('topbar-nome').textContent = primeiro;
  document.getElementById('topbar-avatar').textContent = primeiro[0].toUpperCase();
  document.getElementById('sidebar-nome').textContent = primeiro;
  document.getElementById('dash-nome').textContent = primeiro;
}

// ============================================================
// API
// ============================================================
async function chamarAPI(params) {
  const res = await fetch(API_URL, {
    method:'POST', headers:{'Content-Type':'text/plain'},
    body:JSON.stringify(params)
  });
  return await res.json();
}

// ============================================================
// CARREGAMENTOS
// ============================================================
async function carregarConfig() {
  Estado.config = await chamarAPI({ acao:'getConfig' });
  const si = Estado.config['SaldoInicial'];
  if (si) document.getElementById('config-saldo-inicial').value = si;
}
async function carregarCategorias() {
  Estado.categorias = await chamarAPI({ acao:'getCategorias' });
  renderizarCategoriasConfig();
}
async function carregarContas() {
  Estado.contas = await chamarAPI({ acao:'getContas' });
  renderizarContasConfig();
}
async function carregarCartoes() {
  Estado.cartoes = await chamarAPI({ acao:'getCartoes' });
  renderizarCartoes();
}
async function carregarDashboard() {
  try {
    Estado.dashboard = await chamarAPI({ acao:'getDashboard', mes:Estado.mesAtual });
    renderizarDashboard();
  } catch(e) { console.error(e); }
}
async function carregarTransacoesTipo(tipo) {
  Estado.transacoes = await chamarAPI({ acao:'getTransacoes', mes:Estado.mesAtual });
  if (tipo === 'Receita') renderizarReceitas();
  else renderizarDespesas();
}
async function carregarFaturas() {
  const filtro = document.getElementById('filtro-cartao-fatura')?.value || '';
  Estado.faturas = await chamarAPI({ acao:'getFaturas', mes:Estado.mesAtual, cartao:filtro });
  renderizarFaturas();
}
async function carregarMetas() {
  Estado.metas = await chamarAPI({ acao:'getMetas' });
  renderizarMetas();
}

// ============================================================
// NAVEGAÇÃO
// ============================================================
const TITULOS = { dashboard:'Dashboard', receitas:'Receitas', despesas:'Despesas', cartoes:'Cartões', metas:'Metas', config:'Configurações' };

function mudarAba(nome) {
  document.querySelectorAll('.aba').forEach(a => a.classList.remove('active'));
  document.querySelectorAll('.snav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`aba-${nome}`).classList.add('active');
  document.querySelector(`[data-aba="${nome}"]`).classList.add('active');
  document.getElementById('topbar-titulo').textContent = TITULOS[nome] || nome;

  if (nome === 'receitas') carregarTransacoesTipo('Receita');
  if (nome === 'despesas') carregarTransacoesTipo('Despesa');
  if (nome === 'cartoes') { carregarCartoes(); carregarFaturas(); }
  if (nome === 'metas') carregarMetas();
  if (nome === 'config') { carregarCategorias(); carregarContas(); }

  // fechar sidebar mobile
  document.getElementById('sidebar').classList.remove('open');
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

function navegarMes(dir) {
  const [ano,mes] = Estado.mesAtual.split('-').map(Number);
  const d = new Date(ano, mes-1+dir, 1);
  Estado.mesAtual = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  atualizarLabelMes();
  carregarDashboard();
  const abaAtiva = document.querySelector('.aba.active')?.id?.replace('aba-','');
  if (abaAtiva === 'receitas') carregarTransacoesTipo('Receita');
  if (abaAtiva === 'despesas') carregarTransacoesTipo('Despesa');
  if (abaAtiva === 'cartoes') carregarFaturas();
}

function atualizarLabelMes() {
  const [ano,mes] = Estado.mesAtual.split('-').map(Number);
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  document.getElementById('mes-label').textContent = `${meses[mes-1]} ${ano}`;
}

// ============================================================
// DASHBOARD
// ============================================================
function renderizarDashboard() {
  const d = Estado.dashboard;
  if (!d) return;

  const saldo = d.saldoAtual;
  const elSaldo = document.getElementById('saldo-atual');
  elSaldo.textContent = formatarMoeda(saldo);
  elSaldo.className = 'saldo-hero-valor' + (saldo < 0 ? ' negativo' : '');

  // Variação saldo
  const elVar = document.getElementById('saldo-var');
  if (d.varReceitas !== null && d.varReceitas !== undefined) {
    elVar.textContent = `↑ ${d.varReceitas}% em relação ao mês passado`;
    elVar.className = 'saldo-hero-var' + (parseFloat(d.varReceitas) < 0 ? ' neg' : '');
  } else { elVar.textContent = ''; }

  document.getElementById('total-receitas').textContent = formatarMoeda(d.totalReceitas);
  document.getElementById('total-despesas').textContent = formatarMoeda(d.totalDespesas);

  const resultado = d.totalReceitas - d.totalDespesas - d.totalFatura;
  const elRes = document.getElementById('resultado-mes');
  elRes.textContent = formatarMoeda(resultado);
  elRes.className = 'card-mini-valor ' + (resultado >= 0 ? 'azul' : 'vermelho');

  renderizarVariacaoMini('var-receitas', d.varReceitas);
  renderizarVariacaoMini('var-despesas', d.varDespesas);
  renderizarVariacaoMini('var-fatura', d.varFatura);

  // Estado do mascote
  atualizarEstado(saldo);

  // Gráficos
  renderizarGraficoCategorias(d.porCategoria || {});
  renderizarGraficoEvolucao();
  renderizarProximasTransacoes();

  // Metas no dashboard
  if (Estado.metas.length === 0) {
    chamarAPI({ acao:'getMetas' }).then(m => { Estado.metas = m; renderizarMetasDash(); });
  } else { renderizarMetasDash(); }
}

function renderizarVariacaoMini(id, valor) {
  const el = document.getElementById(id);
  if (!el) return;
  if (valor === null || valor === undefined) { el.textContent=''; return; }
  const v = parseFloat(valor);
  el.textContent = `${v>=0?'↑':'↓'} ${Math.abs(v)}% este mês`;
  el.style.color = v >= 0 ? 'var(--verde)' : 'var(--vermelho)';
}

function atualizarEstado(saldo) {
  const pos = document.getElementById('estado-positivo');
  const neg = document.getElementById('estado-negativo');
  const meta = document.getElementById('estado-meta');
  const metaConcluida = Estado.metas.some(m => parseFloat(m.valorAtual) >= parseFloat(m.valorAlvo));

  if (metaConcluida) {
    if(pos) pos.style.display='none';
    if(neg) neg.style.display='none';
    if(meta) meta.style.display='block';
  } else if (saldo < 0) {
    if(pos) pos.style.display='none';
    if(neg) neg.style.display='block';
    if(meta) meta.style.display='none';
  } else {
    if(pos) pos.style.display='block';
    if(neg) neg.style.display='none';
    if(meta) meta.style.display='none';
  }

  // Mascote hero e sidebar
  const src = saldo < 0 ? 'mascote_triste.png' : 'mascote_feliz.png';
  const mg = document.getElementById('mascote-grande');
  const ms = document.getElementById('mascote-sidebar');
  if (mg) mg.src = src;
  if (ms) ms.src = src;

  // Frase sidebar
  const frase = document.getElementById('sidebar-frase');
  if (frase) {
    if (saldo < 0) frase.textContent = 'Vamos organizar suas finanças!';
    else if (metaConcluida) frase.textContent = 'Meta alcançada! Parabéns! 🎉';
    else frase.textContent = 'Vamos juntos alcançar seus objetivos.';
  }
}

function renderizarGraficoCategorias(porCategoria) {
  const labels = Object.keys(porCategoria);
  const valores = Object.values(porCategoria);
  const cores = labels.map((_,i) => CORES[i % CORES.length]);

  const ctx = document.getElementById('chart-categorias');
  if (!ctx) return;

  if (Estado.charts.categorias) Estado.charts.categorias.destroy();

  if (labels.length === 0) {
    ctx.parentElement.innerHTML = '<div class="empty-state"><div class="empty-icon">📊</div>Sem dados neste mês</div>';
    return;
  }

  Estado.charts.categorias = new Chart(ctx, {
    type:'doughnut',
    data: { labels, datasets:[{ data:valores, backgroundColor:cores, borderWidth:0, hoverOffset:6 }] },
    options: {
      responsive:true, maintainAspectRatio:true,
      plugins:{ legend:{display:false}, tooltip:{ callbacks:{ label:(c)=>` ${c.label}: ${formatarMoeda(c.raw)}` } } },
      cutout:'68%'
    }
  });

  const leg = document.getElementById('legenda-categorias');
  if (leg) leg.innerHTML = labels.map((l,i)=>`
    <div class="legenda-item">
      <div class="legenda-dot" style="background:${cores[i]}"></div>
      <span>${l}</span>
    </div>`).join('');
}

function renderizarGraficoEvolucao() {
  const ctx = document.getElementById('chart-evolucao');
  if (!ctx) return;
  if (Estado.charts.evolucao) Estado.charts.evolucao.destroy();

  // Gerar dados simulados de evolução com base no saldo atual
  const base = parseFloat(Estado.dashboard?.saldoInicial) || 0;
  const atual = parseFloat(Estado.dashboard?.saldoAtual) || 0;
  const labels = [];
  const dados = [];
  const diasNoMes = 30;
  for (let i = 0; i <= diasNoMes; i += 3) {
    const [ano,mes] = Estado.mesAtual.split('-').map(Number);
    const d = new Date(ano, mes-1, i+1);
    labels.push(`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`);
    const progresso = i/diasNoMes;
    const ruido = (Math.random()-0.5) * (Math.abs(atual-base) * 0.15);
    dados.push(Math.round(base + (atual-base)*progresso + ruido));
  }
  dados[dados.length-1] = Math.round(atual);

  Estado.charts.evolucao = new Chart(ctx, {
    type:'line',
    data: {
      labels,
      datasets:[{
        data:dados,
        borderColor:'#00E5A0', borderWidth:2,
        backgroundColor: ctx => {
          const gradient = ctx.chart.ctx.createLinearGradient(0,0,0,200);
          gradient.addColorStop(0,'rgba(0,229,160,0.25)');
          gradient.addColorStop(1,'rgba(0,229,160,0)');
          return gradient;
        },
        fill:true, tension:0.4, pointRadius:3,
        pointBackgroundColor:'#00E5A0', pointBorderColor:'#0B0F1A', pointBorderWidth:2,
      }]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false}, tooltip:{ callbacks:{ label:(c)=>` ${formatarMoeda(c.raw)}` } } },
      scales:{
        x:{ grid:{color:'rgba(255,255,255,0.04)'}, ticks:{color:'#7A8BA8',font:{size:10}} },
        y:{ grid:{color:'rgba(255,255,255,0.04)'}, ticks:{color:'#7A8BA8',font:{size:10}, callback:(v)=>formatarMoedaCompacta(v)} }
      }
    }
  });
}

async function renderizarProximasTransacoes() {
  const container = document.getElementById('proximas-transacoes');
  if (!container) return;
  const trans = await chamarAPI({ acao:'getTransacoes', mes:Estado.mesAtual });
  const proximas = trans.filter(t => t.status === 'Pendente' || new Date(t.data) >= new Date()).slice(0,4);
  if (proximas.length === 0) {
    const todas = trans.slice(-4).reverse();
    if (todas.length === 0) { container.innerHTML='<div class="empty-state">Sem transações</div>'; return; }
    container.innerHTML = todas.map(t => criarItemProximo(t)).join('');
    return;
  }
  container.innerHTML = proximas.map(t => criarItemProximo(t)).join('');
}

function criarItemProximo(t) {
  const isReceita = t.tipo === 'Receita';
  const bg = isReceita ? 'rgba(0,229,160,0.15)' : 'rgba(255,77,106,0.15)';
  const cor = isReceita ? 'var(--verde)' : 'var(--vermelho)';
  const sinal = isReceita ? '+' : '-';
  return `
    <div class="proxima-item">
      <div class="proxima-icon" style="background:${bg};color:${cor}">${isReceita?'↑':'↓'}</div>
      <div class="proxima-info">
        <div class="proxima-desc">${t.descricao}</div>
        <div class="proxima-data">Vencimento: ${formatarData(t.data)}</div>
      </div>
      <div class="proxima-valor" style="color:${cor}">${sinal} ${formatarMoeda(t.valor)}</div>
    </div>`;
}

function renderizarMetasDash() {
  const container = document.getElementById('metas-dashboard');
  if (!container) return;
  if (!Estado.metas || Estado.metas.length === 0) {
    container.innerHTML='<div class="empty-state"><div class="empty-icon">🎯</div>Sem metas cadastradas</div>';
    return;
  }
  container.innerHTML = Estado.metas.slice(0,3).map(m => {
    const pct = Math.min(100, Math.round((parseFloat(m.valorAtual)/parseFloat(m.valorAlvo))*100)) || 0;
    const falta = parseFloat(m.valorAlvo) - parseFloat(m.valorAtual);
    const classeFill = pct>=100?'completo':pct>=50?'medio':'inicio';
    return `
      <div class="meta-dash">
        <div class="meta-dash-nome">
          <span>${m.nome}</span>
          <span class="meta-dash-pct">${pct}%</span>
        </div>
        <div class="progress-bar"><div class="progress-fill ${classeFill}" style="width:${pct}%"></div></div>
        <div class="meta-dash-falta">Faltam ${formatarMoeda(Math.max(0,falta))}</div>
      </div>`;
  }).join('');
}

// ============================================================
// RECEITAS
// ============================================================
function filtrarTransacoes(tipo) {
  const filtroCat = document.getElementById(tipo==='Receita'?'filtro-categoria-rec':'filtro-categoria-desp')?.value || '';
  const lista = Estado.transacoes.filter(t => t.tipo === tipo && (!filtroCat || t.categoria === filtroCat));
  lista.sort((a,b) => new Date(b.data)-new Date(a.data));
  const container = document.getElementById(tipo==='Receita'?'lista-receitas':'lista-despesas');
  if (!container) return;
  if (lista.length === 0) { container.innerHTML='<div class="empty-state"><div class="empty-icon">📋</div>Nenhum lançamento neste período</div>'; return; }
  container.innerHTML = lista.map(t => criarItemTransacao(t,true)).join('');
}

function renderizarReceitas() {
  const lista = Estado.transacoes.filter(t => t.tipo==='Receita').sort((a,b)=>new Date(b.data)-new Date(a.data));
  const container = document.getElementById('lista-receitas');
  if (!container) return;
  if (lista.length===0) { container.innerHTML='<div class="empty-state"><div class="empty-icon">📋</div>Nenhuma receita neste mês</div>'; return; }
  container.innerHTML = lista.map(t => criarItemTransacao(t,true)).join('');
}

function renderizarDespesas() {
  const lista = Estado.transacoes.filter(t => t.tipo==='Despesa').sort((a,b)=>new Date(b.data)-new Date(a.data));
  const container = document.getElementById('lista-despesas');
  if (!container) return;
  if (lista.length===0) { container.innerHTML='<div class="empty-state"><div class="empty-icon">📋</div>Nenhuma despesa neste mês</div>'; return; }
  container.innerHTML = lista.map(t => criarItemTransacao(t,true)).join('');
}

function criarItemTransacao(t, comAcoes=false) {
  const isReceita = t.tipo==='Receita';
  const cor = isReceita?'var(--verde)':'var(--vermelho)';
  const sinal = isReceita?'+':'-';
  const acoes = comAcoes?`
    <div class="lista-acoes">
      <button class="btn-acao" onclick="editarTransacao('${t.id}')" title="Editar">✎</button>
      <button class="btn-acao excluir" onclick="excluirTransacao('${t.id}')" title="Excluir">✕</button>
    </div>`:'';
  return `
    <div class="lista-item">
      <div class="lista-icon ${isReceita?'receita':'despesa'}">${isReceita?'↑':'↓'}</div>
      <div class="lista-info">
        <div class="lista-desc">${t.descricao}</div>
        <div class="lista-meta">${t.categoria} · ${formatarData(t.data)} · ${t.recorrencia}</div>
      </div>
      <div class="lista-valor" style="color:${cor}">${sinal}${formatarMoeda(t.valor)}</div>
      ${acoes}
    </div>`;
}

// ============================================================
// CARTÕES
// ============================================================
function renderizarCartoes() {
  const container = document.getElementById('lista-cartoes');
  if (!container) return;
  let html = Estado.cartoes.map(c => `
    <div class="card-cartao-visual">
      <div class="cartao-nome">${c.nome}</div>
      <div class="cartao-bandeira">${c.bandeira}</div>
      <div style="font-size:12px;color:var(--texto-sub)">Limite: <span style="color:#7C6FFF;font-weight:600">${formatarMoeda(c.limite)}</span></div>
      <div class="cartao-info-row"><span>Vence: <b>${c.vencimento}</b></span><span>Melhor dia: <b>${c.melhorDia}</b></span></div>
      <div class="cartao-info-row"><span>Resp: <b>${c.responsavel1}${c.responsavel2?', '+c.responsavel2:''}</b></span></div>
    </div>`).join('');
  if (Estado.cartoes.length < 3) html += `<button class="btn-add-cartao" onclick="abrirModalCartao()">+ Adicionar cartão</button>`;
  container.innerHTML = html;

  const sel = document.getElementById('filtro-cartao-fatura');
  if (sel) {
    sel.innerHTML = '<option value="">Todos os cartões</option>' + Estado.cartoes.map(c=>`<option value="${c.id}">${c.nome}</option>`).join('');
  }
}

function renderizarFaturas() {
  const container = document.getElementById('lista-faturas');
  if (!container) return;
  if (Estado.faturas.length===0) { container.innerHTML='<div class="empty-state"><div class="empty-icon">▣</div>Nenhum lançamento neste mês</div>'; return; }
  const grupos = {};
  Estado.faturas.forEach(f => {
    const c = Estado.cartoes.find(c=>c.id===f.cartao);
    const nome = c?c.nome:f.cartao;
    if (!grupos[nome]) grupos[nome]={total:0,itens:[]};
    grupos[nome].total += parseFloat(f.valorParcela)||0;
    grupos[nome].itens.push(f);
  });
  let html='';
  for(const[nome,g] of Object.entries(grupos)) {
    html+=`<div class="fatura-resumo"><span>${nome}</span><b>${formatarMoeda(g.total)}</b></div>`;
    html+=g.itens.map(f=>`
      <div class="lista-item">
        <div class="lista-icon fatura">▣</div>
        <div class="lista-info">
          <div class="lista-desc">${f.descricao} ${parseInt(f.parcelas)>1?`<small style="color:var(--texto-sub)">${f.parcelaAtual}</small>`:''}</div>
          <div class="lista-meta">${f.categoria} · ${formatarData(f.data)} · ${f.responsavel||'—'}</div>
        </div>
        <div class="lista-valor amarelo">${formatarMoeda(f.valorParcela)}</div>
        <div class="lista-acoes">
          <button class="btn-acao excluir" onclick="excluirFatura('${f.id}')">✕</button>
        </div>
      </div>`).join('');
  }
  container.innerHTML=html;
}

// ============================================================
// METAS
// ============================================================
function renderizarMetas() {
  const container = document.getElementById('lista-metas');
  if (!container) return;
  if (Estado.metas.length===0) {
    container.innerHTML=`<button class="btn-add-meta" onclick="abrirModalMeta()">+ Criar primeira meta</button>`;
    return;
  }
  container.innerHTML = Estado.metas.map(m => {
    const pct = Math.min(100,Math.round((parseFloat(m.valorAtual)/parseFloat(m.valorAlvo))*100))||0;
    const cf = pct>=100?'completo':pct>=50?'medio':'inicio';
    return `
      <div class="card-meta">
        <div class="meta-nome">${m.nome} ${pct>=100?'🎉':''}</div>
        <div class="meta-valores"><span>Atual: <b>${formatarMoeda(m.valorAtual)}</b></span><span>Alvo: <b>${formatarMoeda(m.valorAlvo)}</b></span></div>
        <div class="progress-bar"><div class="progress-fill ${cf}" style="width:${pct}%"></div></div>
        <div class="meta-pct">${pct}% concluído</div>
        ${m.observacao?`<div style="font-size:11px;color:var(--texto-sub);margin-top:6px">${m.observacao}</div>`:''}
        <div class="meta-acoes">
          <button class="btn-acao" onclick="editarMeta('${m.id}')">✎</button>
          <button class="btn-acao excluir" onclick="excluirMeta('${m.id}')">✕</button>
        </div>
      </div>`;
  }).join('') + `<button class="btn-add-meta" onclick="abrirModalMeta()">+ Nova meta</button>`;
}

// ============================================================
// CONFIG
// ============================================================
function renderizarCategoriasConfig() {
  const c = document.getElementById('lista-categorias-config');
  if(c) c.innerHTML=`<div class="config-lista">${Estado.categorias.map(cat=>`
    <div class="config-item">
      <span>${cat.nome}<span class="tipo-badge badge-${cat.tipo==='Receita'?'receita':cat.tipo==='Despesa'?'despesa':'ambos'}">${cat.tipo}</span></span>
    </div>`).join('')}</div>`;
  const sel = document.getElementById('filtro-categoria-rec');
  if(sel) sel.innerHTML='<option value="">Todas as categorias</option>'+Estado.categorias.filter(c=>c.tipo==='Receita'||c.tipo==='Ambos').map(c=>`<option value="${c.nome}">${c.nome}</option>`).join('');
  const sel2 = document.getElementById('filtro-categoria-desp');
  if(sel2) sel2.innerHTML='<option value="">Todas as categorias</option>'+Estado.categorias.filter(c=>c.tipo==='Despesa'||c.tipo==='Ambos').map(c=>`<option value="${c.nome}">${c.nome}</option>`).join('');
}
function renderizarContasConfig() {
  const c = document.getElementById('lista-contas-config');
  if(!c) return;
  if(!Estado.contas||Estado.contas.length===0){c.innerHTML='<div class="empty-state" style="padding:16px">Sem contas cadastradas.</div>';return;}
  c.innerHTML=`<div class="config-lista">${Estado.contas.map(ct=>`<div class="config-item"><span>${ct.nome} <small style="color:var(--texto-sub)">${ct.tipo}</small></span><span style="color:var(--verde)">${formatarMoeda(ct.saldoInicial)}</span></div>`).join('')}</div>`;
}

// ============================================================
// SELECTS
// ============================================================
function preencherSelects() {
  preencherSelectCategorias(); preencherSelectContas(); preencherSelectCartoes();
}
function preencherSelectCategorias() {
  const todas = Estado.categorias;
  const despesas = todas.filter(c=>c.tipo==='Despesa'||c.tipo==='Ambos');
  function ops(lista){ return lista.map(c=>`<option value="${c.nome}">${c.nome}</option>`).join(''); }
  const st = document.getElementById('t-categoria'); if(st) st.innerHTML='<option value="">Selecionar...</option>'+ops(todas);
  const sf = document.getElementById('f-categoria'); if(sf) sf.innerHTML='<option value="">Selecionar...</option>'+ops(despesas);
}
function preencherSelectContas() {
  const s = document.getElementById('t-conta'); if(!s) return;
  s.innerHTML='<option value="">Selecionar...</option>'+Estado.contas.map(c=>`<option value="${c.nome}">${c.nome}</option>`).join('');
}
function preencherSelectCartoes() {
  const s = document.getElementById('f-cartao'); if(!s) return;
  s.innerHTML = Estado.cartoes.length===0?'<option value="">Nenhum cartão cadastrado</option>':Estado.cartoes.map(c=>`<option value="${c.id}">${c.nome}</option>`).join('');
  atualizarResponsaveisCartao();
}
function atualizarResponsaveisCartao() {
  const s = document.getElementById('f-cartao'); const sr = document.getElementById('f-responsavel'); if(!s||!sr) return;
  const c = Estado.cartoes.find(c=>c.id===s.value); if(!c) return;
  const resps = [c.responsavel1,c.responsavel2].filter(Boolean);
  sr.innerHTML='<option value="">Selecionar...</option>'+resps.map(r=>`<option value="${r}">${r}</option>`).join('');
}
document.addEventListener('change',e=>{ if(e.target.id==='f-cartao') atualizarResponsaveisCartao(); });

// ============================================================
// MODAIS
// ============================================================
function abrirModal(id) { document.getElementById(id).classList.add('open'); }
function fecharModal(id) { document.getElementById(id).classList.remove('open'); limparModals(id); }
document.addEventListener('click',e=>{ if(e.target.classList.contains('modal-overlay')) e.target.classList.remove('open'); });

function abrirModalRapido() {
  Estado.editandoId=null;
  document.getElementById('modal-lancamento-titulo').textContent='Novo Lançamento';
  document.getElementById('btn-salvar-lancamento').textContent='Salvar';
  trocarTipoModal(Estado.tipoModal);
  preencherSelectCategorias(); preencherSelectContas(); preencherSelectCartoes();
  const hoje = new Date().toISOString().split('T')[0];
  document.getElementById('t-data').value=hoje;
  document.getElementById('f-data').value=hoje;
  abrirModal('modal-lancamento');
}
function abrirModalTipo(tipo) { Estado.tipoModal=tipo; abrirModalRapido(); }
function abrirModalCartao() { abrirModal('modal-cartao'); }
function abrirModalMeta() {
  Estado.editandoId=null;
  document.getElementById('modal-meta-titulo').textContent='Nova Meta';
  limparModals('modal-meta');
  abrirModal('modal-meta');
}

function limparModals(id) {
  if(id==='modal-lancamento') {
    ['t-valor','t-descricao','t-observacao','f-valor','f-descricao'].forEach(i=>{const e=document.getElementById(i);if(e)e.value='';});
    const fp=document.getElementById('f-parcelas');if(fp)fp.value=1;
    Estado.editandoId=null;
  }
  if(id==='modal-meta') {
    ['m-nome','m-alvo','m-atual','m-inicio','m-limite','m-observacao'].forEach(i=>{const e=document.getElementById(i);if(e)e.value='';});
    Estado.editandoId=null;
  }
}

function trocarTipoModal(tipo) {
  Estado.tipoModal=tipo;
  document.querySelectorAll('.modal-tab').forEach(t=>t.classList.remove('active'));
  const mapa={'Receita':'tab-receita','Despesa':'tab-despesa','Fatura':'tab-fatura'};
  document.getElementById(mapa[tipo])?.classList.add('active');
  document.getElementById('campos-transacao').style.display=tipo!=='Fatura'?'block':'none';
  document.getElementById('campos-fatura').style.display=tipo==='Fatura'?'block':'none';
  if(tipo==='Receita'||tipo==='Despesa'){
    const sel=document.getElementById('t-categoria');
    const filtro=tipo==='Receita'?['Receita','Ambos']:['Despesa','Ambos'];
    sel.innerHTML='<option value="">Selecionar...</option>'+Estado.categorias.filter(c=>filtro.includes(c.tipo)).map(c=>`<option value="${c.nome}">${c.nome}</option>`).join('');
  }
}

// ============================================================
// SALVAR
// ============================================================
async function salvarLancamento() {
  const btn=document.getElementById('btn-salvar-lancamento');
  btn.disabled=true; btn.textContent='Salvando...';
  try {
    if(Estado.tipoModal==='Fatura') await salvarFaturaModal();
    else await salvarTransacaoModal(Estado.tipoModal);
    fecharModal('modal-lancamento');
    mostrarToast('Lançamento salvo!','success');
    await carregarDashboard();
  } catch(e) { mostrarToast(e.message||'Erro ao salvar.','error'); }
  btn.disabled=false; btn.textContent=Estado.editandoId?'Atualizar':'Salvar';
}

async function salvarTransacaoModal(tipo) {
  const valor=parseFloat(document.getElementById('t-valor').value);
  const data=document.getElementById('t-data').value;
  const categoria=document.getElementById('t-categoria').value;
  const descricao=document.getElementById('t-descricao').value.trim();
  const recorrencia=document.getElementById('t-recorrencia').value;
  if(!valor||valor<=0) throw new Error('Valor inválido.');
  if(!data) throw new Error('Data obrigatória.');
  if(!categoria) throw new Error('Selecione uma categoria.');
  if(!descricao) throw new Error('Descrição obrigatória.');
  const res=await chamarAPI({
    acao:Estado.editandoId?'editarTransacao':'salvarTransacao', id:Estado.editandoId,
    tipo,valor,data,categoria,descricao,recorrencia,
    status:document.getElementById('t-status').value,
    conta:document.getElementById('t-conta').value,
    formaPagamento:document.getElementById('t-pagamento').value,
    observacao:document.getElementById('t-observacao').value
  });
  if(res.erro) throw new Error(res.erro);
}

async function salvarFaturaModal() {
  const cartao=document.getElementById('f-cartao').value;
  const valor=parseFloat(document.getElementById('f-valor').value);
  const data=document.getElementById('f-data').value;
  const descricao=document.getElementById('f-descricao').value.trim();
  const categoria=document.getElementById('f-categoria').value;
  const parcelas=parseInt(document.getElementById('f-parcelas').value)||1;
  if(!cartao) throw new Error('Selecione um cartão.');
  if(!valor||valor<=0) throw new Error('Valor inválido.');
  if(!data) throw new Error('Data obrigatória.');
  if(!descricao) throw new Error('Descrição obrigatória.');
  if(!categoria) throw new Error('Selecione uma categoria.');
  const res=await chamarAPI({
    acao:'salvarFatura', cartao, valorTotal:valor, data, descricao, categoria, parcelas,
    responsavel:document.getElementById('f-responsavel').value,
    recorrente:document.getElementById('f-recorrente').value,
    assinatura:document.getElementById('f-assinatura').value,
  });
  if(res.erro) throw new Error(res.erro);
}

async function editarTransacao(id) {
  const t=Estado.transacoes.find(t=>t.id===id); if(!t) return;
  Estado.editandoId=id;
  trocarTipoModal(t.tipo);
  document.getElementById('modal-lancamento-titulo').textContent='Editar Lançamento';
  document.getElementById('btn-salvar-lancamento').textContent='Atualizar';
  document.getElementById('t-valor').value=t.valor;
  document.getElementById('t-data').value=String(t.data).split('T')[0];
  document.getElementById('t-descricao').value=t.descricao;
  document.getElementById('t-observacao').value=t.observacao||'';
  setTimeout(()=>{
    const s=document.getElementById('t-categoria'); if(s) s.value=t.categoria;
    const r=document.getElementById('t-recorrencia'); if(r) r.value=t.recorrencia;
    const st=document.getElementById('t-status'); if(st) st.value=t.status||'Confirmado';
  },50);
  abrirModal('modal-lancamento');
}

async function excluirTransacao(id) {
  if(!confirm('Excluir este lançamento?')) return;
  const res=await chamarAPI({acao:'excluirTransacao',id});
  if(res.sucesso){mostrarToast('Excluído.','success');carregarDashboard();const a=document.querySelector('.aba.active')?.id?.replace('aba-','');if(a==='receitas')carregarTransacoesTipo('Receita');if(a==='despesas')carregarTransacoesTipo('Despesa');}
  else mostrarToast(res.erro||'Erro.','error');
}

async function excluirFatura(id) {
  if(!confirm('Excluir este lançamento do cartão?')) return;
  const res=await chamarAPI({acao:'excluirFatura',id});
  if(res.sucesso){mostrarToast('Excluído.','success');carregarFaturas();carregarDashboard();}
  else mostrarToast(res.erro||'Erro.','error');
}

async function salvarCartao() {
  const nome=document.getElementById('c-nome').value.trim();
  if(!nome){mostrarToast('Nome obrigatório.','error');return;}
  const res=await chamarAPI({
    acao:'salvarCartao', nome,
    bandeira:document.getElementById('c-bandeira').value,
    limite:parseFloat(document.getElementById('c-limite').value)||0,
    vencimento:document.getElementById('c-vencimento').value,
    melhorDia:document.getElementById('c-melhordia').value,
    responsavel1:document.getElementById('c-resp1').value.trim(),
    responsavel2:document.getElementById('c-resp2').value.trim()
  });
  if(res.sucesso){mostrarToast('Cartão salvo!','success');fecharModal('modal-cartao');await carregarCartoes();preencherSelectCartoes();}
  else mostrarToast(res.erro||'Erro.','error');
}

async function salvarMeta() {
  const nome=document.getElementById('m-nome').value.trim();
  const alvo=parseFloat(document.getElementById('m-alvo').value);
  if(!nome){mostrarToast('Nome obrigatório.','error');return;}
  if(!alvo||alvo<=0){mostrarToast('Valor inválido.','error');return;}
  const res=await chamarAPI({
    acao:Estado.editandoId?'editarMeta':'salvarMeta', id:Estado.editandoId,
    nome, valorAlvo:alvo, valorAtual:parseFloat(document.getElementById('m-atual').value)||0,
    dataInicio:document.getElementById('m-inicio').value,
    dataLimite:document.getElementById('m-limite').value,
    observacao:document.getElementById('m-observacao').value
  });
  if(res.sucesso){mostrarToast('Meta salva!','success');fecharModal('modal-meta');await carregarMetas();}
  else mostrarToast(res.erro||'Erro.','error');
}

async function editarMeta(id) {
  const m=Estado.metas.find(m=>m.id===id); if(!m) return;
  Estado.editandoId=id;
  document.getElementById('modal-meta-titulo').textContent='Editar Meta';
  document.getElementById('m-nome').value=m.nome;
  document.getElementById('m-alvo').value=m.valorAlvo;
  document.getElementById('m-atual').value=m.valorAtual;
  document.getElementById('m-inicio').value=String(m.dataInicio||'').split('T')[0];
  document.getElementById('m-limite').value=String(m.dataLimite||'').split('T')[0];
  document.getElementById('m-observacao').value=m.observacao||'';
  abrirModal('modal-meta');
}

async function excluirMeta(id) {
  if(!confirm('Excluir esta meta?')) return;
  const res=await chamarAPI({acao:'excluirMeta',id});
  if(res.sucesso){mostrarToast('Meta excluída.','success');carregarMetas();}
  else mostrarToast(res.erro||'Erro.','error');
}

async function salvarSaldoInicial() {
  const valor=parseFloat(document.getElementById('config-saldo-inicial').value);
  if(isNaN(valor)){mostrarToast('Valor inválido.','error');return;}
  const res=await chamarAPI({acao:'atualizarConfig',chave:'SaldoInicial',valor,descricao:'Saldo inicial'});
  if(res.sucesso){mostrarToast('Saldo inicial salvo!','success');Estado.config['SaldoInicial']=valor;carregarDashboard();}
}

async function adicionarCategoria() {
  const nome=document.getElementById('nova-categoria-nome').value.trim();
  const tipo=document.getElementById('nova-categoria-tipo').value;
  if(!nome){mostrarToast('Nome obrigatório.','error');return;}
  Estado.categorias.push({id:'CAT'+Date.now(),nome,tipo});
  renderizarCategoriasConfig(); preencherSelectCategorias();
  document.getElementById('nova-categoria-nome').value='';
  mostrarToast('Categoria adicionada! Inclua também na planilha.','success');
}

// ============================================================
// HELPERS
// ============================================================
function formatarMoeda(v) { return (parseFloat(v)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
function formatarMoedaCompacta(v) {
  const n=parseFloat(v)||0;
  if(Math.abs(n)>=1000) return 'R$'+(n/1000).toFixed(1)+'k';
  return 'R$'+n.toFixed(0);
}
function formatarData(d) {
  if(!d) return '—';
  const dt=new Date(d);
  if(isNaN(dt.getTime())) return String(d).split('T')[0]||'—';
  return dt.toLocaleDateString('pt-BR');
}
function mostrarToast(msg,tipo='') {
  const el=document.getElementById('toast');
  el.textContent=msg; el.className='toast show '+tipo;
  setTimeout(()=>el.className='toast',3000);
}
