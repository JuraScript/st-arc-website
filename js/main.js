/* ============================================================
   ST ARC — Main JavaScript
   - Custom cursor with lag ring
   - Scroll-reveal via IntersectionObserver
   - Sticky nav on scroll
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ── CUSTOM CURSOR ──────────────────────────────────────── */
  const cursor = document.getElementById('cursor');
  const ring = document.getElementById('cursorRing');

  // Disable custom cursor on touch screens for performance and usability
  const isTouch = window.matchMedia("(pointer: coarse)").matches;

  if (!isTouch) {
    let mx = 0, my = 0;   // mouse position
    let rx = 0, ry = 0;   // ring position (lagged)

    document.addEventListener('mousemove', (e) => {
      mx = e.clientX;
      my = e.clientY;
      cursor.style.left = mx - 5 + 'px';
      cursor.style.top = my - 5 + 'px';
    });

    function animateRing() {
      rx += (mx - rx - 18) * 0.15;
      ry += (my - ry - 18) * 0.15;
      ring.style.left = rx + 'px';
      ring.style.top = ry + 'px';
      requestAnimationFrame(animateRing);
    }
    animateRing();

    // Grow cursor on interactive elements
    document.querySelectorAll('a, button').forEach((el) => {
      el.addEventListener('mouseenter', () => {
        cursor.style.transform = 'scale(2.5)';
        ring.style.transform = 'translate(-13px, -13px) scale(1.5)';
        ring.style.borderColor = 'rgba(201, 151, 58, 0.8)';
      });
      el.addEventListener('mouseleave', () => {
        cursor.style.transform = 'scale(1)';
        ring.style.transform = 'translate(-13px, -13px) scale(1)';
        ring.style.borderColor = 'rgba(201, 151, 58, 0.5)';
      });
    });
  } else {
    // Hide totally on touch
    if (cursor) cursor.style.display = 'none';
    if (ring) ring.style.display = 'none';
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
      nav.classList.add('nav-solid');
    } else {
      nav.classList.remove('nav-solid');
    }
  }

  if (navToggle) {
    navToggle.addEventListener('click', () => {
      navToggle.classList.toggle('active');
      navLinks.classList.toggle('active');
      updateNavBg();
    });

    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        // If we are already on this hash, hashchange won't fire, so force scroll
        if (window.location.hash === href) {
          window.scrollTo({
            top: 0,
            behavior: 'smooth'
          });
        }
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
  window.openModal = function (e) {
    if (e) e.preventDefault();
    document.getElementById('contactModal').classList.add('active');
  };

  window.closeModal = function () {
    document.getElementById('contactModal').classList.remove('active');
  };

  // Close on ESC
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeModal();
  });

  // Close on overlay click
  const modalOverlay = document.getElementById('contactModal');
  if (modalOverlay) {
    modalOverlay.addEventListener('click', function (e) {
      if (e.target === modalOverlay) closeModal();
    });
  }

  // File upload UI update
  const frmFile = document.getElementById('frmFile');
  if (frmFile) {
    const fileNameEl = document.getElementById('fileName');
    if (fileNameEl) {
      fileNameEl.setAttribute('data-original-text', fileNameEl.textContent);
    }
    frmFile.addEventListener('change', function (e) {
      if (this.files && this.files.length > 0) {
        fileNameEl.textContent = this.files[0].name;
        fileNameEl.style.color = 'var(--white)';
      } else {
        fileNameEl.textContent = fileNameEl.getAttribute('data-original-text') || 'Odaberite datoteku';
        fileNameEl.style.color = '';
      }
    });
  }

  // Form submit mailto fallback
  window.submitForm = function (e) {
    e.preventDefault();

    const name = document.getElementById('frmName').value;
    const email = document.getElementById('frmEmail').value;
    const phone = document.getElementById('frmPhone').value;
    const type = document.getElementById('frmType').value;
    const loc = document.getElementById('frmLocation').value;
    const msg = document.getElementById('frmMsg').value;

    const fileInput = document.getElementById('frmFile');
    const hasFile = fileInput && fileInput.files && fileInput.files.length > 0;
    const fileName = hasFile ? fileInput.files[0].name : 'Nema';

    let body = `Ime i prezime: ${name}%0D%0A`;
    body += `Email: ${email}%0D%0A`;
    body += `Telefon: ${phone}%0D%0A`;
    body += `Tip projekta: ${type}%0D%0A`;
    body += `Lokacija: ${loc}%0D%0A`;
    body += `Priložena datoteka: ${fileName}%0D%0A%0D%0A`;
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
        const fileNameEl = document.getElementById('fileName');
        if (fileNameEl) {
          fileNameEl.textContent = fileNameEl.getAttribute('data-original-text') || 'Odaberite datoteku';
          fileNameEl.style.color = '';
        }
        document.getElementById('modalFormContent').style.display = 'block';
        document.getElementById('modalSuccess').style.display = 'none';
      }, 400);
    }, 3000);
  };
  /* ── HASH ROUTER ──────────────────────────────────────────── */
  function applyLang(pageId) {
    const lang = localStorage.getItem('starc_lang') || 'hr';
    const dict = translations[lang] || translations['en'] || {};
    const en = translations['en'] || {};
    document.querySelectorAll(`#${pageId} [data-i18n]`).forEach(el => {
      const key = el.getAttribute('data-i18n');
      const val = dict[key] || en[key];
      if (val) el.innerHTML = val;
    });
  }

  function hideAllPages() {
    const pages = [
      'main-content',
      'services-page',
      'catalogues-page',
      'about-page',
      'projects-page',
      'album-view-page',
      'contact-page'
    ];
    pages.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
  }

  function showMain() {
    hideAllPages();
    document.getElementById('main-content').style.display = '';
    window.scrollTo(0, 0);
  }

  function showCatalogues() {
    hideAllPages();
    document.getElementById('catalogues-page').style.display = '';
    window.scrollTo(0, 0);

    renderCatalogGrid();
    initThumbObserver();

    document.querySelectorAll('#catalogues-page .reveal').forEach(el => {
      el.classList.remove('visible');
      revealObserver.observe(el);
    });

    applyLang('catalogues-page');
  }

  function showContact() {
    hideAllPages();
    
    const contactPage = document.getElementById('contact-page');
    if (contactPage) contactPage.style.display = '';
    
    // Dynamic iframe loading for performance
    const mapIframe = document.getElementById('googleMapIframe');
    if (mapIframe && mapIframe.getAttribute('data-src')) {
      // Slight artificial delay so page transition looks instantly smooth before map grabs network
      setTimeout(() => {
        mapIframe.src = mapIframe.getAttribute('data-src');
        mapIframe.removeAttribute('data-src');
      }, 300);
    }
    
    window.scrollTo(0, 0);
    applyLang('contact-page');
  }

  function showServices() {
    hideAllPages();
    
    const servicesPage = document.getElementById('services-page');
    if (servicesPage) servicesPage.style.display = '';
    
    window.scrollTo(0, 0);
    applyLang('services-page');
    
    // Trigger scroll reveals specifically for services page
    document.querySelectorAll('#services-page .reveal').forEach(el => {
      el.classList.remove('visible');
      revealObserver.observe(el);
    });
  }

  function showAbout() {
    hideAllPages();
    document.getElementById('about-page').style.display = '';
    window.scrollTo(0, 0);

    document.querySelectorAll('#about-page .reveal').forEach(el => {
      el.classList.remove('visible');
      revealObserver.observe(el);
    });

    applyLang('about-page');
  }

  function showAllProjects() {
    hideAllPages();
    document.getElementById('projects-page').style.display = '';
    window.scrollTo(0, 0);

    renderProjectsArchive();

    document.querySelectorAll('#projects-page .reveal').forEach(el => {
      el.classList.remove('visible');
      revealObserver.observe(el);
    });
    
    applyLang('projects-page');
  }

  function showAlbum(slug) {
    hideAllPages();
    document.getElementById('album-view-page').style.display = '';
    window.scrollTo(0, 0);

    renderAlbum(slug);

    document.querySelectorAll('#album-view-page .reveal').forEach(el => {
      el.classList.remove('visible');
      revealObserver.observe(el);
    });
    
    applyLang('album-view-page');
  }

  /* ── ALBUM RENDER ──────────────────────────────────────────── */
  function renderProjectsArchive() {
    const grid = document.getElementById('projects-archive-grid');
    if (!grid) return;
    grid.innerHTML = '';

    if (typeof PROJECT_ALBUMS === 'undefined') return;

    PROJECT_ALBUMS.forEach((album, idx) => {
      const card = document.createElement('a');
      card.className = 'project-arc-card reveal reveal-delay-' + (idx % 3);
      card.href = '#/album/' + album.slug;

      card.innerHTML = `
        <div class="project-arc-img-wrap">
          <img src="${album.cover || 'images/placeholder.jpg'}" alt="${album.title}" loading="lazy">
        </div>
        <div class="project-arc-content">
          <div class="project-arc-count">${album.images.length} <span data-i18n="label_photos">Fotografija</span></div>
          <h3 class="project-arc-title" data-i18n="album_${album.slug}_title">${album.title}</h3>
          <p class="project-arc-sub" data-i18n="album_${album.slug}_subtitle">${album.subtitle}</p>
        </div>
      `;
      grid.appendChild(card);
    });
  }

  let lbImages = [];
  let lbCurrentIndex = 0;

  function renderAlbum(slug) {
    if (typeof PROJECT_ALBUMS === 'undefined') return;
    const album = PROJECT_ALBUMS.find(a => a.slug === slug);
    if (!album) return;

    const titleEl = document.getElementById('album-title');
    titleEl.innerHTML = `<em>${album.title}</em>`;
    titleEl.setAttribute('data-i18n', `album_${album.slug}_title_em`);

    const subEl = document.getElementById('album-sub');
    subEl.textContent = album.subtitle;
    subEl.setAttribute('data-i18n', `album_${album.slug}_subtitle`);

    const masonry = document.getElementById('album-masonry');
    if (!masonry) return;
    masonry.innerHTML = '';

    lbImages = album.images;

    album.images.forEach((imgSrc, idx) => {
      const item = document.createElement('div');
      item.className = 'masonry-item reveal reveal-delay-' + (idx % 3);
      
      const img = document.createElement('img');
      img.src = imgSrc;
      img.alt = album.title;
      img.loading = 'lazy';
      
      item.appendChild(img);
      
      item.addEventListener('click', () => {
        openLightbox(idx);
      });

      masonry.appendChild(item);
    });
  }

  /* ── PREMIUM LIGHTBOX ──────────────────────────────────────────── */
  function openLightbox(index) {
    let lb = document.getElementById('premium-lightbox');
    if (!lb) {
      lb = document.createElement('div');
      lb.id = 'premium-lightbox';
      lb.className = 'premium-lightbox';
      lb.innerHTML = `
        <div class="lb-overlay"></div>
        <div class="lb-topbar">
          <div class="lb-counter"></div>
          <button class="lb-close" aria-label="Close">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>
          </button>
        </div>
        <button class="lb-prev" aria-label="Previous">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <button class="lb-next" aria-label="Next">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 18l6-6-6-6"/></svg>
        </button>
        <div class="lb-content">
          <div class="lb-loader"></div>
          <img class="lb-image" src="" alt="">
        </div>
      `;
      document.body.appendChild(lb);

      lb.querySelector('.lb-close').addEventListener('click', closeLightbox);
      lb.querySelector('.lb-prev').addEventListener('click', (e) => { e.stopPropagation(); lbNavigate(-1); });
      lb.querySelector('.lb-next').addEventListener('click', (e) => { e.stopPropagation(); lbNavigate(1); });
      lb.querySelector('.lb-overlay').addEventListener('click', closeLightbox);

      // Swipe logic for touch devices
      let touchStartX = 0;
      let touchEndX = 0;

      lb.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
      }, {passive: true});

      lb.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
      }, {passive: true});

      function handleSwipe() {
        const swipeThreshold = 50;
        if (touchEndX < touchStartX - swipeThreshold) {
          lbNavigate(1); // Swiped left -> next
        }
        if (touchEndX > touchStartX + swipeThreshold) {
          lbNavigate(-1); // Swiped right -> prev
        }
      }
    }

    lb.classList.add('active');
    document.body.style.overflow = 'hidden';
    lbCurrentIndex = index;
    updateLightbox();
    
    // Bind keys
    document.addEventListener('keydown', lbKeyHandler);
  }

  function closeLightbox() {
    const lb = document.getElementById('premium-lightbox');
    if (lb) {
      lb.classList.remove('active');
      document.body.style.overflow = '';
      document.removeEventListener('keydown', lbKeyHandler);
    }
  }

  function lbNavigate(dir) {
    lbCurrentIndex += dir;
    if (lbCurrentIndex < 0) lbCurrentIndex = lbImages.length - 1;
    if (lbCurrentIndex >= lbImages.length) lbCurrentIndex = 0;
    updateLightbox();
  }

  function updateLightbox() {
    const lb = document.getElementById('premium-lightbox');
    if (!lb) return;
    const imgEl = lb.querySelector('.lb-image');
    const loader = lb.querySelector('.lb-loader');
    const counter = lb.querySelector('.lb-counter');

    imgEl.classList.remove('loaded');
    loader.style.display = 'block';
    
    // Small delay to make transition super smooth
    setTimeout(() => {
      imgEl.src = lbImages[lbCurrentIndex];
      imgEl.onload = () => {
        loader.style.display = 'none';
        imgEl.classList.add('loaded');
      };
      counter.textContent = `${lbCurrentIndex + 1} / ${lbImages.length}`;
    }, 50);
  }

  function lbKeyHandler(e) {
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') lbNavigate(-1);
    if (e.key === 'ArrowRight') lbNavigate(1);
  }

  function handleRoute() {
    const hash = location.hash;
    if (hash === '#/katalozi') {
      showCatalogues();
    } else if (hash === '#/usluge') {
      showServices();
    } else if (hash === '#/o-nama') {
      showAbout();
    } else if (hash === '#/kontakt') {
      showContact();
    } else if (hash === '#/svi-projekti') {
      showAllProjects();
    } else if (hash.startsWith('#/album/')) {
      const slug = hash.replace('#/album/', '');
      showAlbum(slug);
    } else {
      showMain();
    }
  }

  window.addEventListener('hashchange', handleRoute);

  // Handle initial load
  if (location.hash === '#/katalozi' || location.hash === '#/usluge' || location.hash === '#/o-nama' || location.hash === '#/svi-projekti' || location.hash === '#/kontakt' || location.hash.startsWith('#/album/')) {
    handleRoute();
  } else {
    showMain();
  }

  // Force scroll to top on every refresh
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }
  setTimeout(() => {
    window.scrollTo(0, 0);
  }, 10);

  /* ── AI VISUALIZATION COMPONENT ─────────────────────────── */
  const vizContainer = document.getElementById('aiVisualizer');
  const vizBtn = document.getElementById('vizBtn');
  const vizFlash = document.querySelector('.viz-gold-flash');
  
  if (vizContainer && vizBtn) {
    let isShowingResult = false;
    let animSpeedMulti = 1;

    vizBtn.addEventListener('click', () => {
      if (isShowingResult) {
        // Reset to original
        resetVisualisation();
        return;
      }

      // Start Visualisation Process
      vizBtn.disabled = true;
      vizContainer.classList.add('is-loading');
      
      const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const loadTime = isReduced ? 500 : 2000 * animSpeedMulti;

      // Phase: Loading (Blur & Spinner)
      // We start a very slow, gradual fade-in of the result image behind the blur
      setTimeout(() => {
         const afterImg = document.querySelector('.viz-after');
         if(afterImg) {
            afterImg.style.transition = `opacity ${loadTime * 0.8}ms ease-in-out`;
            afterImg.style.opacity = '1';
         }
      }, 200 * animSpeedMulti);

      // Final Phase: Reveal (Remove Blur & Spinner)
      setTimeout(() => {
        vizContainer.classList.remove('is-loading');
        completeVisualisation();
      }, loadTime);
    });

    function completeVisualisation() {
      vizContainer.classList.add('is-done');
      vizBtn.textContent = 'Show Original';
      vizBtn.disabled = false;
      isShowingResult = true;
      animSpeedMulti = 0.8; // Next time 20% faster
    }

    function resetVisualisation() {
      vizContainer.classList.remove('is-done');
      const afterImg = document.querySelector('.viz-after');
      afterImg.style.transition = 'opacity 0.6s ease';
      afterImg.style.opacity = '0';
      vizBtn.textContent = 'Visualise';
      isShowingResult = false;
    }
  }

});
