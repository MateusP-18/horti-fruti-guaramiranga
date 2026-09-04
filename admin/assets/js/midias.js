(function () {
  'use strict';
  const S = window.HGStore;
  const M = window.HGServices.media;
  const R = window.HGServices.reviews;
  const UI = window.AdminUI;
  UI.initSidebar();

  const ICONS = {
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>',
  };

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

  /* ---------------- Mídias do site ---------------- */
  function renderMedia() {
    const grid = document.getElementById('mediaGrid');
    grid.innerHTML = M.buscarMidias().map(m => {
      const preview = m.src
        ? (m.type === 'video'
            ? `<video src="${m.src}" muted loop autoplay playsinline style="width:100%;height:100%;object-fit:cover;"></video>`
            : `<img src="${m.src}" alt="${S.escapeHTML(m.name)}">`)
        : `<span style="font-size:1.6rem;">${m.type === 'video' ? '🎬' : '🖼️'}</span><span>Sem mídia — usando placeholder no site</span>`;
      return `<div class="adm-panel" style="padding:16px; ${m.active ? '' : 'opacity:.55;'}">
        <div class="adm-media-preview" id="prev-${m.id}">${preview}</div>
        <h3 style="font-size:.92rem; margin:12px 0 2px;">${S.escapeHTML(m.name)}</h3>
        <p style="font-size:.76rem; color:var(--adm-text-60); margin:0 0 12px;">${S.escapeHTML(m.section)} · ${m.type === 'video' ? 'Vídeo' : 'Imagem'}${!m.active ? ' · Desativada' : ''}</p>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button type="button" class="adm-btn adm-btn--ghost adm-btn--sm" data-act="upload" data-id="${m.id}">Alterar ${m.type === 'video' ? 'vídeo' : 'imagem'}</button>
          <button type="button" class="adm-btn adm-btn--ghost adm-btn--sm" data-act="remover" data-id="${m.id}" ${m.src ? '' : 'hidden'}>Remover</button>
          <button type="button" class="adm-btn adm-btn--ghost adm-btn--sm" data-act="alternar" data-id="${m.id}">${m.active ? 'Desativar' : 'Ativar'}</button>
        </div>
        <input type="file" id="file-${m.id}" hidden accept="${m.type === 'video' ? 'video/*' : 'image/*'}">
      </div>`;
    }).join('');
  }

  document.getElementById('mediaGrid').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const id = btn.dataset.id;
    const media = M.buscarMidia(id);

    if (btn.dataset.act === 'upload') document.getElementById('file-' + id).click();

    if (btn.dataset.act === 'remover') {
      const ok = await UI.confirmDialog({ title: 'Remover mídia', message: 'Remover a mídia de "' + media.name + '"? O site volta a usar o placeholder ali.', confirmLabel: 'Remover', danger: true });
      if (ok) { M.removerMidia(id); UI.toast('Mídia removida.'); renderMedia(); }
    }

    if (btn.dataset.act === 'alternar') {
      M.alternarAtiva(id);
      UI.toast(media.active ? 'Mídia desativada.' : 'Mídia ativada.');
      renderMedia();
    }
  });

  document.getElementById('mediaGrid').addEventListener('change', async (e) => {
    const input = e.target.closest('input[type="file"]');
    if (!input) return;
    const id = input.id.replace('file-', '');
    const media = M.buscarMidia(id);
    const file = input.files[0];
    if (!file) return;

    if (media.type === 'video') {
      const url = URL.createObjectURL(file);
      document.getElementById('prev-' + id).innerHTML = `<video src="${url}" muted loop autoplay playsinline style="width:100%;height:100%;object-fit:cover;"></video>`;
      UI.toast('Pré-visualização carregada — vídeos ainda não ficam salvos localmente (ver aviso na tela).', 'error');
      return;
    }
    try {
      const dataUrl = await UI.resizeImageFile(file, 900);
      M.definirMidia(id, dataUrl);
      UI.toast('Imagem atualizada com sucesso.');
      renderMedia();
    } catch (err) {
      UI.toast(err.message || 'Não foi possível carregar a imagem.', 'error');
    }
  });

  /* ---------------- Avaliações ---------------- */
  const STARS = n => '★'.repeat(n) + '☆'.repeat(5 - n);
  let editingReviewId = null;

  function renderReviews() {
    const reviews = R.buscarAvaliacoes();
    const list = document.getElementById('reviewsList');
    if (reviews.length === 0) {
      list.innerHTML = '<div class="adm-empty"><h3>Nenhuma avaliação cadastrada</h3><p>Use "Nova avaliação" para adicionar manualmente.</p></div>';
      return;
    }
    list.innerHTML = reviews.map(r => `
      <div class="adm-panel" style="padding:18px 20px;">
        <div style="display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap;">
          <div>
            <strong>${S.escapeHTML(r.name)}</strong>
            <div style="color:var(--manga); letter-spacing:1px;">${STARS(r.rating)}</div>
          </div>
          <div style="display:flex; gap:8px; align-items:flex-start;">
            <span class="adm-badge adm-badge--${r.status}">${r.status === 'publicada' ? 'Publicada' : 'Oculta'}</span>
            <button type="button" class="adm-iconbtn" data-act="editar" data-id="${r.id}" aria-label="Editar avaliação de ${S.escapeHTML(r.name)}">${ICONS.edit}</button>
            <button type="button" class="adm-iconbtn adm-iconbtn--danger" data-act="excluir" data-id="${r.id}" aria-label="Excluir avaliação de ${S.escapeHTML(r.name)}">${ICONS.trash}</button>
          </div>
        </div>
        <p style="margin:10px 0 6px; font-size:.88rem;">"${S.escapeHTML(r.comment)}"</p>
        <p style="font-size:.74rem; color:var(--adm-text-40); margin:0;">Origem: ${S.escapeHTML(r.source)} · ${S.formatDate(r.date)}</p>
      </div>`).join('');
  }

  const reviewForm = document.getElementById('reviewForm');
  const reviewFormPanel = document.getElementById('reviewFormPanel');

  function openReviewForm(review) {
    editingReviewId = review ? review.id : null;
    document.getElementById('reviewFormTitle').textContent = review ? 'Editar avaliação' : 'Nova avaliação';
    reviewForm.reset();
    document.getElementById('rvNome').value = review ? review.name : '';
    document.getElementById('rvComentario').value = review ? review.comment : '';
    document.getElementById('rvNota').value = review ? review.rating : '5';
    document.getElementById('rvOrigem').value = review ? review.source : 'Google';
    document.getElementById('rvData').value = (review ? review.date : new Date().toISOString()).slice(0, 10);
    document.getElementById('rvStatus').value = review ? review.status : 'publicada';
    reviewFormPanel.hidden = false;
    reviewFormPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    document.getElementById('rvNome').focus();
  }

  document.getElementById('btnNovaAvaliacao').addEventListener('click', () => openReviewForm(null));
  document.getElementById('btnCancelReview').addEventListener('click', () => { reviewFormPanel.hidden = true; });

  reviewForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('rvNome').value.trim();
    const comment = document.getElementById('rvComentario').value.trim();
    if (!name || !comment) { UI.toast('Preencha nome e comentário.', 'error'); return; }
    const data = {
      name, comment,
      rating: parseInt(document.getElementById('rvNota').value, 10),
      source: document.getElementById('rvOrigem').value,
      date: new Date(document.getElementById('rvData').value || Date.now()).toISOString(),
      status: document.getElementById('rvStatus').value,
    };
    R.salvarAvaliacao(data, editingReviewId);
    UI.toast(editingReviewId ? 'Avaliação atualizada com sucesso.' : 'Avaliação adicionada com sucesso.');
    reviewFormPanel.hidden = true;
    renderReviews();
  });

  document.getElementById('reviewsList').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const id = btn.dataset.id;
    if (btn.dataset.act === 'editar') openReviewForm(R.buscarAvaliacoes().find(r => r.id === id));
    if (btn.dataset.act === 'excluir') {
      const ok = await UI.confirmDialog({ title: 'Excluir avaliação', message: 'Tem certeza que deseja excluir esta avaliação? Essa ação não pode ser desfeita.', confirmLabel: 'Excluir', danger: true });
      if (ok) { R.excluirAvaliacao(id); UI.toast('Avaliação excluída.'); renderReviews(); }
    }
  });

  /* ---------------- Comentários ---------------- */
  function renderComments() {
    const comments = R.buscarComentarios();
    const list = document.getElementById('commentsList');
    if (comments.length === 0) {
      list.innerHTML = '<div class="adm-empty"><h3>Nenhum comentário ainda</h3><p>Comentários enviados pelo site vão aparecer aqui.</p></div>';
      return;
    }
    list.innerHTML = comments.map(c => `
      <div class="adm-panel" style="padding:18px 20px;">
        <div style="display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap;">
          <strong>${S.escapeHTML(c.author)}</strong>
          <div style="display:flex; gap:8px; align-items:center;">
            <span class="adm-badge adm-badge--${c.status}">${c.status === 'novo' ? 'Novo' : c.status === 'respondido' ? 'Respondido' : 'Oculto'}</span>
            <button type="button" class="adm-iconbtn adm-iconbtn--danger" data-act="excluir" data-id="${c.id}" aria-label="Excluir comentário de ${S.escapeHTML(c.author)}">${ICONS.trash}</button>
          </div>
        </div>
        <p style="margin:10px 0 4px; font-size:.88rem;">"${S.escapeHTML(c.text)}"</p>
        <p style="font-size:.74rem; color:var(--adm-text-40); margin:0 0 14px;">${S.formatDate(c.date)}</p>

        <div class="adm-field" style="max-width:none;">
          <label style="font-size:.76rem;">Resposta</label>
          <textarea data-reply-for="${c.id}" placeholder="Escreva uma resposta...">${S.escapeHTML(c.reply ? c.reply.text : '')}</textarea>
        </div>
        <div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">
          <button type="button" class="adm-btn adm-btn--primary adm-btn--sm" data-act="responder" data-id="${c.id}">Salvar resposta</button>
          <button type="button" class="adm-btn adm-btn--ghost adm-btn--sm" data-act="ocultar" data-id="${c.id}">${c.status === 'oculto' ? 'Mostrar' : 'Ocultar'}</button>
        </div>
      </div>`).join('');
  }

  document.getElementById('commentsList').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const id = btn.dataset.id;

    if (btn.dataset.act === 'responder') {
      const textarea = document.querySelector('[data-reply-for="' + id + '"]');
      const text = textarea.value.trim();
      if (!text) { UI.toast('Escreva uma resposta antes de salvar.', 'error'); return; }
      R.responderComentario(id, text);
      UI.toast('Resposta salva com sucesso.');
      renderComments();
    }
    if (btn.dataset.act === 'ocultar') {
      const c = R.buscarComentarios().find(c => c.id === id);
      R.definirStatusComentario(id, c.status === 'oculto' ? (c.reply ? 'respondido' : 'novo') : 'oculto');
      renderComments();
    }
    if (btn.dataset.act === 'excluir') {
      const ok = await UI.confirmDialog({ title: 'Excluir comentário', message: 'Tem certeza que deseja excluir este comentário? Essa ação não pode ser desfeita.', confirmLabel: 'Excluir', danger: true });
      if (ok) { R.excluirComentario(id); UI.toast('Comentário excluído.'); renderComments(); }
    }
  });

  renderMedia();
  renderReviews();
  renderComments();
})();
