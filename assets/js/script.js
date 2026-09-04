(() => {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Compensa a altura do header fixo na rolagem até âncoras ---------- */
  const headerEl = document.querySelector('.header');

  const updateHeaderOffset = () => {
    if (!headerEl) return;
    document.documentElement.style.setProperty('--header-h', headerEl.offsetHeight + 'px');
  };

  updateHeaderOffset();
  window.addEventListener('resize', updateHeaderOffset);
  window.addEventListener('load', updateHeaderOffset);

  /* ---------- Menu mobile ---------- */
  const navToggle = document.getElementById('navToggle');
  const nav = document.getElementById('nav');

  if (navToggle && nav) {
    navToggle.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
      navToggle.setAttribute('aria-label', isOpen ? 'Fechar menu' : 'Abrir menu');
    });

    nav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        nav.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.setAttribute('aria-label', 'Abrir menu');
      });
    });
  }

  /* ---------- Link ativo no menu conforme a seção visível ---------- */
  const navLinks = nav ? Array.from(nav.querySelectorAll('a')) : [];
  const sections = navLinks
    .map(link => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);

  if ('IntersectionObserver' in window && sections.length) {
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const id = '#' + entry.target.id;
        const link = navLinks.find(l => l.getAttribute('href') === id);
        if (!link) return;
        if (entry.isIntersecting) {
          navLinks.forEach(l => l.classList.remove('is-active'));
          link.classList.add('is-active');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    sections.forEach(sec => sectionObserver.observe(sec));
  }

  /* ---------- Reveal on scroll ---------- */
  const revealEls = document.querySelectorAll('[data-reveal]');

  if ('IntersectionObserver' in window && !reducedMotion) {
    const revealObserver = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    revealEls.forEach(el => revealObserver.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('is-visible'));
  }

  /* ---------- Contador de seguidores ---------- */
  const counters = document.querySelectorAll('[data-count]');

  const animateCount = (el) => {
    const target = parseInt(el.getAttribute('data-count'), 10) || 0;
    if (reducedMotion) {
      el.textContent = target.toLocaleString('pt-BR') + '+';
      return;
    }
    const duration = 1200;
    const start = performance.now();

    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.floor(eased * target).toLocaleString('pt-BR') + '+';
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  if ('IntersectionObserver' in window && counters.length) {
    const countObserver = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.6 });

    counters.forEach(el => countObserver.observe(el));
  }

  /* =========================================================================
     LOJA — produtos, carrossel, modal, carrinho e pedido pelo WhatsApp
     Lógica adaptada do projeto de referência "Rebouças Brand" (carrossel por
     páginas, modal, drawer de carrinho), reescrita para o catálogo de um
     hortifruti/açougue (sem seleção de tamanho; com unidade e estoque).
     ========================================================================= */

  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  // Configuração central — o link é o MESMO já usado no resto do site (header,
  // hero, açougue, localização, footer). Trocar aqui também exige trocar lá.
  const CONFIG = {
    WHATSAPP_LINK: 'https://wa.me/message/4MNKUYFCIBTYP1',
  };

  // Escapa texto vindo dos dados do produto antes de inserir via innerHTML —
  // hoje os dados são fixos (hardcoded), mas isso prepara o terreno para
  // quando nome/descrição vierem de um banco (ver seção "PREPARADO PARA
  // SUPABASE" no README): nunca confiar em string de fora sem escapar.
  function escapeHTML(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* ---------- Categorias ---------- */
  const CATEGORY_INFO = {
    hortifruti: { label: 'Hortifruti', emoji: '🥬' },
    polpas:     { label: 'Polpas',     emoji: '🧃' },
    acougue:    { label: 'Açougue',    emoji: '🥩' },
  };
  const CATEGORY_ORDER = ['hortifruti', 'polpas', 'acougue'];

  /* ---------- Catálogo de produtos ---------------------------------------
     Vem do serviço compartilhado (shared/services/productsService.js), que
     lê do mesmo armazenamento local usado pelo painel administrativo — é a
     "mesma fonte de dados" pedida na evolução do projeto, pra nunca o site
     mostrar um produto disponível que o painel já marcou como esgotado (ou
     vice-versa). Ver shared/README.md.

     Preços de exemplo ficam em 0 (exibidos como "R$ 00,00") até serem
     cadastrados de verdade no painel administrativo.

     Único ponto de leitura do catálogo — no futuro, quando o serviço
     passar a falar com o Supabase por dentro, nada aqui precisa mudar.
     ------------------------------------------------------------------- */
  function getProducts(category) {
    return window.HGServices.products.buscarProdutos(category);
  }
  function findProduct(id) {
    return window.HGServices.products.buscarProduto(id);
  }
  function isAvailable(product) {
    return window.HGServices.products.estaDisponivel(product);
  }

  /* ---------- Estado ---------- */
  const shopState = {
    cart: [],           // {productId, name, price, unit, qty, category}
    modalProduct: null,
    modalQty: 1,
    carouselPage: { hortifruti: 0, polpas: 0, acougue: 0 },
    cartOpen: false,
  };

  const formatBRL = (v) => v === 0
    ? 'R$ 00,00' // placeholder proposital enquanto os preços reais não são cadastrados
    : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  function itemsPerPage() {
    const w = window.innerWidth;
    if (w >= 1200) return 4;
    if (w >= 760) return 3;
    return 2;
  }

  /* ---------- Card de produto ---------- */
  const ADD_ICON_SVG = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';

  function createProductCard(product) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'product-card js-open-product';
    card.dataset.id = product.id;
    if (!isAvailable(product)) card.disabled = true;
    card.setAttribute('role', 'listitem');
    card.setAttribute('aria-label', product.name + ', ' + formatBRL(product.price) + ' ' + product.unit + (isAvailable(product) ? '' : ', indisponível'));
    card.innerHTML =
      '<span class="ph" aria-hidden="true"><span class="ph__icon">' + (product.icon || '🛒') + '</span></span>' +
      (!isAvailable(product) ? '<span class="product-card__unavailable">Indisponível</span>' : '') +
      '<span class="product-card__body">' +
        '<span class="product-card__name">' + escapeHTML(product.name) + '</span>' +
        '<span class="product-card__price">' + formatBRL(product.price) + ' <small>' + escapeHTML(product.unit) + '</small></span>' +
        '<span class="product-card__add">' + ADD_ICON_SVG + (isAvailable(product) ? 'Ver produto' : 'Indisponível') + '</span>' +
      '</span>';
    return card;
  }

  function renderCarousel(category) {
    const root = $('.carousel[data-carousel="' + category + '"]');
    if (!root) return;
    const track = $('.carousel-track', root);
    const list = getProducts(category);
    const perPage = itemsPerPage();

    track.style.gridTemplateColumns = 'repeat(' + Math.min(perPage, Math.max(list.length, 1)) + ',1fr)';

    if (list.length === 0) {
      track.innerHTML = '<p class="carousel-empty">Nenhum produto cadastrado nesta categoria no momento.</p>';
      $('.carousel-arrow.left', root).hidden = true;
      $('.carousel-arrow.right', root).hidden = true;
      return;
    }

    const totalPages = Math.max(1, Math.ceil(list.length / perPage));
    let page = shopState.carouselPage[category] || 0;
    if (page > totalPages - 1) page = totalPages - 1;
    shopState.carouselPage[category] = page;

    track.innerHTML = '';
    const start = page * perPage;
    list.slice(start, start + perPage).forEach(p => track.appendChild(createProductCard(p)));

    $('.carousel-arrow.left', root).hidden = page <= 0;
    $('.carousel-arrow.right', root).hidden = page >= totalPages - 1;
  }

  function renderAllCarousels() {
    CATEGORY_ORDER.forEach(renderCarousel);
  }

  document.addEventListener('click', (e) => {
    const leftBtn = e.target.closest('.carousel-arrow.left');
    const rightBtn = e.target.closest('.carousel-arrow.right');
    if (leftBtn || rightBtn) {
      const root = e.target.closest('.carousel');
      const category = root.dataset.carousel;
      shopState.carouselPage[category] = (shopState.carouselPage[category] || 0) + (leftBtn ? -1 : 1);
      renderCarousel(category);
      root.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'nearest' });
      return;
    }
    const card = e.target.closest('.js-open-product');
    if (card && !card.disabled) openProductModal(card.dataset.id);
  });

  // swipe (toque) + acessibilidade dos carrosséis
  $$('.carousel-viewport').forEach((viewport) => {
    const root = viewport.closest('.carousel');
    const category = root.dataset.carousel;
    const info = CATEGORY_INFO[category];
    viewport.setAttribute('role', 'group');
    viewport.setAttribute('aria-roledescription', 'carrossel');
    if (info) viewport.setAttribute('aria-label', 'Produtos — ' + info.label);
    viewport.setAttribute('tabindex', '0');

    let startX = 0, active = false;
    viewport.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; active = true; }, { passive: true });
    viewport.addEventListener('touchend', (e) => {
      if (!active) return;
      active = false;
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) < 40) return;
      const list = getProducts(category);
      const totalPages = Math.max(1, Math.ceil(list.length / itemsPerPage()));
      const page = shopState.carouselPage[category] || 0;
      if (dx < 0 && page < totalPages - 1) shopState.carouselPage[category] = page + 1;
      if (dx > 0 && page > 0) shopState.carouselPage[category] = page - 1;
      renderCarousel(category);
    }, { passive: true });

    viewport.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      const btn = root.querySelector(e.key === 'ArrowLeft' ? '.carousel-arrow.left' : '.carousel-arrow.right');
      if (btn && !btn.hidden) btn.click();
    });
  });

  /* ---------- Modal do produto ---------- */
  const modalOverlay = $('#modal-overlay');
  const productModalEl = $('#product-modal');
  if (productModalEl) productModalEl.addEventListener('click', (e) => e.stopPropagation());
  let lastFocusedEl = null;

  function openProductModal(id) {
    const product = findProduct(id);
    if (!product) return;
    shopState.modalProduct = product;
    shopState.modalQty = 1;
    window.HGServices.analytics.registrarEvento('product_view', product.id);

    $('#modal-title').textContent = product.name;
    $('#modal-price').innerHTML = formatBRL(product.price) + ' <small>' + escapeHTML(product.unit) + '</small>';
    $('#modal-desc').textContent = product.description;
    $('#modal-icon').textContent = product.icon || '🛒';
    $('#modal-media-label').textContent = 'Foto: ' + product.name;
    $('#modal-qty-value').textContent = '1';

    const qtyBlock = $('#modal-qty-block');
    const unavailableNote = $('#modal-unavailable-note');
    qtyBlock.hidden = !isAvailable(product);
    unavailableNote.hidden = isAvailable(product);
    updateModalQtyButtons();

    lastFocusedEl = document.activeElement;
    modalOverlay.classList.add('is-open');
    modalOverlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    $('.modal-close', modalOverlay).focus();
  }

  function closeProductModal() {
    modalOverlay.classList.remove('is-open');
    modalOverlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = shopState.cartOpen ? 'hidden' : '';
    if (lastFocusedEl) lastFocusedEl.focus();
  }

  function remainingStock(product) {
    const item = shopState.cart.find(i => i.productId === product.id);
    const used = item ? item.qty : 0;
    return Math.max(0, product.stock - used);
  }

  function currentStockNote() {
    const product = shopState.modalProduct;
    if (!product) return '';
    const remaining = remainingStock(product);
    const maxQty = Math.min(20, remaining);
    if (remaining <= 5) return 'Estoque disponível: ' + remaining + ' ' + product.unit.replace('/', '');
    if (shopState.modalQty >= maxQty) return 'Quantidade máxima disponível atingida.';
    return '';
  }

  function updateModalQtyButtons() {
    const product = shopState.modalProduct;
    if (!product) return;
    $('#modal-qty-minus').disabled = shopState.modalQty <= 1;
    const maxQty = Math.min(20, remainingStock(product));
    $('#modal-qty-plus').disabled = shopState.modalQty >= maxQty;
    $('#modal-stock-note').textContent = currentStockNote();
  }

  $('#modal-qty-minus').addEventListener('click', () => {
    shopState.modalQty = Math.max(1, shopState.modalQty - 1);
    $('#modal-qty-value').textContent = shopState.modalQty;
    updateModalQtyButtons();
  });
  $('#modal-qty-plus').addEventListener('click', () => {
    const product = shopState.modalProduct;
    const maxQty = product ? Math.max(1, Math.min(20, remainingStock(product))) : 20;
    shopState.modalQty = Math.min(maxQty, shopState.modalQty + 1);
    $('#modal-qty-value').textContent = shopState.modalQty;
    updateModalQtyButtons();
  });

  $('#modal-add-btn').addEventListener('click', () => {
    const product = shopState.modalProduct;
    if (!product || !isAvailable(product)) return;
    addToCart(product, shopState.modalQty);
    closeProductModal();
    openCart();
  });

  modalOverlay.addEventListener('click', (e) => {
    if (e.target.closest('.js-close-modal')) closeProductModal();
  });

  /* ---------- Carrinho ---------- */
  const cartOverlay = $('#cart-overlay');
  const cartDrawer = $('#cart-drawer');

  function addToCart(product, qty) {
    const maxQty = Math.max(0, Math.min(20, product.stock));
    const existing = shopState.cart.find(i => i.productId === product.id);
    const nextQty = Math.min(maxQty, (existing ? existing.qty : 0) + qty);
    if (existing) existing.qty = nextQty;
    else shopState.cart.push({ productId: product.id, name: product.name, price: product.price, unit: product.unit, qty: nextQty, category: product.category, icon: product.icon });
    window.HGServices.analytics.registrarEvento('add_to_cart', product.id);
    renderCart();
  }

  function removeFromCart(productId) {
    shopState.cart = shopState.cart.filter(i => i.productId !== productId);
    renderCart();
  }

  function changeCartQty(productId, delta) {
    const item = shopState.cart.find(i => i.productId === productId);
    if (!item) return;
    const product = findProduct(productId);
    const maxQty = product ? Math.max(0, Math.min(20, product.stock)) : 20;
    item.qty = Math.min(maxQty, item.qty + delta);
    if (item.qty <= 0) return removeFromCart(productId);
    renderCart();
  }

  function cartSubtotal() {
    return shopState.cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  }
  function cartCount() {
    return shopState.cart.reduce((sum, i) => sum + i.qty, 0);
  }

  function renderCart() {
    const body = $('#cart-body');
    body.innerHTML = '';
    if (shopState.cart.length === 0) {
      body.innerHTML =
        '<div class="cart-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><circle cx="9" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/><path d="M2.5 3h2l2.6 12.4a1.8 1.8 0 0 0 1.8 1.4h8.2a1.8 1.8 0 0 0 1.75-1.4L21 7.5H6.1"/></svg>' +
        '<p>Seu carrinho está vazio.<br>Explore os produtos e adicione itens.</p></div>';
    } else {
      shopState.cart.forEach(item => {
        const el = document.createElement('div');
        el.className = 'cart-item';
        el.innerHTML =
          '<div class="cart-item-media" aria-hidden="true">' + (item.icon || '🛒') + '</div>' +
          '<div class="cart-item-info">' +
            '<h4>' + escapeHTML(item.name) + '</h4>' +
            '<div class="cart-item-meta">' + formatBRL(item.price) + ' ' + escapeHTML(item.unit) + '</div>' +
            '<div class="cart-item-price">' + formatBRL(item.price * item.qty) + '</div>' +
            '<div class="qty-stepper">' +
              '<button type="button" aria-label="Diminuir quantidade" data-act="minus">–</button>' +
              '<span>' + item.qty + '</span>' +
              '<button type="button" aria-label="Aumentar quantidade" data-act="plus">+</button>' +
            '</div>' +
            '<button type="button" class="cart-item-remove" data-act="remove">Remover</button>' +
          '</div>';
        el.querySelector('[data-act="minus"]').addEventListener('click', () => changeCartQty(item.productId, -1));
        el.querySelector('[data-act="plus"]').addEventListener('click', () => changeCartQty(item.productId, 1));
        el.querySelector('[data-act="remove"]').addEventListener('click', () => removeFromCart(item.productId));
        body.appendChild(el);
      });
    }
    $('#cart-subtotal').textContent = formatBRL(cartSubtotal());
    $$('.js-cart-count').forEach(el => {
      const count = cartCount();
      el.hidden = count === 0;
      el.textContent = count;
    });
    if (shopState.modalProduct) updateModalQtyButtons();
  }

  function openCart() {
    shopState.cartOpen = true;
    cartOverlay.classList.add('is-open');
    cartDrawer.classList.add('is-open');
    cartDrawer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    window.HGServices.analytics.registrarEvento('cart_open');
  }
  function closeCart() {
    shopState.cartOpen = false;
    cartOverlay.classList.remove('is-open');
    cartDrawer.classList.remove('is-open');
    cartDrawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = modalOverlay.classList.contains('is-open') ? 'hidden' : '';
  }

  document.addEventListener('click', (e) => {
    if (e.target.closest('.js-open-cart')) openCart();
    if (e.target.closest('.js-close-cart')) closeCart();
  });

  /* ---------- Pedido pelo WhatsApp ---------- */
  function buildOrderMessage() {
    if (shopState.cart.length === 0) {
      return 'Olá! Gostaria de saber mais sobre os produtos do Hortifruti Guaramiranga.';
    }
    let msg = 'Olá! Gostaria de fazer um pedido:\n\n';
    CATEGORY_ORDER.forEach(category => {
      const items = shopState.cart.filter(i => i.category === category);
      if (items.length === 0) return;
      const info = CATEGORY_INFO[category];
      msg += info.emoji + ' ' + info.label + '\n';
      items.forEach(item => {
        msg += item.qty + 'x ' + item.name + ' — ' + formatBRL(item.price * item.qty) + '\n';
      });
      msg += '\n';
    });
    msg += 'Total: ' + formatBRL(cartSubtotal());
    return msg;
  }

  function openWhatsApp(message) {
    const url = CONFIG.WHATSAPP_LINK + '?text=' + encodeURIComponent(message);
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  const cartWhatsappBtn = $('#cart-whatsapp-btn');
  if (cartWhatsappBtn) {
    cartWhatsappBtn.addEventListener('click', () => {
      window.HGServices.analytics.registrarEvento('checkout_start');
      // Pedido pelo WhatsApp = venda de origem "site". Fica registrada como
      // "aguardando" (não sabemos se o cliente concluiu a conversa/pagamento
      // no WhatsApp) — o status é atualizado depois, no painel.
      if (shopState.cart.length > 0) {
        window.HGServices.sales.registrarVenda({
          origem: 'site',
          items: shopState.cart.map(i => ({ productId: i.productId, name: i.name, qty: i.qty, price: i.price, category: i.category })),
          status: 'aguardando',
        });
      }
      window.HGServices.analytics.registrarEvento('whatsapp_click');
      openWhatsApp(buildOrderMessage());
    });
  }

  // Cliques em qualquer link de WhatsApp/Instagram do site (header, hero,
  // açougue, localização, footer) — só observa, não muda nada no link.
  document.addEventListener('click', (e) => {
    const waLink = e.target.closest('a[href*="wa.me"]');
    if (waLink) window.HGServices.analytics.registrarEvento('whatsapp_click');
    const igLink = e.target.closest('a[href*="instagram.com"]');
    if (igLink) window.HGServices.analytics.registrarEvento('instagram_click');
  });

  /* ---------- ESC fecha modal/carrinho ---------- */
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (modalOverlay.classList.contains('is-open')) closeProductModal();
    else if (shopState.cartOpen) closeCart();
  });

  /* ---------- Resize: recalcula carrosséis ---------- */
  let shopResizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(shopResizeTimer);
    shopResizeTimer = setTimeout(renderAllCarousels, 180);
  }, { passive: true });

  /* ---------- Init da loja ---------- */
  renderAllCarousels();
  renderCart();
  window.HGServices.analytics.registrarEvento('page_view');

})();
