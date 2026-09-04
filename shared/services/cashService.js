/* =========================================================================
   shared/services/cashService.js
   Estrutura administrativa de caixa (abertura → movimentações → fechamento
   com conferência). Ainda não é um PDV completo — é a base pra isso.
   ========================================================================= */
(function () {
  'use strict';
  const S = window.HGStore;

  function caixaAberto() {
    return S._state().cashRegisters.find(c => c.status === 'aberto') || null;
  }
  function buscarCaixas() {
    return S._state().cashRegisters.slice().sort((a, b) => new Date(b.dataAbertura) - new Date(a.dataAbertura));
  }
  function buscarCaixa(id) {
    return S._state().cashRegisters.find(c => c.id === id) || null;
  }

  function abrirCaixa({ valorInicial, responsavel }) {
    if (caixaAberto()) return null; // só um caixa aberto por vez
    const reg = {
      id: S.uid('cx'), dataAbertura: new Date().toISOString(), dataFechamento: null,
      valorInicial: Number(valorInicial) || 0, responsavel: responsavel || '',
      status: 'aberto', totalInformado: null,
    };
    S._state().cashRegisters.push(reg);
    S._persist();
    return reg;
  }

  function registrarMovimentacaoCaixa({ type, valor, note }) {
    const reg = caixaAberto();
    if (!reg || !(valor > 0)) return null;
    const mov = { id: S.uid('cm'), cashRegisterId: reg.id, type, valor: Number(valor), note: note || '', date: new Date().toISOString() };
    S._state().cashMovements.push(mov);
    S._persist();
    return mov;
  }

  function buscarMovimentacoesCaixa(cashRegisterId) {
    return S._state().cashMovements.filter(m => m.cashRegisterId === cashRegisterId).sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  function resumoCaixa(id) {
    const reg = buscarCaixa(id);
    if (!reg) return null;
    const start = new Date(reg.dataAbertura);
    const end = reg.dataFechamento ? new Date(reg.dataFechamento) : new Date();
    const pagamentos = S._state().payments.filter(p => {
      const d = new Date(p.date);
      return d >= start && d <= end && p.status === 'pago';
    });
    const porMetodo = {};
    (window.HGServices.payments ? window.HGServices.payments.METHODS : ['PIX', 'Dinheiro', 'Débito', 'Crédito', 'Outro']).forEach(m => { porMetodo[m] = 0; });
    pagamentos.forEach(p => { porMetodo[p.method] = (porMetodo[p.method] || 0) + p.valorVenda; });

    const movs = buscarMovimentacoesCaixa(id);
    const entradas = movs.filter(m => m.type === 'entrada').reduce((s, m) => s + m.valor, 0);
    const retiradas = movs.filter(m => m.type === 'retirada').reduce((s, m) => s + m.valor, 0);
    const vendasDinheiro = porMetodo['Dinheiro'] || 0;
    const totalEsperado = reg.valorInicial + vendasDinheiro + entradas - retiradas;

    return {
      saldoInicial: reg.valorInicial, porMetodo, entradas, retiradas,
      totalEsperado, totalVendas: pagamentos.reduce((s, p) => s + p.valorVenda, 0),
    };
  }

  function fecharCaixa(id, { totalInformado }) {
    const reg = buscarCaixa(id);
    if (!reg || reg.status === 'fechado') return null;
    reg.dataFechamento = new Date().toISOString();
    reg.status = 'fechado';
    reg.totalInformado = Number(totalInformado) || 0;
    S._persist();
    return reg;
  }

  window.HGServices = window.HGServices || {};
  window.HGServices.cash = { caixaAberto, buscarCaixas, buscarCaixa, abrirCaixa, registrarMovimentacaoCaixa, buscarMovimentacoesCaixa, resumoCaixa, fecharCaixa };
})();
