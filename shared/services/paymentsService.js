/* =========================================================================
   shared/services/paymentsService.js
   ========================================================================= */
(function () {
  'use strict';
  const S = window.HGStore;

  const METHODS = ['PIX', 'Dinheiro', 'Débito', 'Crédito', 'Outro'];

  function buscarPagamentos(filters) {
    filters = filters || {};
    let list = S._state().payments.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
    if (filters.saleId) list = list.filter(p => p.saleId === filters.saleId);
    if (filters.method) list = list.filter(p => p.method === filters.method);
    if (filters.status) list = list.filter(p => p.status === filters.status);
    if (filters.range) list = list.filter(p => S.isWithinRange(p.date, filters.range));
    return list;
  }

  function registrarPagamento({ saleId, method, status, valorVenda, valorRecebido }) {
    const troco = method === 'Dinheiro' && valorRecebido > valorVenda ? +(valorRecebido - valorVenda).toFixed(2) : 0;
    const payment = {
      id: S.uid('pg'), saleId, method: METHODS.includes(method) ? method : 'Outro',
      status: status || 'pago', valorVenda, valorRecebido: valorRecebido != null ? valorRecebido : valorVenda, troco,
      date: new Date().toISOString(),
    };
    S._state().payments.push(payment);
    S._persist();
    return payment;
  }

  function atualizarStatusPagamento(id, status) {
    const p = S._state().payments.find(p => p.id === id);
    if (!p) return null;
    p.status = status;
    S._persist();
    return p;
  }

  window.HGServices = window.HGServices || {};
  window.HGServices.payments = { METHODS, buscarPagamentos, registrarPagamento, atualizarStatusPagamento };
})();
