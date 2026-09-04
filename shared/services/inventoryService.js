/* =========================================================================
   shared/services/inventoryService.js
   Todo o histórico de movimentações de estoque. É a ÚNICA porta de entrada
   para mudar o estoque de um produto — por isso o estoque nunca vira só um
   número solto (seção 9 do briefing).
   ========================================================================= */
(function () {
  'use strict';
  const S = window.HGStore;
  const P = () => window.HGServices.products;

  const MOVEMENT_TYPES = {
    entrada:  { label: 'Entrada',  sign: 1 },
    venda:    { label: 'Venda',    sign: -1 },
    retirada: { label: 'Retirada', sign: -1 },
    perda:    { label: 'Perda',    sign: -1 },
    ajuste:   { label: 'Ajuste (+)', sign: 1 },
    correcao: { label: 'Correção (-)', sign: -1 },
  };
  const ORIGENS = ['site', 'presencial', 'administrativo', 'outro'];

  function buscarMovimentacoes(filters) {
    filters = filters || {};
    let list = S._state().movements.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
    if (filters.productId) list = list.filter(m => m.productId === filters.productId);
    if (filters.category) {
      const ids = new Set(P().buscarProdutos(filters.category).map(p => p.id));
      list = list.filter(m => ids.has(m.productId));
    }
    if (filters.type) list = list.filter(m => m.type === filters.type);
    if (filters.origem) list = list.filter(m => m.origem === filters.origem);
    if (filters.range) list = list.filter(m => S.isWithinRange(m.date, filters.range));
    return list;
  }

  // qty sempre positiva; o sinal é decidido pelo tipo (MOVEMENT_TYPES).
  function registrarMovimentacao(productId, type, qty, note, origem) {
    const product = P().buscarProduto(productId);
    if (!product || !MOVEMENT_TYPES[type] || !(qty > 0)) return null;
    const sign = MOVEMENT_TYPES[type].sign;
    const novoEstoque = product.stock + sign * qty;
    P()._definirEstoqueInterno(productId, novoEstoque);
    const movement = {
      id: S.uid('mv'), productId, type, qty, note: note || '',
      origem: ORIGENS.includes(origem) ? origem : 'administrativo',
      date: new Date().toISOString(),
    };
    S._state().movements.push(movement);
    S._persist();
    return { product: P().buscarProduto(productId), movement };
  }

  function reporEstoqueBaixo() {
    return P().buscarProdutos().filter(p => {
      const st = P().statusEstoque(p);
      return st === 'baixo' || st === 'critico' || st === 'esgotado';
    }).sort((a, b) => (a.stock - a.stockMin) - (b.stock - b.stockMin));
  }

  window.HGServices = window.HGServices || {};
  window.HGServices.inventory = { MOVEMENT_TYPES, ORIGENS, buscarMovimentacoes, registrarMovimentacao, reporEstoqueBaixo };
})();
