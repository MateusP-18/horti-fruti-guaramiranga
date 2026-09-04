/* =========================================================================
   shared/services/salesService.js
   Registro de vendas — tanto as que vêm do carrinho do site (origem:
   'site') quanto as lançadas manualmente no painel (origem: 'presencial').
   Registrar uma venda também baixa o estoque de cada item, através do
   inventoryService (tipo 'venda'), pra manter uma única fonte de verdade.
   ========================================================================= */
(function () {
  'use strict';
  const S = window.HGStore;

  const STATUS_LABELS = {
    aguardando: 'Aguardando', pago: 'Pago', parcial: 'Parcialmente pago',
    cancelado: 'Cancelado', estornado: 'Estornado',
  };
  const ORIGENS = ['site', 'presencial'];

  function buscarVendas(filters) {
    filters = filters || {};
    let list = S._state().sales.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
    if (filters.origem) list = list.filter(s => s.origem === filters.origem);
    if (filters.status) list = list.filter(s => s.status === filters.status);
    if (filters.range) list = list.filter(s => S.isWithinRange(s.date, filters.range));
    return list;
  }
  function buscarVenda(id) {
    return S._state().sales.find(s => s.id === id) || null;
  }

  // items: [{productId, name, qty, price, category}]
  function registrarVenda({ origem, items, status, baixarEstoque }) {
    if (!items || items.length === 0) return null;
    const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);
    const sale = {
      id: S.uid('vd'),
      date: new Date().toISOString(),
      origem: ORIGENS.includes(origem) ? origem : 'presencial',
      items, total,
      status: status || 'aguardando',
    };
    S._state().sales.push(sale);
    S._persist();

    // baixa o estoque de cada item vendido (tipo 'venda'), a menos que
    // explicitamente desligado (ex.: venda de teste sem afetar estoque real)
    if (baixarEstoque !== false && window.HGServices.inventory) {
      items.forEach(i => {
        window.HGServices.inventory.registrarMovimentacao(i.productId, 'venda', i.qty, 'Venda #' + sale.id.slice(-6), sale.origem);
      });
    }
    return sale;
  }

  function atualizarStatusVenda(id, status) {
    const sale = buscarVenda(id);
    if (!sale) return null;
    sale.status = status;
    S._persist();
    return sale;
  }

  window.HGServices = window.HGServices || {};
  window.HGServices.sales = { STATUS_LABELS, ORIGENS, buscarVendas, buscarVenda, registrarVenda, atualizarStatusVenda };
})();
