/* ============================================================
   ST ARC — Catalogues Module
   PDF.js thumbnail rendering + fullscreen PDF reader modal
   ============================================================ */

/* ── CATALOGUE DATA ──────────────────────────────────────────── */
const CATALOGUES = [
  {
    id: 'kat-01',
    file: 'katalozi/KATALOG-ST-ARC.pdf',
    thumb: 'images/katalozi/kat-05.jpg',
    titleKey: 'cat1_title',
    descKey: 'cat1_desc',
    year: 'glavni'
  },
  {
    id: 'kat-02',
    file: 'katalozi/ST-ARC_SvjetlosneDekoracije.pdf',
    thumb: 'images/katalozi/kat-07.jpg',
    titleKey: 'cat2_title',
    descKey: 'cat2_desc',
    year: 'dekoracije'
  },
  {
    id: 'kat-03',
    file: 'katalozi/2019-2020.pdf',
    thumb: 'images/katalozi/kat-03.jpg',
    titleKey: 'cat3_title',
    descKey: 'cat3_desc',
    year: '2019–20'
  },
  {
    id: 'kat-04',
    file: 'katalozi/2018.pdf',
    thumb: 'images/katalozi/kat-02.jpg',
    titleKey: 'cat4_title',
    descKey: 'cat4_desc',
    year: '2018–19'
  },
  {
    id: 'kat-05',
    file: 'katalozi/2017.pdf',
    thumb: 'images/katalozi/kat-01.jpg',
    titleKey: 'cat5_title',
    descKey: 'cat5_desc',
    year: '2017'
  },
  {
    id: 'kat-06',
    file: 'katalozi/katalog-maskare.pdf',
    thumb: 'images/katalozi/kat-04.jpg',
    titleKey: 'cat6_title',
    descKey: 'cat6_desc',
    year: 'posebno'
  },
  {
    id: 'kat-07',
    file: 'katalozi/posebno-izdanje-2015.pdf',
    thumb: 'images/katalozi/kat-06.jpg',
    titleKey: 'cat7_title',
    descKey: 'cat7_desc',
    year: '2015'
  },
  {
    id: 'kat-08',
    file: 'katalozi/uskrs-katalog-2026-1.pdf',
    thumb: 'images/katalozi/kat-08.jpg',
    titleKey: 'cat8_title',
    descKey: 'cat8_desc',
    year: '2026'
  }
];

/* ── PDF.js WORKER SETUP ─────────────────────────────────────── */
pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

/* ── STATE ───────────────────────────────────────────────────── */
let pdfDoc = null;
let currentPage = 1;
let totalPages = 0;

/* ── HELPER: get translation ─────────────────────────────────── */
function _t(key) {
  const lang = localStorage.getItem('starc_lang') || 'hr';
  const dict = translations[lang] || translations['en'] || {};
  const en = translations['en'] || {};
  return dict[key] || en[key] || key;
}

/* ── RENDER CATALOGUE GRID ───────────────────────────────────── */
function renderCatalogGrid() {
  const grid = document.getElementById('catalogues-grid');
  if (!grid) return;

  // Clear to avoid duplicates on re-navigation
  grid.innerHTML = '';

  CATALOGUES.forEach((cat, i) => {
    const card = document.createElement('div');
    card.className = 'cat-card reveal';
    card.setAttribute('data-catalogue', cat.id);
    card.onclick = () => openPdfModal(cat);

    card.innerHTML = `
      <div class="cat-thumb">
        <img src="${cat.thumb}" alt="${_t(cat.titleKey)}" loading="lazy">
        <div class="cat-thumb-overlay">
          <span class="cat-thumb-view">Pregledaj</span>
        </div>
      </div>
      <div class="cat-info">
        <span class="cat-year">${cat.year}</span>
        <h3 class="cat-title" data-i18n="${cat.titleKey}">${_t(cat.titleKey)}</h3>
        <p class="cat-desc" data-i18n="${cat.descKey}">${_t(cat.descKey)}</p>
      </div>
    `;

    grid.appendChild(card);
  });
}

function initThumbObserver() {
  // Static images use native loading="lazy", so we don't need IntersectionObserver for PDFs anymore
  // Keeping the function to avoid breaking main.js calls
}

/* ── THUMBNAIL RENDERING (DEPRECATED) ─────────────────────────── */
// We now use static JPEGs. Keeping functions for reference but they are not called.
async function renderThumbnail(canvas, pdfPath) {}

/* ── OPEN PDF MODAL ──────────────────────────────────────────── */
async function openPdfModal(catalogue) {
  const modal = document.getElementById('pdf-modal');
  const title = document.getElementById('pdfModalTitle');
  const download = document.getElementById('pdfDownload');

  title.textContent = _t(catalogue.titleKey);
  download.href = catalogue.file;
  download.setAttribute('download', '');

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';

  try {
    pdfDoc = await pdfjsLib.getDocument(catalogue.file).promise;
    totalPages = pdfDoc.numPages;
    currentPage = 1;
    renderPage(currentPage);
  } catch (err) {
    console.error('Failed to load PDF:', err);
    document.getElementById('pdfPageInfo').textContent = 'Error';
  }
}

/* ── RENDER PAGE ─────────────────────────────────────────────── */
async function renderPage(pageNum) {
  if (!pdfDoc) return;

  const page = await pdfDoc.getPage(pageNum);
  const canvas = document.getElementById('pdfCanvas');
  const modalBox = document.querySelector('.pdf-modal-box');
  const viewport = page.getViewport({ scale: 1 });

  // Determine if landscape or portrait
  const isLandscape = viewport.width > viewport.height;
  const pageRatio = viewport.width / viewport.height;

  // Calculate optimal modal dimensions based on page orientation
  const maxW = window.innerWidth * 0.94;
  const maxH = window.innerHeight * 0.94;
  const headerH = 65; // modal header height
  const pad = 48;      // content padding

  let modalW, contentH;

  if (isLandscape) {
    // Landscape: go wider, limit to viewport
    modalW = Math.min(1200, maxW);
    contentH = (modalW - pad) / pageRatio;
    // If too tall, constrain by height instead
    if (contentH + headerH + pad > maxH) {
      contentH = maxH - headerH - pad;
      modalW = Math.min(contentH * pageRatio + pad, maxW);
    }
  } else {
    // Portrait: narrower, taller
    contentH = maxH - headerH - pad;
    modalW = Math.min(contentH * pageRatio + pad, 820, maxW);
  }

  // Apply via CSS custom properties (triggers smooth transition)
  modalBox.style.setProperty('--pdf-modal-w', Math.round(modalW) + 'px');
  modalBox.style.setProperty('--pdf-modal-h', Math.round(contentH + headerH + pad) + 'px');

  // Render: scale canvas to fill available content width
  const renderWidth = modalW - pad;
  const scale = renderWidth / viewport.width;
  const scaledViewport = page.getViewport({ scale });

  canvas.width = scaledViewport.width;
  canvas.height = scaledViewport.height;

  const ctx = canvas.getContext('2d');
  await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;

  document.getElementById('pdfPageInfo').textContent = `${pageNum} / ${totalPages}`;
}

/* ── CLOSE PDF MODAL ─────────────────────────────────────────── */
function closePdfModal() {
  const modal = document.getElementById('pdf-modal');
  modal.classList.remove('open');
  document.body.style.overflow = '';

  if (pdfDoc) {
    pdfDoc.destroy();
    pdfDoc = null;
  }
  currentPage = 1;
  totalPages = 0;
}

/* ── PDF MODAL EVENT LISTENERS ───────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {

  // Prev / Next buttons
  const prevBtn = document.getElementById('pdfPrevPage');
  const nextBtn = document.getElementById('pdfNextPage');
  const closeBtn = document.getElementById('pdfModalClose');
  const modalBg = document.getElementById('pdf-modal');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        renderPage(currentPage);
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (currentPage < totalPages) {
        currentPage++;
        renderPage(currentPage);
      }
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', closePdfModal);
  }

  // Close on overlay click
  if (modalBg) {
    modalBg.addEventListener('click', (e) => {
      if (e.target === modalBg) closePdfModal();
    });
  }

  // ESC key and arrow keys
  document.addEventListener('keydown', (e) => {
    if (!modalBg || !modalBg.classList.contains('open')) return;

    if (e.key === 'Escape') {
      closePdfModal();
    } else if (e.key === 'ArrowLeft' && currentPage > 1) {
      currentPage--;
      renderPage(currentPage);
    } else if (e.key === 'ArrowRight' && currentPage < totalPages) {
      currentPage++;
      renderPage(currentPage);
    }
  });
});
