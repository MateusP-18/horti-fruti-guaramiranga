/* =========================================================================
   shared/services/analyticsService.js
   Eventos estruturados de uso do site — sem nenhuma informação pessoal.
   Tipos: page_view, product_view, add_to_cart, cart_open, checkout_start,
   whatsapp_click, instagram_click.
   ========================================================================= */
(function () {
  'use strict';
  const S = window.HGStore;

  const EVENT_TYPES = ['page_view', 'product_view', 'add_to_cart', 'cart_open', 'checkout_start', 'whatsapp_click', 'instagram_click'];
  const FUNNEL_STEPS = [
    { type: 'page_view', label: 'Visitas' },
    { type: 'product_view', label: 'Visualizações de produtos' },
    { type: 'add_to_cart', label: 'Adições ao carrinho' },
    { type: 'checkout_start', label: 'Pedidos iniciados' },
    { type: 'whatsapp_click', label: 'Cliques no WhatsApp' },
  ];

  function registrarEvento(type, productId, meta) {
    if (EVENT_TYPES.indexOf(type) === -1) return null;
    const evt = { id: S.uid('ev'), type, productId: productId || null, meta: meta || null, date: new Date().toISOString() };
    S._state().analyticsEvents.push(evt);
    S._persist();
    return evt;
  }

  function buscarEventos(filters) {
    filters = filters || {};
    let list = S._state().analyticsEvents.slice();
    if (filters.type) list = list.filter(e => e.type === filters.type);
    if (filters.range) list = list.filter(e => S.isWithinRange(e.date, filters.range));
    return list;
  }

  function contarPorTipo(range) {
    const out = {};
    EVENT_TYPES.forEach(t => { out[t] = 0; });
    buscarEventos({ range }).forEach(e => { out[e.type] = (out[e.type] || 0) + 1; });
    return out;
  }

  function rankingProdutos(type, range, limit) {
    const counts = {};
    buscarEventos({ type, range }).forEach(e => {
      if (!e.productId) return;
      counts[e.productId] = (counts[e.productId] || 0) + 1;
    });
    const P = window.HGServices.products;
    return Object.entries(counts)
      .map(([productId, count]) => { const p = P.buscarProduto(productId); return { productId, name: p ? p.name : productId, count }; })
      .sort((a, b) => b.count - a.count)
      .slice(0, limit || 10);
  }

  function funil(range) {
    const counts = contarPorTipo(range);
    const vendas = window.HGServices.sales ? window.HGServices.sales.buscarVendas({ range, origem: 'site' }).length : 0;
    return FUNNEL_STEPS.map(s => ({ label: s.label, value: counts[s.type] || 0 }))
      .concat([{ label: 'Vendas (site)', value: vendas }]);
  }

  window.HGServices = window.HGServices || {};
  window.HGServices.analytics = { EVENT_TYPES, registrarEvento, buscarEventos, contarPorTipo, rankingProdutos, funil };
})();
