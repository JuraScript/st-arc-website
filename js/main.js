/* ============================================================
   ST ARC — Main JavaScript
   - Custom cursor with lag ring
   - Scroll-reveal via IntersectionObserver
   - Sticky nav on scroll
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ── CUSTOM CURSOR ──────────────────────────────────────── */
  const cursor = document.getElementById('cursor');
  const ring   = document.getElementById('cursorRing');

  // Disable custom cursor on touch screens for performance and usability
  const isTouch = window.matchMedia("(pointer: coarse)").matches;

  if (!isTouch) {
    let mx = 0, my = 0;   // mouse position
    let rx = 0, ry = 0;   // ring position (lagged)
  
    document.addEventListener('mousemove', (e) => {
      mx = e.clientX;
      my = e.clientY;
      cursor.style.left = mx - 5 + 'px';
      cursor.style.top  = my - 5 + 'px';
    });
  
    function animateRing() {
      rx += (mx - rx - 18) * 0.12;
      ry += (my - ry - 18) * 0.12;
      ring.style.left = rx + 'px';
      ring.style.top  = ry + 'px';
      requestAnimationFrame(animateRing);
    }
    animateRing();
  
    // Grow cursor on interactive elements
    document.querySelectorAll('a, button').forEach((el) => {
      el.addEventListener('mouseenter', () => {
        cursor.style.transform    = 'scale(2.5)';
        ring.style.transform      = 'translate(-13px, -13px) scale(1.5)';
        ring.style.borderColor    = 'rgba(201, 151, 58, 0.8)';
      });
      el.addEventListener('mouseleave', () => {
        cursor.style.transform    = 'scale(1)';
        ring.style.transform      = 'translate(-13px, -13px) scale(1)';
        ring.style.borderColor    = 'rgba(201, 151, 58, 0.5)';
      });
    });
  } else {
    // Hide totally on touch
    if(cursor) cursor.style.display = 'none';
    if(ring) ring.style.display = 'none';
    // Restore default body cursor
    document.body.style.cursor = 'auto';

    // Add brief tap ripple effect
    document.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      const tapEffect = document.createElement('div');
      tapEffect.className = 'touch-tap-effect';
      tapEffect.style.left = touch.clientX + 'px';
      tapEffect.style.top = touch.clientY + 'px';
      document.body.appendChild(tapEffect);
      
      setTimeout(() => {
        tapEffect.remove();
      }, 500);
    });
  }

  /* ── MOBILE MENU ────────────────────────────────────────── */
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.querySelector('.nav-links');

  // Helper: update nav background based on scroll + menu state
  function updateNavBg() {
    const menuOpen = navLinks && navLinks.classList.contains('active');
    if (window.scrollY > 80 || menuOpen) {
      nav.style.background    = 'rgba(9, 10, 15, 0.97)';
      nav.style.backdropFilter = 'blur(12px)';
      nav.style.borderBottom  = '1px solid rgba(201, 151, 58, 0.1)';
    } else {
      nav.style.background    = 'linear-gradient(to bottom, rgba(9,10,15,0.95), transparent)';
      nav.style.backdropFilter = '';
      nav.style.borderBottom  = 'none';
    }
  }

  if (navToggle) {
    navToggle.addEventListener('click', () => {
      navToggle.classList.toggle('active');
      navLinks.classList.toggle('active');
      updateNavBg();
    });
    
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navToggle.classList.remove('active');
        navLinks.classList.remove('active');
        updateNavBg();
      });
    });
  }


  /* ── SCROLL REVEAL ──────────────────────────────────────── */
  const revealEls = document.querySelectorAll('.reveal');

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  revealEls.forEach((el) => revealObserver.observe(el));


  /* ── STICKY NAV ─────────────────────────────────────────── */
  const nav = document.querySelector('nav');

  window.addEventListener('scroll', () => {
    // Scroll progress bar
    const scrollPct = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
    const progressEl = document.getElementById('scrollProgress');
    if (progressEl) progressEl.style.width = scrollPct + '%';

    updateNavBg();
  });

  /* ── STAT COUNTER ANIMATION ───────────────────────────── */
  const statsSection = document.querySelector('.hero-stats');
  if (statsSection) {
    const counters = statsSection.querySelectorAll('.stat-number');

    // Parse target: "30+" → 30, "HR" → null (skip), "EU" → null (skip)
    function getTarget(el) {
      const txt = el.getAttribute('data-target') || el.textContent;
      const num = parseInt(txt);
      return isNaN(num) ? null : { num, suffix: txt.replace(/[0-9]/g, '') };
    }

    function animateCounter(el, target, duration = 1800) {
      let start = null;
      const easeOut = t => 1 - Math.pow(1 - t, 3);
      function step(ts) {
        if (!start) start = ts;
        const progress = Math.min((ts - start) / duration, 1);
        el.textContent = Math.round(easeOut(progress) * target.num) + target.suffix;
        if (progress < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    const statsObs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // Wait for CSS fade-in delay (1.2s) before counting
          setTimeout(() => {
            counters.forEach(el => {
              const t = getTarget(el);
              if (t) animateCounter(el, t, 2000); // 2 seconds duration
            });
          }, 1200);
          statsObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    statsObs.observe(statsSection);
  }

  /* ── CONTACT MODAL ──────────────────────────────────────── */
  window.openModal = function(e) {
    if (e) e.preventDefault();
    document.getElementById('contactModal').classList.add('active');
  };

  window.closeModal = function() {
    document.getElementById('contactModal').classList.remove('active');
  };

  // Close on ESC
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeModal();
  });

  // Close on overlay click
  const modalOverlay = document.getElementById('contactModal');
  if (modalOverlay) {
    modalOverlay.addEventListener('click', function(e) {
      if (e.target === modalOverlay) closeModal();
    });
  }

  // Form submit mailto fallback
  window.submitForm = function(e) {
    e.preventDefault();
    
    const name = document.getElementById('frmName').value;
    const email = document.getElementById('frmEmail').value;
    const phone = document.getElementById('frmPhone').value;
    const type = document.getElementById('frmType').value;
    const loc = document.getElementById('frmLocation').value;
    const msg = document.getElementById('frmMsg').value;
    
    let body = `Ime i prezime: ${name}%0D%0A`;
    body += `Email: ${email}%0D%0A`;
    body += `Telefon: ${phone}%0D%0A`;
    body += `Tip projekta: ${type}%0D%0A`;
    body += `Lokacija: ${loc}%0D%0A%0D%0A`;
    body += `Opis projekta:%0D%0A${msg}`;
    
    // Fallback mailto
    window.location.href = `mailto:info@st-arc.hr?subject=Upit za projekt - ${name}&body=${body}`;
    
    // Show success
    document.getElementById('modalFormContent').style.display = 'none';
    document.getElementById('modalSuccess').style.display = 'block';
    
    setTimeout(() => {
      closeModal();
      // Reset form on close
      setTimeout(() => {
        document.getElementById('contactForm').reset();
        document.getElementById('modalFormContent').style.display = 'block';
        document.getElementById('modalSuccess').style.display = 'none';
      }, 400);
    }, 3000);
  };
  /* ── HASH ROUTER ──────────────────────────────────────────── */
  function showMain() {
    document.getElementById('main-content').style.display = '';
    document.getElementById('catalogues-page').style.display = 'none';
    window.scrollTo(0, 0);
  }

  function showCatalogues() {
    document.getElementById('main-content').style.display = 'none';
    document.getElementById('catalogues-page').style.display = '';
    window.scrollTo(0, 0);

    // Render grid + lazy thumbnails
    renderCatalogGrid();
    initThumbObserver();

    // Re-init scroll reveal for catalogue cards
    document.querySelectorAll('#catalogues-page .reveal').forEach(el => {
      el.classList.remove('visible');
      revealObserver.observe(el);
    });

    // Re-apply current language to new dynamic elements
    const lang = localStorage.getItem('starc_lang') || 'hr';
    const dict = translations[lang] || translations['en'] || {};
    const en   = translations['en'] || {};
    document.querySelectorAll('#catalogues-page [data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const val = dict[key] || en[key];
      if (val) el.innerHTML = val;
    });
  }

  function handleRoute() {
    const hash = location.hash;
    if (hash === '#/katalozi') {
      showCatalogues();
    } else {
      // Only scroll to top if returning FROM catalogues page
      const catPage = document.getElementById('catalogues-page');
      const wasOnCatalogues = catPage.style.display !== 'none';
      
      document.getElementById('main-content').style.display = '';
      catPage.style.display = 'none';
      
      if (wasOnCatalogues) {
        window.scrollTo(0, 0);
      }
    }
  }

  window.addEventListener('hashchange', handleRoute);

  // Handle initial load (e.g. direct link to #/katalozi)
  if (location.hash === '#/katalozi') {
    handleRoute();
  }

});
