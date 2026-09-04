(function () {
  'use strict';
  const S = window.HGStore;
  const P = window.HGServices.products;
  const I = window.HGServices.inventory;
  const UI = window.AdminUI;
  UI.initSidebar();

  const STATUS_LABEL = { normal: 'Normal', baixo: 'Baixo', critico: 'Crítico', esgotado: 'Esgotado' };

  /* ---------------- Abas ---------------- */
  document.querySelectorAll('.adm-tabs [data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.adm-tabs [data-tab]').forEach(b => { b.classList.remove('is-active'); b.setAttribute('aria-selected', 'false'); });
      document.querySelectorAll('.adm-tabpanel').forEach(p => { p.hidden = true; });
      btn.classList.add('is-active');
      btn.setAttribute('aria-selected', 'true');
      document.getElementById('tab-' + btn.dataset.tab).hidden = false;
    });
  });

  /* ---------------- Visão geral ---------------- */
  function renderVisaoGeral() {
    const all = P.buscarProdutos();
    const byStatus = { normal: 0, baixo: 0, critico: 0, esgotado: 0 };
    all.forEach(p => byStatus[P.statusEstoque(p)]++);
    const valorTotal = all.reduce((s, p) => s + p.stock * p.price, 0);
    const qtdTotal = all.reduce((s, p) => s + p.stock, 0);

    document.getElementById('cardsVisao').innerHTML = [
      ['Produtos cadastrados', all.length, ''],
      ['Qtd. total em estoque', qtdTotal, ''],
      ['Estoque baixo/crítico', byStatus.baixo + byStatus.critico, 'adm-card--warn'],
      ['Esgotados', byStatus.esgotado, 'adm-card--danger'],
      ['Valor total do estoque', S.formatBRL(valorTotal), ''],
    ].map(([l, v, cls]) => `<div class="adm-card ${cls}"><div class="adm-card__label">${S.escapeHTML(l)}</div><div class="adm-card__value">${v}</div></div>`).join('');

    UI.renderDonut(document.getElementById('donutVisao'), [
      { label: 'Normal', value: byStatus.normal, color: '#2E6A45' },
      { label: 'Baixo', value: byStatus.baixo, color: 'var(--manga)' },
      { label: 'Crítico', value: byStatus.critico, color: '#B23A1F' },
      { label: 'Esgotado', value: byStatus.esgotado, color: 'var(--pitaya)' },
    ]);

    UI.renderBars(document.getElementById('barsSecao'),
      S.CATEGORY_ORDER.map(cat => ({ label: S.CATEGORY_INFO[cat].label, value: P.buscarProdutos(cat).reduce((s, p) => s + p.stock, 0) })),
      { color: 'var(--mata)' });
  }

  /* ---------------- Movimentações ---------------- */
  function populateProdutoSelect(selectEl, withStock) {
    selectEl.innerHTML = S.CATEGORY_ORDER.map(cat => {
      const opts = P.buscarProdutos(cat).map(p => `<option value="${p.id}">${S.escapeHTML(p.name)}${withStock ? ' — ' + p.stock + ' ' + p.unit + ' em estoque' : ''}</option>`).join('');
      return `<optgroup label="${S.escapeHTML(S.CATEGORY_INFO[cat].label)}">${opts}</optgroup>`;
    }).join('');
  }

  function renderMovForm() {
    populateProdutoSelect(document.getElementById('movProduto'), true);
    document.getElementById('movTipo').innerHTML = Object.entries(I.MOVEMENT_TYPES)
      .map(([key, t]) => `<option value="${key}">${S.escapeHTML(t.label)}</option>`).join('');
    renderMovRecent();
  }

  function renderMovRecent() {
    const rows = I.buscarMovimentacoes().slice(0, 15);
    const tbody = document.getElementById('movRecentBody');
    if (rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6"><p class="adm-empty-inline">Nenhuma movimentação registrada ainda.</p></td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(m => {
      const p = P.buscarProduto(m.productId);
      const t = I.MOVEMENT_TYPES[m.type] || { label: m.type, sign: 1 };
      return `<tr>
        <td>${S.formatDateTime(m.date)}</td>
        <td>${p ? S.escapeHTML(p.name) : '(produto excluído)'}</td>
        <td>${S.escapeHTML(t.label)}</td>
        <td>${t.sign > 0 ? '+' : '−'}${m.qty}</td>
        <td style="text-transform:capitalize;">${S.escapeHTML(m.origem || '—')}</td>
        <td>${S.escapeHTML(m.note || '—')}</td>
      </tr>`;
    }).join('');
  }

  document.getElementById('movForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const productId = document.getElementById('movProduto').value;
    const type = document.getElementById('movTipo').value;
    const qty = parseInt(document.getElementById('movQty').value, 10);
    const origem = document.getElementById('movOrigem').value;
    const note = document.getElementById('movNote').value.trim();
    const errorEl = document.getElementById('movError');

    if (!productId || !qty || qty <= 0) {
      errorEl.textContent = 'Escolha um produto e informe uma quantidade válida.';
      errorEl.hidden = false;
      return;
    }
    errorEl.hidden = true;
    const result = I.registrarMovimentacao(productId, type, qty, note, origem);
    if (!result) { UI.toast('Não foi possível registrar a movimentação.', 'error'); return; }
    UI.toast('Movimentação registrada com sucesso.');
    document.getElementById('movForm').reset();
    populateProdutoSelect(document.getElementById('movProduto'), true);
    renderMovRecent();
    renderVisaoGeral();
    renderEstoqueBaixo();
  });

  /* ---------------- Estoque baixo ---------------- */
  function renderEstoqueBaixo() {
    const list = I.reporEstoqueBaixo();
    const wrap = document.querySelector('#baixoBody').closest('.adm-table-wrap');
    if (list.length === 0) {
      wrap.hidden = true;
      document.getElementById('baixoEmpty').hidden = false;
      return;
    }
    wrap.hidden = false;
    document.getElementById('baixoEmpty').hidden = true;
    document.getElementById('baixoBody').innerHTML = list.map(p => {
      const st = P.statusEstoque(p);
      const necessario = Math.max(0, p.stockMin - p.stock);
      return `<tr>
        <td>${p.icon || ''} ${S.escapeHTML(p.name)}</td>
        <td>${S.escapeHTML(S.CATEGORY_INFO[p.category].label)}</td>
        <td>${p.stock} ${S.escapeHTML(p.unit)}</td>
        <td>${p.stockMin} ${S.escapeHTML(p.unit)}</td>
        <td>${necessario} ${S.escapeHTML(p.unit)}</td>
        <td><span class="adm-badge adm-badge--${st}">${STATUS_LABEL[st]}</span></td>
        <td><a href="produtos.html#${p.category}/editar/${p.id}" class="adm-btn adm-btn--ghost adm-btn--sm">Repor</a></td>
      </tr>`;
    }).join('');
  }

  /* ---------------- Histórico ---------------- */
  let histRange = null;
  function populateHistFilters() {
    const catSel = document.getElementById('histCategoria');
    catSel.innerHTML = '<option value="">Todas</option>' + S.CATEGORY_ORDER.map(c => `<option value="${c}">${S.escapeHTML(S.CATEGORY_INFO[c].label)}</option>`).join('');
    const prodSel = document.getElementById('histProduto');
    prodSel.innerHTML = '<option value="">Todos</option>' + P.buscarProdutos().map(p => `<option value="${p.id}">${S.escapeHTML(p.name)}</option>`).join('');
    const tipoSel = document.getElementById('histTipo');
    tipoSel.innerHTML = '<option value="">Todos</option>' + Object.entries(I.MOVEMENT_TYPES).map(([k, t]) => `<option value="${k}">${S.escapeHTML(t.label)}</option>`).join('');
    const origemSel = document.getElementById('histOrigem');
    origemSel.innerHTML = '<option value="">Todas</option>' + I.ORIGENS.map(o => `<option value="${o}" style="text-transform:capitalize;">${o[0].toUpperCase() + o.slice(1)}</option>`).join('');
  }

  function renderHistorico() {
    const filters = {
      range: histRange,
      category: document.getElementById('histCategoria').value || undefined,
      productId: document.getElementById('histProduto').value || undefined,
      type: document.getElementById('histTipo').value || undefined,
      origem: document.getElementById('histOrigem').value || undefined,
    };
    const rows = I.buscarMovimentacoes(filters);
    const wrap = document.querySelector('#histBody').closest('.adm-table-wrap');
    if (rows.length === 0) {
      wrap.hidden = true;
      document.getElementById('histEmpty').hidden = false;
      return;
    }
    wrap.hidden = false;
    document.getElementById('histEmpty').hidden = true;
    document.getElementById('histBody').innerHTML = rows.map(m => {
      const p = P.buscarProduto(m.productId);
      const t = I.MOVEMENT_TYPES[m.type] || { label: m.type, sign: 1 };
      return `<tr>
        <td>${S.formatDateTime(m.date)}</td>
        <td>${p ? S.escapeHTML(p.name) : '(produto excluído)'}</td>
        <td>${p ? S.escapeHTML(S.CATEGORY_INFO[p.category].label) : '—'}</td>
        <td>${S.escapeHTML(t.label)}</td>
        <td>${t.sign > 0 ? '+' : '−'}${m.qty}</td>
        <td style="text-transform:capitalize;">${S.escapeHTML(m.origem || '—')}</td>
        <td>${S.escapeHTML(m.note || '—')}</td>
      </tr>`;
    }).join('');
  }

  ['histCategoria', 'histProduto', 'histTipo', 'histOrigem'].forEach(id => {
    document.getElementById(id).addEventListener('change', renderHistorico);
  });

  renderVisaoGeral();
  renderMovForm();
  renderEstoqueBaixo();
  populateHistFilters();
  UI.renderPeriodFilter(document.getElementById('histPeriodFilter'), (range) => { histRange = range; renderHistorico(); }, 'total');
})();
