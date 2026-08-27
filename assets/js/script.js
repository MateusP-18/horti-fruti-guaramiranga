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

})();
