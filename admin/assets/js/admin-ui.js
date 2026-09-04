/* =========================================================================
   HORTIFRUTI GUARAMIRANGA — PAINEL ADMINISTRATIVO
   UI compartilhada (admin-ui.js): sidebar, confirmação, toast, gráficos.
   Sem bibliotecas externas — SVG e CSS puros, igual ao restante do projeto.
   ========================================================================= */

(function () {
  'use strict';

  const esc = window.HGStore ? window.HGStore.escapeHTML : (s) => s;

  /* ---------- Sidebar (mobile) + link ativo ---------- */
  function initSidebar() {
    const toggle = document.getElementById('admToggle');
    const sidebar = document.getElementById('admSidebar');
    const overlay = document.getElementById('admSidebarOverlay');

    function close() {
      sidebar.classList.remove('is-open');
      overlay.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    }
    function open() {
      sidebar.classList.add('is-open');
      overlay.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
    }
    if (toggle && sidebar && overlay) {
      toggle.addEventListener('click', () => {
        sidebar.classList.contains('is-open') ? close() : open();
      });
      overlay.addEventListener('click', close);
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    }

    // marca o link ativo pela URL atual
    const here = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.adm-nav a').forEach(a => {
      const href = a.getAttribute('href').split('#')[0];
      if (href === here) a.classList.add('is-active');
    });
  }

  /* ---------- Toast ---------- */
  let toastTimer = null;
  function toast(message, type) {
    let el = document.getElementById('admToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'admToast';
      el.className = 'adm-toast';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.className = 'adm-toast is-visible' + (type === 'error' ? ' adm-toast--error' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.className = 'adm-toast'; }, 2800);
  }

  /* ---------- Confirmação (usada antes de excluir) ---------- */
  function confirmDialog(opts) {
    const { title, message, confirmLabel, danger } = Object.assign(
      { title: 'Confirmar ação', message: 'Tem certeza?', confirmLabel: 'Confirmar', danger: false }, opts || {}
    );
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'adm-confirm-overlay';
      overlay.innerHTML =
        '<div class="adm-confirm" role="alertdialog" aria-modal="true" aria-labelledby="admConfirmTitle">' +
          '<h3 id="admConfirmTitle">' + esc(title) + '</h3>' +
          '<p>' + esc(message) + '</p>' +
          '<div class="adm-confirm__actions">' +
            '<button type="button" class="adm-btn adm-btn--ghost" data-act="cancel">Cancelar</button>' +
            '<button type="button" class="adm-btn ' + (danger ? 'adm-btn--danger' : 'adm-btn--primary') + '" data-act="confirm">' + esc(confirmLabel) + '</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(overlay);
      document.body.style.overflow = 'hidden';
      const lastFocused = document.activeElement;
      const confirmBtn = overlay.querySelector('[data-act="confirm"]');
      confirmBtn.focus();

      function cleanup(result) {
        document.body.removeChild(overlay);
        document.body.style.overflow = '';
        if (lastFocused) lastFocused.focus();
        document.removeEventListener('keydown', onKey);
        resolve(result);
      }
      function onKey(e) {
        if (e.key === 'Escape') cleanup(false);
        if (e.key === 'Enter') cleanup(true);
      }
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) cleanup(false);
        const act = e.target.closest('[data-act]');
        if (act) cleanup(act.dataset.act === 'confirm');
      });
      document.addEventListener('keydown', onKey);
    });
  }

  /* ---------- Gráfico de rosca (donut) — SVG puro ---------- */
  // segments: [{ label, value, color }]
  function renderDonut(container, segments, opts) {
    opts = opts || {};
    const total = segments.reduce((s, x) => s + x.value, 0);
    const size = opts.size || 160;
    const stroke = opts.stroke || 22;
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    let offset = 0;

    let circles = '';
    if (total === 0) {
      circles = `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--adm-border)" stroke-width="${stroke}"/>`;
    } else {
      segments.forEach(seg => {
        if (seg.value <= 0) return;
        const len = (seg.value / total) * c;
        circles += `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${seg.color}" stroke-width="${stroke}"
          stroke-dasharray="${len} ${c - len}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${size / 2} ${size / 2})"/>`;
        offset += len;
      });
    }

    const legend = segments.map(seg =>
      `<li><span class="adm-legend-dot" style="background:${seg.color}"></span>${esc(seg.label)} <strong>${seg.value}</strong></li>`
    ).join('');

    container.innerHTML =
      `<div class="adm-donut">
        <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="Gráfico de estoque">
          ${circles}
          <text x="${size / 2}" y="${size / 2 - 4}" text-anchor="middle" class="adm-donut__total">${total}</text>
          <text x="${size / 2}" y="${size / 2 + 16}" text-anchor="middle" class="adm-donut__label">produtos</text>
        </svg>
        <ul class="adm-legend">${legend}</ul>
      </div>`;
  }

  /* ---------- Gráfico de barras horizontais — SVG/CSS puro ---------- */
  // items: [{ label, value }]
  function renderBars(container, items, opts) {
    opts = opts || {};
    const max = opts.max || Math.max(1, ...items.map(i => i.value));
    const color = opts.color || 'var(--mata)';
    const unit = opts.unit || '';

    if (items.length === 0) {
      container.innerHTML = '<p class="adm-empty-inline">Sem dados para exibir.</p>';
      return;
    }

    container.innerHTML = '<div class="adm-bars">' + items.map(i => {
      const pct = Math.max(2, Math.round((i.value / max) * 100));
      return `<div class="adm-bar-row">
        <span class="adm-bar-label">${esc(i.label)}</span>
        <span class="adm-bar-track"><span class="adm-bar-fill" style="width:${pct}%; background:${color}"></span></span>
        <span class="adm-bar-value">${i.value}${esc(unit)}</span>
      </div>`;
    }).join('') + '</div>';
  }

  /* ---------- Upload de imagem (sem backend): redimensiona no navegador e
     devolve uma data URL, pra funcionar de verdade na demonstração sem
     estourar o limite do localStorage. ---------- */
  function resizeImageFile(file, maxDim) {
    maxDim = maxDim || 640;
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith('image/')) { reject(new Error('Arquivo não é uma imagem.')); return; }
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Não foi possível abrir a imagem.'));
        img.onload = () => {
          let { width, height } = img;
          if (width > height && width > maxDim) { height = Math.round(height * (maxDim / width)); width = maxDim; }
          else if (height > maxDim) { width = Math.round(width * (maxDim / height)); height = maxDim; }
          const canvas = document.createElement('canvas');
          canvas.width = width; canvas.height = height;
          canvas.getContext('2d').drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  /* ---------- Filtro de período global (calendário oficial) ---------- */
  const PERIOD_OPTIONS = [
    ['hoje', 'Hoje'], ['ontem', 'Ontem'],
    ['semana', 'Esta semana'], ['semana_anterior', 'Semana anterior'],
    ['mes', 'Este mês'], ['mes_anterior', 'Mês anterior'],
    ['ano', 'Este ano'], ['ano_anterior', 'Ano anterior'],
    ['total', 'Total histórico'], ['custom', 'Personalizado'],
  ];
  function renderPeriodFilter(container, onChange, defaultKey) {
    const S = window.HGStore;
    container.innerHTML =
      '<div class="adm-filters" id="pfButtons">' +
        PERIOD_OPTIONS.map(([k, label]) => `<button type="button" data-period="${k}" class="${k === (defaultKey || 'mes') ? 'is-active' : ''}">${label}</button>`).join('') +
      '</div>' +
      '<div class="adm-field-row-inline" id="pfCustom" hidden style="margin:-8px 0 16px; gap:10px; flex-wrap:wrap;">' +
        '<label style="font-size:.8rem; font-weight:700;">De <input type="date" id="pfStart" style="border:1.5px solid var(--adm-border); border-radius:8px; padding:6px 10px;"></label>' +
        '<label style="font-size:.8rem; font-weight:700;">Até <input type="date" id="pfEnd" style="border:1.5px solid var(--adm-border); border-radius:8px; padding:6px 10px;"></label>' +
        '<button type="button" class="adm-btn adm-btn--sm adm-btn--primary" id="pfApply">Aplicar</button>' +
      '</div>';

    const customBox = container.querySelector('#pfCustom');
    function emit(key) {
      if (key === 'custom') {
        customBox.hidden = false;
        const s = container.querySelector('#pfStart').value;
        const e = container.querySelector('#pfEnd').value;
        onChange(S.getPeriodRange('custom', s ? new Date(s) : null, e ? new Date(e) : null));
      } else {
        customBox.hidden = true;
        onChange(S.getPeriodRange(key));
      }
    }
    container.querySelectorAll('[data-period]').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('[data-period]').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        emit(btn.dataset.period);
      });
    });
    container.querySelector('#pfApply').addEventListener('click', () => emit('custom'));
    onChange(S.getPeriodRange(defaultKey || 'mes'));
  }

  window.AdminUI = { initSidebar, toast, confirmDialog, renderDonut, renderBars, resizeImageFile, renderPeriodFilter };
})();
