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

  if (navToggle) {
    navToggle.addEventListener('click', () => {
      navToggle.classList.toggle('active');
      navLinks.classList.toggle('active');
    });
    
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navToggle.classList.remove('active');
        navLinks.classList.remove('active');
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
    if (window.scrollY > 80) {
      nav.style.background    = 'rgba(9, 10, 15, 0.97)';
      nav.style.backdropFilter = 'blur(12px)';
      nav.style.borderBottom  = '1px solid rgba(201, 151, 58, 0.1)';
    } else {
      nav.style.background    = 'linear-gradient(to bottom, rgba(9,10,15,0.95), transparent)';
      nav.style.backdropFilter = '';
      nav.style.borderBottom  = 'none';
    }
  });

});
