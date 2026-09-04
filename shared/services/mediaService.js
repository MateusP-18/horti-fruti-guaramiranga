/* =========================================================================
   shared/services/mediaService.js
   ========================================================================= */
(function () {
  'use strict';
  const S = window.HGStore;

  function buscarMidias() { return S._state().media.slice(); }
  function buscarMidia(id) { return S._state().media.find(m => m.id === id) || null; }
  function definirMidia(id, src) {
    const m = buscarMidia(id);
    if (!m) return null;
    m.src = src;
    S._persist();
    return m;
  }
  function removerMidia(id) { return definirMidia(id, null); }
  function alternarAtiva(id) {
    const m = buscarMidia(id);
    if (!m) return null;
    m.active = !m.active;
    S._persist();
    return m;
  }

  window.HGServices = window.HGServices || {};
  window.HGServices.media = { buscarMidias, buscarMidia, definirMidia, removerMidia, alternarAtiva };
})();
