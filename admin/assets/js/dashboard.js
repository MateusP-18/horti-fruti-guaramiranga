(function () {
  'use strict';
  const S = window.HGStore;
  const P = window.HGServices.products;
  const Sales = window.HGServices.sales;
  const A = window.HGServices.analytics;
  const UI = window.AdminUI;
  UI.initSidebar();

  /* ---------------- Estoque (não depende de período) ---------------- */
  function renderEstoque() {
    const products = P.buscarProdutos();
    const byStatus = { normal: 0, baixo: 0, critico: 0, esgotado: 0 };
    products.forEach(p => byStatus[P.statusEstoque(p)]++);
    const valorEstoque = products.reduce((s, p) => s + p.stock * p.price, 0);

    document.getElementById('cardsEstoque').innerHTML = [
      ['Produtos cadastrados', products.length, ''],
      ['Disponíveis', products.filter(p => P.estaDisponivel(p)).length, ''],
      ['Estoque baixo/crítico', byStatus.baixo + byStatus.critico, 'adm-card--warn'],
      ['Esgotados', byStatus.esgotado, 'adm-card--danger'],
      ['Valor total do estoque', S.formatBRL(valorEstoque), ''],
    ].map(([l, v, cls]) => `<div class="adm-card ${cls}"><div class="adm-card__label">${S.escapeHTML(l)}</div><div class="adm-card__value">${v}</div></div>`).join('');

    UI.renderDonut(document.getElementById('donutEstoque'), [
      { label: 'Normal', value: byStatus.normal, color: '#2E6A45' },
      { label: 'Baixo', value: byStatus.baixo, color: 'var(--manga)' },
      { label: 'Crítico', value: byStatus.critico, color: '#B23A1F' },
      { label: 'Esgotado', value: byStatus.esgotado, color: 'var(--pitaya)' },
    ]);

    const reposicao = window.HGServices.inventory.reporEstoqueBaixo();
    const wrap = document.querySelector('#tabelaReposicao').closest('.adm-table-wrap');
    if (reposicao.length === 0) {
      wrap.hidden = true;
      document.getElementById('reposicaoEmpty').hidden = false;
    } else {
      wrap.hidden = false;
      document.getElementById('reposicaoEmpty').hidden = true;
      const LABEL = { baixo: 'Baixo', critico: 'Crítico', esgotado: 'Esgotado' };
      document.querySelector('#tabelaReposicao tbody').innerHTML = reposicao.map(p => {
        const st = P.statusEstoque(p);
        return `<tr>
          <td>${p.icon || ''} ${S.escapeHTML(p.name)}</td>
          <td>${S.escapeHTML(S.CATEGORY_INFO[p.category].label)}</td>
          <td>${p.stock} ${S.escapeHTML(p.unit)}</td>
          <td>${p.stockMin} ${S.escapeHTML(p.unit)}</td>
          <td><span class="adm-badge adm-badge--${st}">${LABEL[st]}</span></td>
        </tr>`;
      }).join('');
    }
  }

  /* ---------------- Vendas + Site (dependem do período) ---------------- */
  function renderPeriodo(range) {
    document.getElementById('periodLabelVendas').textContent = '— ' + range.label;
    document.getElementById('periodLabelSite').textContent = '— ' + range.label;

    const pedidos = Sales.buscarVendas({ range });
    const vendas = pedidos.filter(v => v.status === 'pago');
    const faturamento = vendas.reduce((s, v) => s + v.total, 0);
    const produtosVendidos = vendas.reduce((s, v) => s + v.items.reduce((s2, i) => s2 + i.qty, 0), 0);
    const ticketMedio = vendas.length ? faturamento / vendas.length : 0;

    document.getElementById('cardsVendas').innerHTML = [
      ['Faturamento', S.formatBRL(faturamento)],
      ['Quantidade de vendas', vendas.length],
      ['Quantidade de pedidos', pedidos.length],
      ['Produtos vendidos', produtosVendidos],
      ['Ticket médio', S.formatBRL(ticketMedio)],
    ].map(([l, v]) => `<div class="adm-card"><div class="adm-card__label">${S.escapeHTML(l)}</div><div class="adm-card__value">${v}</div></div>`).join('');

    const counts = A.contarPorTipo(range);
    document.getElementById('cardsSite').innerHTML = [
      ['Visitas', counts.page_view],
      ['Produtos visualizados', counts.product_view],
      ['Itens no carrinho', counts.add_to_cart],
      ['Pedidos iniciados', counts.checkout_start],
      ['Cliques no WhatsApp', counts.whatsapp_click],
      ['Cliques no Instagram', counts.instagram_click],
    ].map(([l, v]) => `<div class="adm-card"><div class="adm-card__label">${S.escapeHTML(l)}</div><div class="adm-card__value">${v}</div></div>`).join('');

    const porOrigem = { site: pedidos.filter(v => v.origem === 'site').length, presencial: pedidos.filter(v => v.origem === 'presencial').length };
    document.getElementById('vendasPeriodoDesc').textContent = 'Origem site × presencial — ' + range.label;
    if (pedidos.length === 0) {
      document.getElementById('vendasOrigemChart').innerHTML = '<p class="adm-empty-inline">Ainda não existem dados suficientes para esta análise.</p>';
    } else {
      UI.renderBars(document.getElementById('vendasOrigemChart'), [
        { label: 'Site', value: porOrigem.site },
        { label: 'Presencial', value: porOrigem.presencial },
      ], { color: 'var(--mata)' });
    }
  }

  renderEstoque();
  UI.renderPeriodFilter(document.getElementById('periodFilter'), renderPeriodo, 'mes');
})();
