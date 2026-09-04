/* =========================================================================
   HORTIFRUTI GUARAMIRANGA — NÚCLEO DE DADOS COMPARTILHADO
   shared/core/store.js

   Este arquivo é carregado TANTO pelo site público quanto pelo painel
   administrativo — é a "mesma fonte de dados local" pedida na evolução do
   projeto, pra o painel nunca mostrar um produto como disponível enquanto
   o site já considera esgotado (ou vice-versa).

   Ainda NÃO existe Supabase. Tudo fica no localStorage do navegador, sob
   uma única chave, lido/escrito só pelas funções deste arquivo e dos
   serviços em shared/services/*.js — nenhuma outra parte do código deve
   mexer no localStorage diretamente. Essa é a "camada de serviço" que,
   no futuro, passa a chamar o Supabase por dentro, sem precisar mudar
   quem chama.
   ========================================================================= */

(function () {
  'use strict';

  const STORAGE_KEY = 'hg_store_v1';

  /* ---------------- Formatadores e utilidades ---------------- */
  function escapeHTML(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function formatBRL(v) {
    const n = Number(v) || 0;
    return n === 0 ? 'R$ 00,00' : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
  function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return isNaN(d) ? '—' : d.toLocaleDateString('pt-BR');
  }
  function formatDateTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return isNaN(d) ? '—' : d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  function formatUnit(u) { return u || ''; }
  function uid(prefix) { return (prefix || 'id') + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  /* ---------------- Períodos de calendário (regra fixa: semana
     segunda→domingo, mês dia1→último dia, ano 1/jan→31/dez) ---------------- */
  function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
  function endOfDay(d) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }
  function mondayOf(d) { const x = startOfDay(d); const day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day); return x; }
  function sundayOf(d) { const m = mondayOf(d); const x = new Date(m); x.setDate(m.getDate() + 6); return endOfDay(x); }

  const PERIOD_LABELS = {
    hoje: 'Hoje', ontem: 'Ontem', semana: 'Esta semana', semana_anterior: 'Semana anterior',
    mes: 'Este mês', mes_anterior: 'Mês anterior', ano: 'Este ano', ano_anterior: 'Ano anterior',
    custom: 'Período personalizado', total: 'Total histórico',
  };

  function getPeriodRange(key, customStart, customEnd) {
    const now = new Date();
    switch (key) {
      case 'hoje': return { key, start: startOfDay(now), end: endOfDay(now), label: PERIOD_LABELS.hoje };
      case 'ontem': { const y = new Date(now); y.setDate(now.getDate() - 1); return { key, start: startOfDay(y), end: endOfDay(y), label: PERIOD_LABELS.ontem }; }
      case 'semana': return { key, start: mondayOf(now), end: sundayOf(now), label: PERIOD_LABELS.semana };
      case 'semana_anterior': { const m = mondayOf(now); const pm = new Date(m); pm.setDate(m.getDate() - 7); return { key, start: pm, end: sundayOf(pm), label: PERIOD_LABELS.semana_anterior }; }
      case 'mes': { const s = new Date(now.getFullYear(), now.getMonth(), 1); const e = new Date(now.getFullYear(), now.getMonth() + 1, 0); return { key, start: startOfDay(s), end: endOfDay(e), label: PERIOD_LABELS.mes }; }
      case 'mes_anterior': { const s = new Date(now.getFullYear(), now.getMonth() - 1, 1); const e = new Date(now.getFullYear(), now.getMonth(), 0); return { key, start: startOfDay(s), end: endOfDay(e), label: PERIOD_LABELS.mes_anterior }; }
      case 'ano': { const s = new Date(now.getFullYear(), 0, 1); const e = new Date(now.getFullYear(), 11, 31); return { key, start: startOfDay(s), end: endOfDay(e), label: PERIOD_LABELS.ano }; }
      case 'ano_anterior': { const s = new Date(now.getFullYear() - 1, 0, 1); const e = new Date(now.getFullYear() - 1, 11, 31); return { key, start: startOfDay(s), end: endOfDay(e), label: PERIOD_LABELS.ano_anterior }; }
      case 'custom': return { key, start: customStart ? startOfDay(customStart) : null, end: customEnd ? endOfDay(customEnd) : null, label: PERIOD_LABELS.custom };
      case 'total':
      default: return { key: 'total', start: null, end: endOfDay(now), label: PERIOD_LABELS.total };
    }
  }
  function isWithinRange(iso, range) {
    if (!range) return true;
    const d = new Date(iso);
    if (range.start && d < range.start) return false;
    if (range.end && d > range.end) return false;
    return true;
  }

  /* ---------------- Seed (dados de exemplo — ver README) ---------------- */
  const SEED_DATE = '2026-08-01T09:00:00.000Z';

  const SEED_PRODUCTS = [
    { id: 'hf-01', category: 'hortifruti', name: 'Maçã',          unit: '/kg',      price: 0, image: null, icon: '🍎', description: 'Descrição a cadastrar.', available: true,  stock: 40, stockMin: 15 },
    { id: 'hf-02', category: 'hortifruti', name: 'Banana palma',  unit: '/kg',      price: 0, image: null, icon: '🍌', description: 'Descrição a cadastrar.', available: true,  stock: 35, stockMin: 15 },
    { id: 'hf-03', category: 'hortifruti', name: 'Alface',        unit: '/unidade', price: 0, image: null, icon: '🥬', description: 'Descrição a cadastrar.', available: true,  stock: 25, stockMin: 10 },
    { id: 'hf-04', category: 'hortifruti', name: 'Tomate',        unit: '/kg',      price: 0, image: null, icon: '🍅', description: 'Descrição a cadastrar.', available: true,  stock: 30, stockMin: 12 },
    { id: 'hf-05', category: 'hortifruti', name: 'Cebola',        unit: '/kg',      price: 0, image: null, icon: '🧅', description: 'Descrição a cadastrar.', available: true,  stock: 30, stockMin: 12 },
    { id: 'hf-06', category: 'hortifruti', name: 'Batata',        unit: '/kg',      price: 0, image: null, icon: '🥔', description: 'Descrição a cadastrar.', available: true,  stock: 30, stockMin: 12 },
    { id: 'hf-07', category: 'hortifruti', name: 'Laranja',       unit: '/kg',      price: 0, image: null, icon: '🍊', description: 'Descrição a cadastrar.', available: true,  stock: 30, stockMin: 12 },
    { id: 'hf-08', category: 'hortifruti', name: 'Mamão',         unit: '/unidade', price: 0, image: null, icon: '🍈', description: 'Descrição a cadastrar.', available: true,  stock: 18, stockMin: 20 },
    { id: 'hf-09', category: 'hortifruti', name: 'Cenoura',       unit: '/kg',      price: 0, image: null, icon: '🥕', description: 'Descrição a cadastrar.', available: true,  stock: 22, stockMin: 10 },
    { id: 'hf-10', category: 'hortifruti', name: 'Pepino',        unit: '/kg',      price: 0, image: null, icon: '🥒', description: 'Descrição a cadastrar.', available: true,  stock: 20, stockMin: 10 },
    { id: 'pp-01', category: 'polpas', name: 'Polpa de Acerola',  unit: '/pacote', price: 0, image: null, icon: '🍒', description: 'Descrição a cadastrar.', available: true,  stock: 20, stockMin: 8 },
    { id: 'pp-02', category: 'polpas', name: 'Polpa de Cajá',     unit: '/pacote', price: 0, image: null, icon: '🧃', description: 'Descrição a cadastrar.', available: true,  stock: 20, stockMin: 8 },
    { id: 'pp-03', category: 'polpas', name: 'Polpa de Maracujá', unit: '/pacote', price: 0, image: null, icon: '🟡', description: 'Descrição a cadastrar.', available: true,  stock: 20, stockMin: 8 },
    { id: 'pp-04', category: 'polpas', name: 'Polpa de Caju',     unit: '/pacote', price: 0, image: null, icon: '🥭', description: 'Descrição a cadastrar.', available: true,  stock: 20, stockMin: 8 },
    { id: 'pp-05', category: 'polpas', name: 'Polpa de Manga',    unit: '/pacote', price: 0, image: null, icon: '🥭', description: 'Descrição a cadastrar.', available: true,  stock: 20, stockMin: 8 },
    { id: 'pp-06', category: 'polpas', name: 'Polpa de Abacaxi',  unit: '/pacote', price: 0, image: null, icon: '🍍', description: 'Descrição a cadastrar.', available: true,  stock: 20, stockMin: 8 },
    { id: 'pp-07', category: 'polpas', name: 'Polpa de Goiaba',   unit: '/pacote', price: 0, image: null, icon: '🍐', description: 'Descrição a cadastrar.', available: false, stock: 0,  stockMin: 8 },
    { id: 'pp-08', category: 'polpas', name: 'Polpa de Morango',  unit: '/pacote', price: 0, image: null, icon: '🍓', description: 'Descrição a cadastrar.', available: true,  stock: 15, stockMin: 18 },
    { id: 'ac-01', category: 'acougue', name: 'Pernil suíno',   unit: '/kg', price: 0, image: null, icon: '🥩', description: 'Descrição a cadastrar.', available: true, stock: 12, stockMin: 10 },
    { id: 'ac-02', category: 'acougue', name: 'Colchão suíno',  unit: '/kg', price: 0, image: null, icon: '🥩', description: 'Descrição a cadastrar.', available: true, stock: 12, stockMin: 10 },
    { id: 'ac-03', category: 'acougue', name: 'Frango abatido', unit: '/kg', price: 0, image: null, icon: '🍗', description: 'Descrição a cadastrar.', available: true, stock: 20, stockMin: 10 },
    { id: 'ac-04', category: 'acougue', name: 'Carne moída',    unit: '/kg', price: 0, image: null, icon: '🥩', description: 'Descrição a cadastrar.', available: true, stock: 15, stockMin: 10 },
    { id: 'ac-05', category: 'acougue', name: 'Ossobuco',       unit: '/kg', price: 0, image: null, icon: '🍖', description: 'Descrição a cadastrar.', available: true, stock: 10, stockMin: 12 },
    { id: 'ac-06', category: 'acougue', name: 'Bisteca suína',  unit: '/kg', price: 0, image: null, icon: '🥩', description: 'Descrição a cadastrar.', available: true, stock: 10, stockMin: 8  },
    { id: 'ac-07', category: 'acougue', name: 'Costela bovina', unit: '/kg', price: 0, image: null, icon: '🍖', description: 'Descrição a cadastrar.', available: true, stock: 8,  stockMin: 10 },
    { id: 'ac-08', category: 'acougue', name: 'Linguiça',       unit: '/kg', price: 0, image: null, icon: '🌭', description: 'Descrição a cadastrar.', available: true, stock: 14, stockMin: 8  },
  ].map(p => ({ ...p, createdAt: SEED_DATE, updatedAt: SEED_DATE }));

  const SEED_MOVEMENTS = SEED_PRODUCTS.map(p => ({
    id: uid('mv'), productId: p.id, type: 'entrada', qty: p.stock,
    note: 'Estoque inicial (exemplo)', origem: 'administrativo', date: SEED_DATE,
  }));

  const SEED_REVIEWS = [{
    id: uid('rv'), name: 'Cliente Exemplo',
    comment: 'Este é um exemplo de avaliação para mostrar como a lista fica preenchida. Substitua ou exclua quando cadastrar avaliações reais.',
    rating: 5, source: 'Site', date: SEED_DATE, status: 'oculta',
  }];

  const SEED_COMMENTS = [{
    id: uid('cm'), author: 'Cliente Exemplo',
    text: 'Este é um exemplo de comentário para mostrar como a lista e a resposta ficam. Pode excluir quando começarem os comentários reais.',
    date: SEED_DATE, status: 'novo', reply: null,
  }];

  const SEED_MEDIA = [
    { id: 'md-hero-1', name: 'Hero — Frutas da estação', section: 'Hero', type: 'image', src: null, active: true },
    { id: 'md-hero-2', name: 'Hero — Verduras fresquinhas', section: 'Hero', type: 'image', src: null, active: true },
    { id: 'md-hero-3', name: 'Hero — Açougue', section: 'Hero', type: 'image', src: null, active: true },
    { id: 'md-hero-4', name: 'Hero — Polpas de fruta', section: 'Hero', type: 'image', src: null, active: true },
    { id: 'md-acougue', name: 'Bancada do açougue', section: 'Açougue', type: 'image', src: null, active: true },
    { id: 'md-bem', name: 'Ação do Bem', section: 'Ação do Bem', type: 'image', src: null, active: true },
    { id: 'md-mapa', name: 'Mapa da localização', section: 'Localização', type: 'image', src: null, active: true },
  ];

  const SEED_STATE = {
    version: 2,
    products: SEED_PRODUCTS,
    movements: SEED_MOVEMENTS,
    reviews: SEED_REVIEWS,
    comments: SEED_COMMENTS,
    media: SEED_MEDIA,
    // Vazios de propósito: nada disso é inventado. Passam a ter dados reais
    // conforme o site é usado de verdade (analyticsEvents) e conforme
    // vendas/pagamentos/caixa forem registrados (pelo site ou pelo painel).
    sales: [],
    payments: [],
    cashRegisters: [],
    cashMovements: [],
    analyticsEvents: [],
  };

  /* ---------------- Persistência ---------------- */
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) throw new Error('sem dados salvos ainda');
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.products)) throw new Error('formato inválido');
      // migração leve: garante que campos novos existam mesmo em dados salvos por uma versão anterior
      ['sales', 'payments', 'cashRegisters', 'cashMovements', 'analyticsEvents'].forEach(k => {
        if (!Array.isArray(parsed[k])) parsed[k] = [];
      });
      return parsed;
    } catch (e) {
      return JSON.parse(JSON.stringify(SEED_STATE));
    }
  }

  let state = loadState();
  let persistFailed = false;

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      persistFailed = false;
    } catch (e) {
      persistFailed = true;
      console.warn('Não foi possível salvar no localStorage:', e);
    }
  }
  function resetToSeed() { state = JSON.parse(JSON.stringify(SEED_STATE)); persist(); }

  const CATEGORY_INFO = {
    hortifruti: { label: 'Hortifruti', emoji: '🥬' },
    polpas:     { label: 'Polpas',     emoji: '🧃' },
    acougue:    { label: 'Açougue',    emoji: '🥩' },
  };
  const CATEGORY_ORDER = ['hortifruti', 'polpas', 'acougue'];
  const UNIT_OPTIONS = ['/unidade', '/kg', '/500g', '/1kg', '/pacote', '/bandeja', '/litro', '/outro'];

  window.HGStore = {
    // estado (uso interno dos services — páginas não devem mexer aqui direto)
    _state: () => state,
    _persist: persist,
    _persistFailed: () => persistFailed,
    resetToSeed,
    // utilidades compartilhadas
    escapeHTML, formatBRL, formatDate, formatDateTime, formatUnit, uid,
    getPeriodRange, isWithinRange, PERIOD_LABELS,
    CATEGORY_INFO, CATEGORY_ORDER, UNIT_OPTIONS,
  };
})();
