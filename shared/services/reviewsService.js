/* =========================================================================
   shared/services/reviewsService.js
   Avaliações (cadastradas manualmente, com origem) e comentários do site.
   ========================================================================= */
(function () {
  'use strict';
  const S = window.HGStore;
  const REVIEW_SOURCES = ['Google', 'Instagram', 'Facebook', 'Site', 'Outro'];

  /* ---- Avaliações ---- */
  function buscarAvaliacoes() {
    return S._state().reviews.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
  }
  function salvarAvaliacao(data, id) {
    const st = S._state();
    if (id) {
      const idx = st.reviews.findIndex(r => r.id === id);
      if (idx === -1) return null;
      st.reviews[idx] = { ...st.reviews[idx], ...data };
      S._persist();
      return st.reviews[idx];
    }
    const review = { id: S.uid('rv'), date: new Date().toISOString(), status: 'publicada', ...data };
    st.reviews.push(review);
    S._persist();
    return review;
  }
  function excluirAvaliacao(id) {
    const st = S._state();
    st.reviews = st.reviews.filter(r => r.id !== id);
    S._persist();
  }

  /* ---- Comentários ---- */
  function buscarComentarios() {
    return S._state().comments.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
  }
  function responderComentario(id, text) {
    const c = S._state().comments.find(c => c.id === id);
    if (!c) return null;
    c.reply = { text, date: new Date().toISOString() };
    c.status = 'respondido';
    S._persist();
    return c;
  }
  function definirStatusComentario(id, status) {
    const c = S._state().comments.find(c => c.id === id);
    if (!c) return null;
    c.status = status;
    S._persist();
    return c;
  }
  function excluirComentario(id) {
    const st = S._state();
    st.comments = st.comments.filter(c => c.id !== id);
    S._persist();
  }

  window.HGServices = window.HGServices || {};
  window.HGServices.reviews = {
    REVIEW_SOURCES, buscarAvaliacoes, salvarAvaliacao, excluirAvaliacao,
    buscarComentarios, responderComentario, definirStatusComentario, excluirComentario,
  };
})();
