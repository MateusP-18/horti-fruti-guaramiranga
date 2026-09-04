(function () {
  'use strict';
  const S = window.HGStore;
  const P = window.HGServices.products;
  const I = window.HGServices.inventory;
  const UI = window.AdminUI;
  UI.initSidebar();

  const ICONS = {
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>',
    eyeOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17.9 17.9A10.6 10.6 0 0 1 12 20C5 20 1 12 1 12a21.6 21.6 0 0 1 5-6M9.9 4.2A10.4 10.4 0 0 1 12 4c7 0 11 8 11 8a21.6 21.6 0 0 1-2.2 3.2M14.1 14.1a3 3 0 1 1-4.2-4.2"/><path d="M1 1l22 22"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>',
  };
  const STATUS_LABEL = { normal: 'Normal', baixo: 'Baixo', critico: 'Crítico', esgotado: 'Esgotado' };

  const views = {
    categorias: document.getElementById('view-categorias'),
    categoria: document.getElementById('view-categoria'),
    form: document.getElementById('view-form'),
  };
  const backLink = document.getElementById('backLink');
  const backLinkText = document.getElementById('backLinkText');

  function showView(name) {
    Object.values(views).forEach(v => { v.hidden = true; });
    views[name].hidden = false;
    window.scrollTo(0, 0);
  }

  function parseHash() {
    const h = location.hash.replace(/^#/, '');
    if (!h) return { mode: 'categorias' };
    const parts = h.split('/');
    if (!S.CATEGORY_INFO[parts[0]]) return { mode: 'categorias' };
    if (parts.length === 1) return { mode: 'categoria', category: parts[0] };
    if (parts[1] === 'novo') return { mode: 'novo', category: parts[0] };
    if (parts[1] === 'editar' && parts[2]) return { mode: 'editar', category: parts[0], id: parts[2] };
    return { mode: 'categoria', category: parts[0] };
  }

  function route() {
    const r = parseHash();
    if (r.mode === 'categorias') {
      renderCategorias(); showView('categorias'); backLink.hidden = true;
    } else if (r.mode === 'categoria') {
      renderCategoria(r.category); showView('categoria');
      backLink.hidden = false; backLinkText.textContent = 'Seções de Produtos'; backLink.href = '#';
    } else {
      renderForm(r.category, r.mode === 'editar' ? r.id : null); showView('form');
      backLink.hidden = false; backLinkText.textContent = S.CATEGORY_INFO[r.category].label; backLink.href = '#' + r.category;
    }
  }
  window.addEventListener('hashchange', route);

  /* ---------------- Tela 1: categorias ---------------- */
  function renderCategorias() {
    document.getElementById('catGrid').innerHTML = S.CATEGORY_ORDER.map(cat => {
      const info = S.CATEGORY_INFO[cat];
      const list = P.buscarProdutos(cat);
      const atencao = list.filter(p => P.statusEstoque(p) !== 'normal').length;
      return `<a class="adm-cat-card" href="#${cat}">
        <span class="adm-cat-card__icon">${info.emoji}</span>
        <h3>${S.escapeHTML(info.label)}</h3>
        <p>${list.length} produto${list.length === 1 ? '' : 's'} cadastrado${list.length === 1 ? '' : 's'}${atencao ? ' · ' + atencao + ' precisam de atenção' : ''}</p>
      </a>`;
    }).join('');
  }

  /* ---------------- Tela 2: dashboard da categoria ---------------- */
  function renderCategoria(category) {
    const info = S.CATEGORY_INFO[category];
    document.getElementById('catTitle').textContent = info.emoji + ' ' + info.label;
    document.getElementById('catDesc').textContent = 'Indicadores, estoque e produtos desta seção.';
    document.getElementById('btnNovoProduto').onclick = () => { location.hash = category + '/novo'; };

    const list = P.buscarProdutos(category);
    const byStatus = { normal: 0, baixo: 0, critico: 0, esgotado: 0 };
    list.forEach(p => byStatus[P.statusEstoque(p)]++);
    const totalStock = list.reduce((s, p) => s + p.stock, 0);
    const valorEstoque = list.reduce((s, p) => s + p.stock * p.price, 0);
    const precoMedio = list.length ? list.reduce((s, p) => s + p.price, 0) / list.length : 0;

    document.getElementById('catCards').innerHTML = [
      ['Total de produtos', list.length, ''],
      ['Disponíveis', list.filter(p => P.estaDisponivel(p)).length, ''],
      ['Indisponíveis', list.filter(p => !P.estaDisponivel(p)).length, ''],
      ['Estoque baixo/crítico', byStatus.baixo + byStatus.critico, 'adm-card--warn'],
      ['Esgotados', byStatus.esgotado, 'adm-card--danger'],
      ['Qtd. total em estoque', totalStock, ''],
      ['Valor estimado do estoque', S.formatBRL(valorEstoque), ''],
      ['Preço médio', S.formatBRL(precoMedio), ''],
    ].map(([l, v, cls]) => `<div class="adm-card ${cls}"><div class="adm-card__label">${S.escapeHTML(l)}</div><div class="adm-card__value">${v}</div></div>`).join('');

    UI.renderDonut(document.getElementById('catDonut'), [
      { label: 'Normal', value: byStatus.normal, color: '#2E6A45' },
      { label: 'Baixo', value: byStatus.baixo, color: 'var(--manga)' },
      { label: 'Crítico', value: byStatus.critico, color: '#B23A1F' },
      { label: 'Esgotado', value: byStatus.esgotado, color: 'var(--pitaya)' },
    ]);

    const ranking = list.slice().sort((a, b) => b.stock - a.stock).slice(0, 8).map(p => ({ label: p.name, value: p.stock }));
    UI.renderBars(document.getElementById('catRanking'), ranking, { color: 'var(--mata)' });

    const alertList = I.reporEstoqueBaixo().filter(p => p.category === category);
    const alertWrap = document.querySelector('#catAlertBody').closest('.adm-table-wrap');
    if (alertList.length === 0) {
      alertWrap.hidden = true;
      document.getElementById('catAlertEmpty').hidden = false;
    } else {
      alertWrap.hidden = false;
      document.getElementById('catAlertEmpty').hidden = true;
      document.getElementById('catAlertBody').innerHTML = alertList.map(p => {
        const st = P.statusEstoque(p);
        const necessario = Math.max(0, p.stockMin - p.stock);
        return `<tr><td>${p.icon || ''} ${S.escapeHTML(p.name)}</td><td>${p.stock} ${S.escapeHTML(p.unit)}</td><td>${p.stockMin} ${S.escapeHTML(p.unit)}</td>
          <td><span class="adm-badge adm-badge--${st}">${STATUS_LABEL[st]}</span></td><td>${necessario} ${S.escapeHTML(p.unit)}</td></tr>`;
      }).join('');
    }

    renderProdutosTable(list);
  }

  function renderProdutosTable(list) {
    const tbody = document.getElementById('catProdutosBody');
    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6"><p class="adm-empty-inline">Nenhum produto cadastrado nesta seção ainda.</p></td></tr>';
      return;
    }
    tbody.innerHTML = list.map(p => {
      const st = P.statusEstoque(p);
      const media = p.image
        ? `<img src="${S.escapeHTML(p.image)}" alt="" class="adm-table__media" style="object-fit:cover;">`
        : `<div class="adm-table__media">${p.icon || '🛒'}</div>`;
      return `<tr>
        <td>${media}</td>
        <td>${S.escapeHTML(p.name)}</td>
        <td>${S.formatBRL(p.price)} <span style="color:var(--adm-text-40);font-size:.76rem;">${S.escapeHTML(p.unit)}</span></td>
        <td>${p.stock} ${S.escapeHTML(p.unit)}</td>
        <td><span class="adm-badge adm-badge--${st}">${STATUS_LABEL[st]}</span>${!p.available ? ' <span class="adm-badge adm-badge--oculta">Inativo</span>' : ''}</td>
        <td>
          <div class="adm-table__actions">
            <button type="button" class="adm-iconbtn" data-act="editar" data-id="${p.id}" aria-label="Editar ${S.escapeHTML(p.name)}">${ICONS.edit}</button>
            <button type="button" class="adm-iconbtn" data-act="duplicar" data-id="${p.id}" aria-label="Duplicar ${S.escapeHTML(p.name)}">${ICONS.copy}</button>
            <button type="button" class="adm-iconbtn" data-act="alternar" data-id="${p.id}" aria-label="${p.available ? 'Desativar' : 'Ativar'} ${S.escapeHTML(p.name)}">${p.available ? ICONS.eyeOff : ICONS.eye}</button>
            <button type="button" class="adm-iconbtn adm-iconbtn--danger" data-act="excluir" data-id="${p.id}" aria-label="Excluir ${S.escapeHTML(p.name)}">${ICONS.trash}</button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }

  document.getElementById('catProdutosBody').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const id = btn.dataset.id;
    const product = P.buscarProduto(id);
    if (!product) return;

    if (btn.dataset.act === 'editar') { location.hash = product.category + '/editar/' + id; }

    if (btn.dataset.act === 'duplicar') {
      P.duplicarProduto(id);
      UI.toast('Produto duplicado.');
      renderCategoria(product.category);
    }

    if (btn.dataset.act === 'alternar') {
      P.alternarDisponibilidade(id);
      UI.toast(product.available ? 'Produto desativado.' : 'Produto ativado.');
      renderCategoria(product.category);
    }

    if (btn.dataset.act === 'excluir') {
      const ok = await UI.confirmDialog({
        title: 'Excluir produto',
        message: 'Tem certeza que deseja excluir "' + product.name + '"? Essa ação não pode ser desfeita.',
        confirmLabel: 'Excluir', danger: true,
      });
      if (ok) {
        P.excluirProduto(id);
        UI.toast('Produto excluído.');
        renderCategoria(product.category);
      }
    }
  });

  /* ---------------- Tela 3: formulário ---------------- */
  let pendingImage = undefined; // undefined = não mexeu; null = removida; string = nova imagem

  function updateImagePreview(src, icon) {
    const box = document.getElementById('fImagemPreview');
    if (src) {
      box.innerHTML = `<img src="${src}" alt="Pré-visualização do produto">`;
    } else {
      box.innerHTML = `<span style="font-size:2.4rem;">${icon || '🛒'}</span><span>Nenhuma imagem — usando ícone de exemplo</span>`;
    }
  }

  function renderForm(category, id) {
    const editing = !!id;
    const product = editing ? P.buscarProduto(id) : null;
    pendingImage = undefined;

    document.getElementById('formTitle').textContent = editing ? 'Editar produto' : 'Cadastrar produto';
    document.getElementById('formDesc').textContent = S.CATEGORY_INFO[category].label + (editing ? ' · ' + product.name : ' · novo produto nesta seção');

    document.getElementById('fUnidade').innerHTML = S.UNIT_OPTIONS.map(u => `<option value="${u}">${u}</option>`).join('');

    const form = document.getElementById('productForm');
    form.reset();
    document.getElementById('formError').hidden = true;
    document.getElementById('fImagem').value = '';

    if (editing) {
      document.getElementById('fNome').value = product.name;
      document.getElementById('fDescricao').value = product.description || '';
      document.getElementById('fPreco').value = product.price || 0;
      document.getElementById('fUnidade').value = product.unit;
      document.getElementById('fCategoria').value = product.category;
      document.getElementById('fEstoque').value = product.stock;
      document.getElementById('fEstoqueMin').value = product.stockMin;
      document.getElementById('fDisponivel').checked = product.available;
      updateImagePreview(product.image, product.icon);
    } else {
      document.getElementById('fCategoria').value = category;
      document.getElementById('fEstoque').value = 0;
      document.getElementById('fEstoqueMin').value = 5;
      document.getElementById('fDisponivel').checked = true;
      updateImagePreview(null, S.CATEGORY_INFO[category].emoji);
    }

    // painel de estoque só existe editando um produto já criado
    document.getElementById('stockPanel').hidden = !editing;
    document.getElementById('historyPanel').hidden = !editing;
    if (editing) {
      document.getElementById('mvType').innerHTML = Object.entries(window.HGServices.inventory.MOVEMENT_TYPES)
        .map(([key, t]) => `<option value="${key}">${S.escapeHTML(t.label)}</option>`).join('');
      renderHistory(id);
    }

    document.getElementById('btnCancelForm').onclick = () => { location.hash = category; };

    form.onsubmit = (e) => {
      e.preventDefault();
      const name = document.getElementById('fNome').value.trim();
      const errorEl = document.getElementById('formError');
      if (!name) {
        errorEl.textContent = 'Informe o nome do produto.';
        errorEl.hidden = false;
        document.getElementById('fNome').focus();
        return;
      }
      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      const originalLabel = submitBtn.textContent;
      submitBtn.textContent = 'Salvando…';

      const novoEstoque = Math.max(0, parseInt(document.getElementById('fEstoque').value, 10) || 0);
      const data = {
        name,
        description: document.getElementById('fDescricao').value.trim(),
        price: parseFloat(document.getElementById('fPreco').value) || 0,
        unit: document.getElementById('fUnidade').value,
        category: document.getElementById('fCategoria').value,
        stockMin: Math.max(0, parseInt(document.getElementById('fEstoqueMin').value, 10) || 0),
        available: document.getElementById('fDisponivel').checked,
      };
      if (pendingImage !== undefined) data.image = pendingImage;

      let saved;
      try {
        if (editing) {
          saved = P.editarProduto(id, data);
          // estoque muda SEMPRE via movimentação registrada — nunca só o número (seção 9)
          const diff = novoEstoque - product.stock;
          if (diff !== 0) {
            window.HGServices.inventory.registrarMovimentacao(id, diff > 0 ? 'ajuste' : 'correcao', Math.abs(diff), 'Ajuste manual pelo formulário de edição', 'administrativo');
          }
        } else {
          data.icon = S.CATEGORY_INFO[data.category].emoji;
          data.stock = 0; // começa em 0; a entrada inicial abaixo é que registra o estoque, já com histórico
          saved = P.criarProduto(data);
          if (novoEstoque > 0) {
            window.HGServices.inventory.registrarMovimentacao(saved.id, 'entrada', novoEstoque, 'Cadastro do produto', 'administrativo');
          }
        }
        UI.toast(editing ? 'Produto atualizado com sucesso.' : 'Produto cadastrado com sucesso.');
        location.hash = saved.category + '/editar/' + saved.id;
        if (editing) renderForm(saved.category, saved.id); // permanece na tela pra continuar editando/estoque
      } catch (err) {
        UI.toast('Não foi possível salvar o produto.', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = originalLabel;
      }
    };
  }

  document.getElementById('fImagem').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const dataUrl = await UI.resizeImageFile(file, 640);
      pendingImage = dataUrl;
      updateImagePreview(dataUrl, null);
    } catch (err) {
      UI.toast(err.message || 'Não foi possível carregar a imagem.', 'error');
    }
  });

  function renderHistory(productId) {
    const rows = I.buscarMovimentacoes({ productId });
    const tbody = document.getElementById('mvHistoryBody');
    if (rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5"><p class="adm-empty-inline">Nenhuma movimentação registrada ainda.</p></td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(m => {
      const t = window.HGServices.inventory.MOVEMENT_TYPES[m.type] || { label: m.type, sign: 1 };
      return `<tr>
        <td>${S.formatDateTime(m.date)}</td>
        <td>${S.escapeHTML(t.label)}</td>
        <td>${t.sign > 0 ? '+' : '−'}${m.qty}</td>
        <td style="text-transform:capitalize;">${S.escapeHTML(m.origem || '—')}</td>
        <td>${S.escapeHTML(m.note || '—')}</td>
      </tr>`;
    }).join('');
  }

  document.getElementById('movementForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const r = parseHash();
    if (r.mode !== 'editar') return;
    const type = document.getElementById('mvType').value;
    const qty = parseInt(document.getElementById('mvQty').value, 10);
    const origem = document.getElementById('mvOrigem').value;
    const note = document.getElementById('mvNote').value.trim();
    if (!qty || qty <= 0) { UI.toast('Informe uma quantidade válida.', 'error'); return; }
    const result = window.HGServices.inventory.registrarMovimentacao(r.id, type, qty, note, origem);
    if (!result) { UI.toast('Não foi possível registrar a movimentação.', 'error'); return; }
    UI.toast('Movimentação registrada com sucesso.');
    document.getElementById('movementForm').reset();
    document.getElementById('fEstoque').value = result.product.stock;
    renderHistory(r.id);
  });

  route();
})();
