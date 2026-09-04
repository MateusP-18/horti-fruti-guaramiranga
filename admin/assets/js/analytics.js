(function () {
  'use strict';
  const S = window.HGStore;
  const A = window.HGServices.analytics;
  const UI = window.AdminUI;
  UI.initSidebar();

  function render(range) {
    const counts = A.contarPorTipo(range);
    const totalEventos = Object.values(counts).reduce((s, v) => s + v, 0);
    document.getElementById('emptyNotice').style.display = totalEventos === 0 ? 'flex' : 'none';

    document.getElementById('cardsAnalytics').innerHTML = [
      ['Visitas', counts.page_view],
      ['Produtos visualizados', counts.product_view],
      ['Itens no carrinho', counts.add_to_cart],
      ['Carrinho aberto', counts.cart_open],
      ['Pedidos iniciados', counts.checkout_start],
      ['Cliques no WhatsApp', counts.whatsapp_click],
      ['Cliques no Instagram', counts.instagram_click],
    ].map(([l, v]) => `<div class="adm-card"><div class="adm-card__label">${S.escapeHTML(l)}</div><div class="adm-card__value">${v}</div></div>`).join('');

    const funilSteps = A.funil(range);
    if (totalEventos === 0) {
      document.getElementById('funil').innerHTML = '<p class="adm-empty-inline">Sem eventos no período.</p>';
    } else {
      const max = Math.max(1, ...funilSteps.map(s => s.value));
      document.getElementById('funil').innerHTML = '<div class="adm-bars">' + funilSteps.map((s, i) => {
        const pct = Math.max(2, Math.round((s.value / max) * 100));
        const queda = i > 0 && funilSteps[i - 1].value > 0 ? Math.round((1 - s.value / funilSteps[i - 1].value) * 100) : null;
        return `<div class="adm-bar-row" style="grid-template-columns:210px 1fr 40px 130px;">
          <span class="adm-bar-label">${S.escapeHTML(s.label)}</span>
          <span class="adm-bar-track"><span class="adm-bar-fill" style="width:${pct}%; background:var(--mata)"></span></span>
          <span class="adm-bar-value">${s.value}</span>
          <span style="font-size:.74rem; color:var(--adm-text-40);">${queda !== null && queda > 0 ? '↓ ' + queda + '% de queda' : ''}</span>
        </div>`;
      }).join('') + '</div>';
    }

    const vistos = A.rankingProdutos('product_view', range, 8);
    const carrinho = A.rankingProdutos('add_to_cart', range, 8);
    UI.renderBars(document.getElementById('chartMaisVistos'), vistos.map(v => ({ label: v.name, value: v.count })), { color: 'var(--mata)' });
    UI.renderBars(document.getElementById('chartMaisCarrinho'), carrinho.map(v => ({ label: v.name, value: v.count })), { color: 'var(--manga-2)' });

    const eventos = A.buscarEventos({ type: 'page_view', range });
    const porDia = {};
    eventos.forEach(e => { const d = S.formatDate(e.date); porDia[d] = (porDia[d] || 0) + 1; });
    const dias = Object.entries(porDia).sort((a, b) => new Date(a[0].split('/').reverse().join('-')) - new Date(b[0].split('/').reverse().join('-')));
    if (dias.length === 0) document.getElementById('chartVisitasDia').innerHTML = '<p class="adm-empty-inline">Sem visitas no período.</p>';
    else UI.renderBars(document.getElementById('chartVisitasDia'), dias.map(([d, v]) => ({ label: d, value: v })), { color: 'var(--folha)' });
  }

  UI.renderPeriodFilter(document.getElementById('periodFilter'), render, 'mes');
})();
