(function () {
  'use strict';
  const S = window.HGStore;
  const P = window.HGServices.products;
  const Sales = window.HGServices.sales;
  const Pay = window.HGServices.payments;
  const Cash = window.HGServices.cash;
  const UI = window.AdminUI;
  UI.initSidebar();

  /* ---------------- Abas ---------------- */
  document.querySelectorAll('.adm-tabs [data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.adm-tabs [data-tab]').forEach(b => { b.classList.remove('is-active'); b.setAttribute('aria-selected', 'false'); });
      document.querySelectorAll('.adm-tabpanel').forEach(p => { p.hidden = true; });
      btn.classList.add('is-active');
      btn.setAttribute('aria-selected', 'true');
      document.getElementById('tab-' + btn.dataset.tab).hidden = false;
      if (btn.dataset.tab === 'caixa') renderCaixa();
    });
  });

  /* =====================================================================
     VENDAS
     ===================================================================== */
  let vdCart = [];

  function populateProdutoSelect(sel) {
    sel.innerHTML = S.CATEGORY_ORDER.map(cat => {
      const opts = P.buscarProdutos(cat).map(p => `<option value="${p.id}">${S.escapeHTML(p.name)} (${S.formatBRL(p.price)}${S.escapeHTML(p.unit)})</option>`).join('');
      return `<optgroup label="${S.escapeHTML(S.CATEGORY_INFO[cat].label)}">${opts}</optgroup>`;
    }).join('');
  }

  function renderVdItems() {
    const box = document.getElementById('vdItems');
    document.getElementById('vdItemsEmpty').hidden = vdCart.length > 0;
    box.innerHTML = vdCart.map((it, idx) => `
      <div class="adm-field-row-inline" style="justify-content:space-between; background:var(--adm-bg); border-radius:8px; padding:8px 12px;">
        <span style="font-size:.85rem;"><strong>${it.qty}x</strong> ${S.escapeHTML(it.name)} — ${S.formatBRL(it.price * it.qty)}</span>
        <button type="button" class="adm-iconbtn adm-iconbtn--danger" data-idx="${idx}" aria-label="Remover ${S.escapeHTML(it.name)}">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      </div>`).join('');
  }
  document.getElementById('vdItems').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-idx]');
    if (!btn) return;
    vdCart.splice(Number(btn.dataset.idx), 1);
    renderVdItems();
  });

  document.getElementById('vdAddItem').addEventListener('click', () => {
    const sel = document.getElementById('vdProduto');
    const product = P.buscarProduto(sel.value);
    const qty = Math.max(1, parseInt(document.getElementById('vdQty').value, 10) || 1);
    if (!product) return;
    const existing = vdCart.find(i => i.productId === product.id);
    if (existing) existing.qty += qty;
    else vdCart.push({ productId: product.id, name: product.name, qty, price: product.price, category: product.category });
    document.getElementById('vdQty').value = 1;
    renderVdItems();
  });

  function updateTrocoHint(recebidoInput, totalGetter, hintEl) {
    const recebido = parseFloat(recebidoInput.value) || 0;
    const total = totalGetter();
    const troco = recebido - total;
    hintEl.textContent = troco > 0 ? 'Troco: ' + S.formatBRL(troco) : '';
  }

  document.getElementById('vdPagamento').addEventListener('change', (e) => {
    document.getElementById('vdDinheiroBlock').hidden = e.target.value !== 'Dinheiro';
  });
  document.getElementById('vdRecebido').addEventListener('input', () => {
    updateTrocoHint(document.getElementById('vdRecebido'), () => vdCart.reduce((s, i) => s + i.price * i.qty, 0), document.getElementById('vdTrocoHint'));
  });

  function openVendaForm() {
    vdCart = [];
    populateProdutoSelect(document.getElementById('vdProduto'));
    document.getElementById('vdPagamento').innerHTML = Pay.METHODS.map(m => `<option>${m}</option>`).join('');
    document.getElementById('vdDinheiroBlock').hidden = true;
    document.getElementById('vendaError').hidden = true;
    document.getElementById('vendaForm').reset();
    renderVdItems();
    document.getElementById('vendaFormPanel').hidden = false;
    document.getElementById('vendaFormPanel').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  document.getElementById('btnNovaVenda').addEventListener('click', openVendaForm);
  document.getElementById('btnCancelVenda').addEventListener('click', () => { document.getElementById('vendaFormPanel').hidden = true; });

  document.getElementById('vendaForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('vendaError');
    if (vdCart.length === 0) { errorEl.textContent = 'Adicione ao menos um item à venda.'; errorEl.hidden = false; return; }
    errorEl.hidden = true;

    const status = document.getElementById('vdStatusPg').value;
    const sale = Sales.registrarVenda({ origem: 'presencial', items: vdCart, status });
    const metodo = document.getElementById('vdPagamento').value;
    const recebido = metodo === 'Dinheiro' ? (parseFloat(document.getElementById('vdRecebido').value) || sale.total) : sale.total;
    Pay.registrarPagamento({ saleId: sale.id, method: metodo, status, valorVenda: sale.total, valorRecebido: recebido });

    UI.toast('Venda registrada com sucesso.');
    document.getElementById('vendaFormPanel').hidden = true;
    renderVendas();
  });

  function renderVendas() {
    const list = Sales.buscarVendas();
    const wrap = document.querySelector('#vendasBody').closest('.adm-table-wrap');
    if (list.length === 0) {
      wrap.hidden = true;
      document.getElementById('vendasEmpty').hidden = false;
      return;
    }
    wrap.hidden = false;
    document.getElementById('vendasEmpty').hidden = true;
    document.getElementById('vendasBody').innerHTML = list.map(v => {
      const resumo = v.items.map(i => i.qty + 'x ' + i.name).join(', ');
      return `<tr>
        <td>${S.formatDateTime(v.date)}</td>
        <td style="text-transform:capitalize;">${S.escapeHTML(v.origem)}</td>
        <td style="max-width:260px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${S.escapeHTML(resumo)}">${S.escapeHTML(resumo)}</td>
        <td>${S.formatBRL(v.total)}</td>
        <td>
          <select data-act="status" data-id="${v.id}" style="border:1px solid var(--adm-border); border-radius:6px; padding:4px 6px; font-size:.78rem;">
            ${Object.entries(Sales.STATUS_LABELS).map(([k, l]) => `<option value="${k}" ${k === v.status ? 'selected' : ''}>${l}</option>`).join('')}
          </select>
        </td>
        <td></td>
      </tr>`;
    }).join('');
  }

  document.getElementById('vendasBody').addEventListener('change', (e) => {
    const sel = e.target.closest('[data-act="status"]');
    if (!sel) return;
    Sales.atualizarStatusVenda(sel.dataset.id, sel.value);
    UI.toast('Status da venda atualizado.');
  });

  /* =====================================================================
     PAGAMENTOS
     ===================================================================== */
  function populatePgForm() {
    const vendas = Sales.buscarVendas();
    document.getElementById('pgVenda').innerHTML = vendas.length
      ? vendas.map(v => `<option value="${v.id}">#${v.id.slice(-6)} — ${S.formatBRL(v.total)} — ${Sales.STATUS_LABELS[v.status]} (${S.formatDate(v.date)})</option>`).join('')
      : '<option value="">Nenhuma venda registrada ainda</option>';
    document.getElementById('pgMetodo').innerHTML = Pay.METHODS.map(m => `<option>${m}</option>`).join('');
  }
  document.getElementById('pgMetodo').addEventListener('change', (e) => {
    document.getElementById('pgDinheiroBlock').hidden = e.target.value !== 'Dinheiro';
  });
  document.getElementById('pgRecebido').addEventListener('input', () => {
    const sale = Sales.buscarVenda(document.getElementById('pgVenda').value);
    updateTrocoHint(document.getElementById('pgRecebido'), () => sale ? sale.total : 0, document.getElementById('pgTrocoHint'));
  });

  document.getElementById('pgForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const saleId = document.getElementById('pgVenda').value;
    const errorEl = document.getElementById('pgError');
    const sale = Sales.buscarVenda(saleId);
    if (!sale) { errorEl.textContent = 'Escolha uma venda válida.'; errorEl.hidden = false; return; }
    errorEl.hidden = true;
    const metodo = document.getElementById('pgMetodo').value;
    const status = document.getElementById('pgStatus').value;
    const recebido = metodo === 'Dinheiro' ? (parseFloat(document.getElementById('pgRecebido').value) || sale.total) : sale.total;
    Pay.registrarPagamento({ saleId, method: metodo, status, valorVenda: sale.total, valorRecebido: recebido });
    Sales.atualizarStatusVenda(saleId, status);
    UI.toast('Pagamento registrado com sucesso.');
    document.getElementById('pgForm').reset();
    populatePgForm();
    renderPagamentos();
    renderVendas();
  });

  function renderPagamentos() {
    const list = Pay.buscarPagamentos();
    const wrap = document.querySelector('#pagamentosBody').closest('.adm-table-wrap');
    if (list.length === 0) {
      wrap.hidden = true;
      document.getElementById('pagamentosEmpty').hidden = false;
      return;
    }
    wrap.hidden = false;
    document.getElementById('pagamentosEmpty').hidden = true;
    document.getElementById('pagamentosBody').innerHTML = list.map(pg => `
      <tr>
        <td>${S.formatDateTime(pg.date)}</td>
        <td>${S.escapeHTML(pg.method)}</td>
        <td>${S.formatBRL(pg.valorVenda)}</td>
        <td>${S.formatBRL(pg.valorRecebido)}</td>
        <td>${pg.troco ? S.formatBRL(pg.troco) : '—'}</td>
        <td><span class="adm-badge adm-badge--${pg.status === 'pago' ? 'normal' : pg.status === 'cancelado' || pg.status === 'estornado' ? 'esgotado' : 'baixo'}">${Sales.STATUS_LABELS[pg.status] || pg.status}</span></td>
      </tr>`).join('');
  }

  /* =====================================================================
     CAIXA
     ===================================================================== */
  document.getElementById('abrirCaixaForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const reg = Cash.abrirCaixa({ valorInicial: parseFloat(document.getElementById('cxInicial').value) || 0, responsavel: document.getElementById('cxResponsavel').value.trim() });
    if (!reg) { UI.toast('Já existe um caixa aberto.', 'error'); return; }
    UI.toast('Caixa aberto com sucesso.');
    document.getElementById('abrirCaixaForm').reset();
    renderCaixa();
  });

  document.getElementById('cxMovForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const type = document.getElementById('cxMovTipo').value;
    const valor = parseFloat(document.getElementById('cxMovValor').value);
    const note = document.getElementById('cxMovNota').value.trim();
    if (!(valor > 0)) { UI.toast('Informe um valor válido.', 'error'); return; }
    Cash.registrarMovimentacaoCaixa({ type, valor, note });
    UI.toast('Movimentação de caixa registrada.');
    document.getElementById('cxMovForm').reset();
    renderCaixa();
  });

  document.getElementById('fecharCaixaForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const reg = Cash.caixaAberto();
    const totalInformado = parseFloat(document.getElementById('cxInformado').value);
    if (isNaN(totalInformado)) { UI.toast('Informe o total contado.', 'error'); return; }
    const resumo = Cash.resumoCaixa(reg.id);
    const diff = totalInformado - resumo.totalEsperado;
    const ok = await UI.confirmDialog({
      title: 'Fechar caixa',
      message: 'Esperado: ' + S.formatBRL(resumo.totalEsperado) + ' · Informado: ' + S.formatBRL(totalInformado) + ' · Diferença: ' + S.formatBRL(diff) + '. Confirmar fechamento?',
      confirmLabel: 'Fechar caixa', danger: Math.abs(diff) > 0.009,
    });
    if (!ok) return;
    Cash.fecharCaixa(reg.id, { totalInformado });
    UI.toast('Caixa fechado com sucesso.');
    renderCaixa();
  });

  function renderCaixa() {
    const reg = Cash.caixaAberto();
    document.getElementById('caixaFechado').hidden = !!reg;
    document.getElementById('caixaAberto').hidden = !reg;
    if (reg) {
      const resumo = Cash.resumoCaixa(reg.id);
      document.getElementById('cxCards').innerHTML = [
        ['Aberto desde', S.formatDateTime(reg.dataAbertura)],
        ['Responsável', reg.responsavel || '—'],
        ['Saldo inicial', S.formatBRL(resumo.saldoInicial)],
        ['Vendas em dinheiro', S.formatBRL(resumo.porMetodo['Dinheiro'] || 0)],
        ['Vendas em PIX', S.formatBRL(resumo.porMetodo['PIX'] || 0)],
        ['Vendas em débito', S.formatBRL(resumo.porMetodo['Débito'] || 0)],
        ['Vendas em crédito', S.formatBRL(resumo.porMetodo['Crédito'] || 0)],
        ['Entradas', S.formatBRL(resumo.entradas)],
        ['Retiradas', S.formatBRL(resumo.retiradas)],
        ['Total esperado (dinheiro)', S.formatBRL(resumo.totalEsperado)],
      ].map(([l, v]) => `<div class="adm-card"><div class="adm-card__label">${S.escapeHTML(l)}</div><div class="adm-card__value" style="font-size:1.1rem;">${v}</div></div>`).join('');

      document.getElementById('cxResumo').innerHTML =
        `<p>Saldo inicial: <strong>${S.formatBRL(resumo.saldoInicial)}</strong></p>
         <p>+ Vendas em dinheiro: <strong>${S.formatBRL(resumo.porMetodo['Dinheiro'] || 0)}</strong></p>
         <p>+ Entradas: <strong>${S.formatBRL(resumo.entradas)}</strong> · − Retiradas: <strong>${S.formatBRL(resumo.retiradas)}</strong></p>
         <p style="border-top:1px solid var(--adm-border); padding-top:8px; margin-top:8px;">Total esperado: <strong>${S.formatBRL(resumo.totalEsperado)}</strong></p>`;

      const movs = Cash.buscarMovimentacoesCaixa(reg.id);
      document.getElementById('cxMovBody').innerHTML = movs.length
        ? movs.map(m => `<tr><td>${S.formatDateTime(m.date)}</td><td style="text-transform:capitalize;">${m.type}</td><td>${S.formatBRL(m.valor)}</td><td>${S.escapeHTML(m.note || '—')}</td></tr>`).join('')
        : '<tr><td colspan="4"><p class="adm-empty-inline">Nenhuma movimentação de caixa ainda.</p></td></tr>';
    }

    const historico = Cash.buscarCaixas().filter(c => c.status === 'fechado');
    const histWrap = document.querySelector('#cxHistBody').closest('.adm-table-wrap');
    if (historico.length === 0) {
      histWrap.hidden = true;
      document.getElementById('cxHistEmpty').hidden = false;
    } else {
      histWrap.hidden = false;
      document.getElementById('cxHistEmpty').hidden = true;
      document.getElementById('cxHistBody').innerHTML = historico.map(c => {
        const resumo = Cash.resumoCaixa(c.id);
        const diff = c.totalInformado - resumo.totalEsperado;
        return `<tr>
          <td>${S.formatDateTime(c.dataAbertura)}</td><td>${S.formatDateTime(c.dataFechamento)}</td><td>${S.escapeHTML(c.responsavel || '—')}</td>
          <td>${S.formatBRL(c.valorInicial)}</td><td>${S.formatBRL(resumo.totalEsperado)}</td><td>${S.formatBRL(c.totalInformado)}</td>
          <td style="color:${Math.abs(diff) > 0.009 ? 'var(--pitaya)' : 'inherit'}; font-weight:${Math.abs(diff) > 0.009 ? '700' : '400'};">${S.formatBRL(diff)}</td>
        </tr>`;
      }).join('');
    }
  }

  renderVendas();
  populatePgForm();
  renderPagamentos();
  renderCaixa();
})();
