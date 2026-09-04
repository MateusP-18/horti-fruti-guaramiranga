(function () {
  'use strict';
  const S = window.HGStore;
  const P = window.HGServices.products;
  const Sales = window.HGServices.sales;
  const Pay = window.HGServices.payments;
  const UI = window.AdminUI;
  UI.initSidebar();

  const PREV_KEY = { hoje: 'ontem', semana: 'semana_anterior', mes: 'mes_anterior', ano: 'ano_anterior' };

  function statsFor(range) {
    const vendas = Sales.buscarVendas({ range, status: 'pago' });
    const faturamento = vendas.reduce((s, v) => s + v.total, 0);
    const produtosVendidos = vendas.reduce((s, v) => s + v.items.reduce((s2, i) => s2 + i.qty, 0), 0);
    const ticketMedio = vendas.length ? faturamento / vendas.length : 0;
    return { vendas, faturamento, produtosVendidos, ticketMedio };
  }

  function deltaBadge(atual, anterior) {
    if (!anterior) return '';
    const pct = ((atual - anterior) / anterior) * 100;
    if (!isFinite(pct)) return '';
    const up = pct >= 0;
    return `<div class="adm-delta ${up ? 'adm-delta--up' : 'adm-delta--down'}">${up ? '↑' : '↓'} ${Math.abs(pct).toFixed(1)}% vs. período anterior</div>`;
  }

  function render(range) {
    const cur = statsFor(range);
    const prevKey = PREV_KEY[range.key];
    const prev = prevKey ? statsFor(S.getPeriodRange(prevKey)) : null;

    document.getElementById('emptyNotice').style.display = cur.vendas.length === 0 ? 'flex' : 'none';

    const porProduto = {};
    cur.vendas.forEach(v => v.items.forEach(i => {
      porProduto[i.productId] = porProduto[i.productId] || { name: i.name, qty: 0, faturamento: 0 };
      porProduto[i.productId].qty += i.qty;
      porProduto[i.productId].faturamento += i.price * i.qty;
    }));
    const rankingProdutos = Object.values(porProduto).sort((a, b) => b.qty - a.qty);

    const porCategoria = {};
    cur.vendas.forEach(v => v.items.forEach(i => {
      porCategoria[i.category] = porCategoria[i.category] || { qty: 0, faturamento: 0 };
      porCategoria[i.category].qty += i.qty;
      porCategoria[i.category].faturamento += i.price * i.qty;
    }));
    const categoriaTop = Object.entries(porCategoria).sort((a, b) => b[1].faturamento - a[1].faturamento)[0];

    document.getElementById('cardsIndicadores').innerHTML = [
      ['Faturamento', S.formatBRL(cur.faturamento), deltaBadge(cur.faturamento, prev && prev.faturamento)],
      ['Quantidade de vendas', cur.vendas.length, deltaBadge(cur.vendas.length, prev && prev.vendas.length)],
      ['Produtos vendidos', cur.produtosVendidos, deltaBadge(cur.produtosVendidos, prev && prev.produtosVendidos)],
      ['Ticket médio', S.formatBRL(cur.ticketMedio), deltaBadge(cur.ticketMedio, prev && prev.ticketMedio)],
      ['Produto mais vendido', rankingProdutos[0] ? rankingProdutos[0].name : '—', ''],
      ['Categoria mais vendida', categoriaTop ? S.CATEGORY_INFO[categoriaTop[0]].label : '—', ''],
    ].map(([l, v, delta]) => `<div class="adm-card"><div class="adm-card__label">${S.escapeHTML(l)}</div><div class="adm-card__value" style="${typeof v === 'string' && v.length > 12 ? 'font-size:1.1rem;' : ''}">${v}</div>${delta}</div>`).join('');

    const compBox = document.getElementById('comparacao');
    document.getElementById('compDesc').textContent = prevKey ? range.label + ' × ' + S.PERIOD_LABELS[prevKey] : 'Disponível para Hoje, Esta semana, Este mês e Este ano.';
    if (!prev) {
      compBox.innerHTML = '<p class="adm-empty-inline">Escolha um período com comparação disponível (Hoje, Esta semana, Este mês ou Este ano).</p>';
    } else {
      compBox.innerHTML = '<div class="adm-cards">' + [
        ['Faturamento', S.formatBRL(cur.faturamento), S.formatBRL(prev.faturamento), deltaBadge(cur.faturamento, prev.faturamento)],
        ['Vendas', cur.vendas.length, prev.vendas.length, deltaBadge(cur.vendas.length, prev.vendas.length)],
        ['Produtos vendidos', cur.produtosVendidos, prev.produtosVendidos, deltaBadge(cur.produtosVendidos, prev.produtosVendidos)],
        ['Ticket médio', S.formatBRL(cur.ticketMedio), S.formatBRL(prev.ticketMedio), deltaBadge(cur.ticketMedio, prev.ticketMedio)],
      ].map(([l, a, b, delta]) => `<div class="adm-card"><div class="adm-card__label">${S.escapeHTML(l)}</div><div class="adm-card__value" style="font-size:1.2rem;">${a}</div><div class="adm-card__note">Antes: ${b}</div>${delta}</div>`).join('') + '</div>';
    }

    const porDia = {};
    cur.vendas.forEach(v => { const d = S.formatDate(v.date); porDia[d] = (porDia[d] || 0) + v.total; });
    const diasOrdenados = Object.entries(porDia).sort((a, b) => new Date(a[0].split('/').reverse().join('-')) - new Date(b[0].split('/').reverse().join('-')));
    if (diasOrdenados.length === 0) document.getElementById('chartTempo').innerHTML = '<p class="adm-empty-inline">Sem vendas no período.</p>';
    else UI.renderBars(document.getElementById('chartTempo'), diasOrdenados.map(([d, v]) => ({ label: d, value: Math.round(v * 100) / 100 })), { color: 'var(--mata)' });

    UI.renderBars(document.getElementById('chartTopProdutos'), rankingProdutos.slice(0, 8).map(p => ({ label: p.name, value: p.qty })), { color: 'var(--mata)' });
    const menos = rankingProdutos.slice().sort((a, b) => a.qty - b.qty).slice(0, 8);
    UI.renderBars(document.getElementById('chartBottomProdutos'), menos.map(p => ({ label: p.name, value: p.qty })), { color: 'var(--manga-2)' });

    const totalCatFat = Object.values(porCategoria).reduce((s, c) => s + c.faturamento, 0);
    const tabCat = document.getElementById('tabCategorias');
    if (Object.keys(porCategoria).length === 0) {
      tabCat.innerHTML = '<tr><td colspan="4"><p class="adm-empty-inline">Sem vendas no período.</p></td></tr>';
    } else {
      tabCat.innerHTML = S.CATEGORY_ORDER.filter(c => porCategoria[c]).map(c => {
        const d = porCategoria[c];
        const pct = totalCatFat ? (d.faturamento / totalCatFat * 100) : 0;
        return `<tr><td>${S.CATEGORY_INFO[c].emoji} ${S.escapeHTML(S.CATEGORY_INFO[c].label)}</td><td>${d.qty}</td><td>${S.formatBRL(d.faturamento)}</td><td>${pct.toFixed(1)}%</td></tr>`;
      }).join('');
    }

    const porOrigem = {};
    cur.vendas.forEach(v => { porOrigem[v.origem] = porOrigem[v.origem] || { n: 0, fat: 0 }; porOrigem[v.origem].n++; porOrigem[v.origem].fat += v.total; });
    const tabOrigem = document.getElementById('tabOrigem');
    if (Object.keys(porOrigem).length === 0) {
      tabOrigem.innerHTML = '<tr><td colspan="4"><p class="adm-empty-inline">Sem vendas no período.</p></td></tr>';
    } else {
      tabOrigem.innerHTML = Object.entries(porOrigem).map(([o, d]) =>
        `<tr><td style="text-transform:capitalize;">${o}</td><td>${d.n}</td><td>${S.formatBRL(d.fat)}</td><td>${S.formatBRL(d.fat / d.n)}</td></tr>`).join('');
    }

    const pagamentos = Pay.buscarPagamentos({ range, status: 'pago' });
    const porMetodo = {};
    pagamentos.forEach(pg => { porMetodo[pg.method] = porMetodo[pg.method] || { n: 0, valor: 0 }; porMetodo[pg.method].n++; porMetodo[pg.method].valor += pg.valorVenda; });
    const totalPg = Object.values(porMetodo).reduce((s, m) => s + m.valor, 0);
    const tabPg = document.getElementById('tabPagamento');
    if (pagamentos.length === 0) {
      tabPg.innerHTML = '<tr><td colspan="4"><p class="adm-empty-inline">Sem pagamentos no período.</p></td></tr>';
    } else {
      tabPg.innerHTML = Object.entries(porMetodo).map(([m, d]) =>
        `<tr><td>${S.escapeHTML(m)}</td><td>${d.n}</td><td>${S.formatBRL(d.valor)}</td><td>${totalPg ? (d.valor / totalPg * 100).toFixed(1) : 0}%</td></tr>`).join('');
    }

    const porHora = new Array(24).fill(0);
    cur.vendas.forEach(v => { porHora[new Date(v.date).getHours()]++; });
    const horasComVenda = porHora.map((v, h) => ({ label: String(h).padStart(2, '0') + 'h', value: v })).filter(h => h.value > 0);
    if (horasComVenda.length === 0) document.getElementById('chartHorarios').innerHTML = '<p class="adm-empty-inline">Sem dados de horário no período.</p>';
    else UI.renderBars(document.getElementById('chartHorarios'), horasComVenda, { color: 'var(--pitaya)' });
  }

  UI.renderPeriodFilter(document.getElementById('periodFilter'), render, 'mes');
})();
