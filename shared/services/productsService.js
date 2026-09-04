/* =========================================================================
   shared/services/productsService.js
   Único ponto de leitura/escrita de produtos. Hoje fala com o localStorage
   (via HGStore); no futuro, troque só o INTERIOR destas funções por
   chamadas ao Supabase — quem usa o serviço (site e painel) não muda.
   ========================================================================= */
(function () {
  'use strict';
  const S = window.HGStore;

  function buscarProdutos(category) {
    const list = S._state().products.slice();
    return category ? list.filter(p => p.category === category) : list;
  }
  function buscarProduto(id) {
    return S._state().products.find(p => p.id === id) || null;
  }

  // Regra de coerência (seção 8): estoque = 0 força indisponível/esgotado,
  // independente do interruptor "disponível" definido pelo administrador.
  // O interruptor manual continua existindo (pra tirar de linha um produto
  // mesmo com estoque), mas nunca pode "mentir" que há produto quando não há.
  function estaDisponivel(p) {
    return !!p.available && p.stock > 0;
  }
  // 🟢 normal · 🟠 baixo · 🔴 crítico · ⚫ esgotado
  function statusEstoque(p) {
    if (p.stock <= 0) return 'esgotado';
    if (p.stock <= Math.ceil(p.stockMin * 0.5)) return 'critico';
    if (p.stock <= p.stockMin) return 'baixo';
    return 'normal';
  }

  function criarProduto(data) {
    const now = new Date().toISOString();
    const product = {
      id: S.uid(data.category ? data.category.slice(0, 2) : 'pr'),
      createdAt: now, updatedAt: now,
      stock: 0, stockMin: 5, available: true, price: 0, image: null,
      ...data,
    };
    S._state().products.push(product);
    S._persist();
    return product;
  }

  // Não aceita alterar `stock` por aqui — mudanças de estoque sempre passam
  // pelo inventoryService (registrarMovimentacao), pra nunca virar só um
  // número solto sem histórico (seção 9).
  function editarProduto(id, data) {
    const list = S._state().products;
    const idx = list.findIndex(p => p.id === id);
    if (idx === -1) return null;
    const { stock, ...rest } = data;
    list[idx] = { ...list[idx], ...rest, updatedAt: new Date().toISOString() };
    S._persist();
    return list[idx];
  }

  function excluirProduto(id) {
    const st = S._state();
    st.products = st.products.filter(p => p.id !== id);
    st.movements = st.movements.filter(m => m.productId !== id);
    S._persist();
  }

  function alternarDisponibilidade(id) {
    const p = buscarProduto(id);
    if (!p) return null;
    p.available = !p.available;
    p.updatedAt = new Date().toISOString();
    S._persist();
    return p;
  }

  function duplicarProduto(id) {
    const p = buscarProduto(id);
    if (!p) return null;
    const now = new Date().toISOString();
    const copy = { ...p, id: S.uid(p.category.slice(0, 2)), name: p.name + ' (cópia)', createdAt: now, updatedAt: now };
    S._state().products.push(copy);
    S._persist();
    return copy;
  }

  // Uso exclusivo do inventoryService — nenhuma tela deve chamar isto direto.
  function _definirEstoqueInterno(id, novoEstoque) {
    const p = buscarProduto(id);
    if (!p) return null;
    p.stock = Math.max(0, novoEstoque);
    p.updatedAt = new Date().toISOString();
    if (p.stock === 0) p.available = false;
    S._persist();
    return p;
  }

  window.HGServices = window.HGServices || {};
  window.HGServices.products = {
    buscarProdutos, buscarProduto, criarProduto, editarProduto, excluirProduto,
    alternarDisponibilidade, duplicarProduto, estaDisponivel, statusEstoque,
    _definirEstoqueInterno,
  };
})();
