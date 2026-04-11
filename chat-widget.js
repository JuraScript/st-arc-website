/**
 * ST Arc Chat Widget
 * Drop into any page with: <script src="chat-widget.js"></script>
 *
 * Configuration: change WORKER_URL below to your deployed Worker URL.
 * Reads current language from your existing language selector (data-lang attribute, or HTML lang).
 */

(function () {
  // ============ CONFIG ============
  const WORKER_URL = 'https://st-arc-chatbot.profes-xa.workers.dev'; // <-- CHANGE THIS
  const POSITION = 'bottom-right'; // 'bottom-right' or 'bottom-left'
  const PRIMARY_COLOR = '#c9a86a'; // gold/brass — matches ST Arc inox/light vibe
  const DARK_COLOR = '#1a1a1a';
  // ================================

  // Localized UI strings for all 11 languages
  const STRINGS = {
    hr: { title: 'ST Arc Asistent', placeholder: 'Postavi pitanje...', send: 'Pošalji', greeting: 'Bok! 👋 Ja sam ST Arc asistent. Pitajte me bilo što o našim svjetlosnim instalacijama, projektima ili uslugama.', thinking: 'Razmišljam...', error: 'Oprostite, došlo je do greške. Pokušajte ponovno.', sources: 'Izvori', contact: 'Kontakt' },
    en: { title: 'ST Arc Assistant', placeholder: 'Ask a question...', send: 'Send', greeting: 'Hi! 👋 I\'m the ST Arc assistant. Ask me anything about our light installations, projects or services.', thinking: 'Thinking...', error: 'Sorry, something went wrong. Please try again.', sources: 'Sources', contact: 'Contact' },
    de: { title: 'ST Arc Assistent', placeholder: 'Stellen Sie eine Frage...', send: 'Senden', greeting: 'Hallo! 👋 Ich bin der ST Arc Assistent. Fragen Sie mich alles über unsere Lichtinstallationen, Projekte oder Dienstleistungen.', thinking: 'Denke nach...', error: 'Entschuldigung, etwas ist schief gelaufen.', sources: 'Quellen', contact: 'Kontakt' },
    it: { title: 'Assistente ST Arc', placeholder: 'Fai una domanda...', send: 'Invia', greeting: 'Ciao! 👋 Sono l\'assistente ST Arc. Chiedimi qualsiasi cosa sulle nostre installazioni luminose, progetti o servizi.', thinking: 'Sto pensando...', error: 'Spiacenti, si è verificato un errore.', sources: 'Fonti', contact: 'Contatto' },
    es: { title: 'Asistente ST Arc', placeholder: 'Haz una pregunta...', send: 'Enviar', greeting: '¡Hola! 👋 Soy el asistente de ST Arc. Pregúntame lo que quieras sobre nuestras instalaciones luminosas, proyectos o servicios.', thinking: 'Pensando...', error: 'Lo siento, algo salió mal.', sources: 'Fuentes', contact: 'Contacto' },
    fr: { title: 'Assistant ST Arc', placeholder: 'Posez une question...', send: 'Envoyer', greeting: 'Salut! 👋 Je suis l\'assistant ST Arc. Posez-moi des questions sur nos installations lumineuses, projets ou services.', thinking: 'Je réfléchis...', error: 'Désolé, une erreur s\'est produite.', sources: 'Sources', contact: 'Contact' },
    nl: { title: 'ST Arc Assistent', placeholder: 'Stel een vraag...', send: 'Verstuur', greeting: 'Hoi! 👋 Ik ben de ST Arc assistent. Vraag me alles over onze lichtinstallaties, projecten of diensten.', thinking: 'Aan het denken...', error: 'Sorry, er ging iets mis.', sources: 'Bronnen', contact: 'Contact' },
    pt: { title: 'Assistente ST Arc', placeholder: 'Faça uma pergunta...', send: 'Enviar', greeting: 'Olá! 👋 Sou o assistente ST Arc. Pergunte-me qualquer coisa sobre as nossas instalações luminosas, projetos ou serviços.', thinking: 'A pensar...', error: 'Desculpe, algo correu mal.', sources: 'Fontes', contact: 'Contacto' },
    ru: { title: 'Ассистент ST Arc', placeholder: 'Задайте вопрос...', send: 'Отправить', greeting: 'Привет! 👋 Я ассистент ST Arc. Спросите меня о наших световых инсталляциях, проектах или услугах.', thinking: 'Думаю...', error: 'Извините, произошла ошибка.', sources: 'Источники', contact: 'Контакт' },
    zh: { title: 'ST Arc 助手', placeholder: '提出问题...', send: '发送', greeting: '你好! 👋 我是 ST Arc 助手。可以问我任何关于我们的灯光装置、项目或服务的问题。', thinking: '思考中...', error: '抱歉，出现了错误。', sources: '来源', contact: '联系' },
    ar: { title: 'مساعد ST Arc', placeholder: 'اطرح سؤالاً...', send: 'إرسال', greeting: 'مرحباً! 👋 أنا مساعد ST Arc. اسألني أي شيء عن تركيبات الإضاءة والمشاريع والخدمات.', thinking: 'أفكر...', error: 'عذراً، حدث خطأ.', sources: 'المصادر', contact: 'اتصال' },
  };

  function getCurrentLanguage() {
    // 1. Check for data-current-lang attribute on html or body
    const htmlLang = document.documentElement.getAttribute('data-current-lang') ||
                     document.body.getAttribute('data-current-lang');
    if (htmlLang && STRINGS[htmlLang]) return htmlLang;

    // 2. Check html lang attribute
    const lang = document.documentElement.lang?.toLowerCase().slice(0, 2);
    if (lang && STRINGS[lang]) return lang;

    // 3. Look for active language in common selector patterns
    const activeLang = document.querySelector('[data-lang].active, .lang-active, [aria-current="true"][data-lang]');
    if (activeLang) {
      const code = activeLang.getAttribute('data-lang')?.toLowerCase().slice(0, 2);
      if (code && STRINGS[code]) return code;
    }

    // 4. Default
    return 'hr';
  }

  function t(key) {
    const lang = getCurrentLanguage();
    return STRINGS[lang]?.[key] || STRINGS.hr[key];
  }

  // === Inject styles ===
  const styles = `
    .stac-fab {
      position: fixed; ${POSITION === 'bottom-right' ? 'right: 24px;' : 'left: 24px;'} bottom: 24px;
      width: 60px; height: 60px; border-radius: 50%;
      background: linear-gradient(135deg, ${PRIMARY_COLOR}, #b8956a);
      color: white; border: none; cursor: pointer;
      box-shadow: 0 6px 24px rgba(0,0,0,0.25);
      display: flex; align-items: center; justify-content: center;
      z-index: 9998; transition: transform 0.2s ease, box-shadow 0.2s ease;
      font-size: 26px;
    }
    .stac-fab:hover { transform: scale(1.08); box-shadow: 0 8px 28px rgba(0,0,0,0.35); }
    .stac-fab.open { transform: rotate(90deg); }

    .stac-window {
      position: fixed; ${POSITION === 'bottom-right' ? 'right: 24px;' : 'left: 24px;'} bottom: 100px;
      width: 380px; max-width: calc(100vw - 48px); height: 560px; max-height: calc(100dvh - 140px);
      background: #1A1A1D; border-radius: 16px; border: 1px solid #333;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
      display: none; flex-direction: column; overflow: hidden;
      z-index: 9999; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      padding-bottom: max(0px, env(safe-area-inset-bottom));
    }
    .stac-window.open { display: flex; animation: stacFadeIn 0.25s ease; }
    @keyframes stacFadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

    .stac-header {
      background: ${DARK_COLOR}; color: white; padding: 16px 20px;
      display: flex; align-items: center; gap: 12px;
    }
    .stac-header-icon {
      width: 36px; height: 36px; border-radius: 50%;
      background: linear-gradient(135deg, ${PRIMARY_COLOR}, #b8956a);
      display: flex; align-items: center; justify-content: center;
      font-size: 18px;
    }
    .stac-header-title { font-weight: 600; font-size: 15px; }
    .stac-header-sub { font-size: 11px; opacity: 0.7; }

    .stac-messages {
      flex: 1; overflow-y: auto; padding: 16px;
      background: #121212; display: flex; flex-direction: column; gap: 12px;
    }
    .stac-msg { max-width: 85%; padding: 10px 14px; border-radius: 14px; font-size: 14px; line-height: 1.5; word-wrap: break-word; }
    .stac-msg.bot { background: #2C2C2C; color: #F3F4F6; align-self: flex-start; box-shadow: 0 1px 3px rgba(0,0,0,0.3); border-bottom-left-radius: 4px; }
    .stac-msg.user { background: ${PRIMARY_COLOR}; color: #121212; align-self: flex-end; border-bottom-right-radius: 4px; }
    .stac-msg.thinking { font-style: italic; opacity: 0.7; }

    .stac-sources {
      margin-top: 8px; padding-top: 8px; border-top: 1px solid #eee;
      font-size: 11px; color: #666;
    }
    .stac-sources strong { display: block; margin-bottom: 4px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
    .stac-source-item { padding: 4px 0; }
    .stac-source-item .badge { display: inline-block; background: ${PRIMARY_COLOR}22; color: ${PRIMARY_COLOR}; padding: 1px 6px; border-radius: 4px; font-weight: 600; margin-right: 4px; font-size: 10px; }

    .stac-input-area {
      padding: 12px; background: #1A1A1D; border-top: 1px solid #333;
      display: flex; gap: 8px;
    }
    .stac-input {
      flex: 1; padding: 10px 14px; border: 1px solid #444;
      border-radius: 22px; font-size: 14px; outline: none;
      font-family: inherit; background: #121212; color: white;
    }
    .stac-input:focus { border-color: ${PRIMARY_COLOR}; outline: none; }
    .stac-input::placeholder { color: #888; }
    .stac-send-btn {
      background: ${PRIMARY_COLOR}; color: white; border: none;
      width: 40px; height: 40px; border-radius: 50%; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; flex-shrink: 0;
    }
    .stac-send-btn:hover { background: #b8956a; }
    .stac-send-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .stac-quick-actions { display: flex; gap: 6px; flex-wrap: wrap; padding: 0 16px 8px; }
    .stac-quick-btn {
      background: white; border: 1px solid ${PRIMARY_COLOR}; color: ${PRIMARY_COLOR};
      padding: 6px 12px; border-radius: 16px; font-size: 12px; cursor: pointer;
      font-family: inherit;
    }
    .stac-quick-btn:hover { background: ${PRIMARY_COLOR}; color: white; }

    /* Mobile optimizations */
    @media (max-width: 640px) {
      .stac-window {
        width: calc(100vw - 24px);
        height: calc(100dvh - 140px);
        border-radius: 12px;
        bottom: 80px;
      }
      .stac-fab {
        width: 50px;
        height: 50px;
        font-size: 20px;
      }
      .stac-msg {
        border-radius: 12px;
      }
      .stac-msg.bot {
        border-bottom-left-radius: 2px;
      }
      .stac-msg.user {
        border-bottom-right-radius: 2px;
      }
      .stac-fab {
        bottom: 20px;
        right: 20px;
        padding-bottom: max(0px, env(safe-area-inset-bottom));
      }
    }
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = styles;
  document.head.appendChild(styleEl);

  // === Build DOM ===
  const fab = document.createElement('button');
  fab.className = 'stac-fab';
  fab.innerHTML = '✦';
  fab.setAttribute('aria-label', 'Open chat');
  document.body.appendChild(fab);

  const win = document.createElement('div');
  win.className = 'stac-window';
  win.innerHTML = `
    <div class="stac-header">
      <div class="stac-header-icon">✦</div>
      <div>
        <div class="stac-header-title" data-i18n="title"></div>
        <div class="stac-header-sub">ST Arc d.o.o.</div>
      </div>
    </div>
    <div class="stac-messages" id="stac-messages"></div>
    <div class="stac-quick-actions" id="stac-quick-actions"></div>
    <div class="stac-input-area">
      <input class="stac-input" id="stac-input" type="text" />
      <button class="stac-send-btn" id="stac-send">➤</button>
    </div>
    <div style="text-align: center; padding: 6px 0; border-top: 1px solid #333;">
      <a id="stac-disable-link" href="#" style="font-size: 10px; color: #888; text-decoration: none; transition: color 0.2s;">disable</a>
    </div>
  `;
  document.body.appendChild(win);

  const messagesEl = win.querySelector('#stac-messages');
  const inputEl = win.querySelector('#stac-input');
  const sendBtn = win.querySelector('#stac-send');
  const quickActionsEl = win.querySelector('#stac-quick-actions');

  // Mobile: prevent auto keyboard on focus until user explicitly taps
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (isMobile) {
    inputEl.readOnly = true;
    inputEl.addEventListener('click', () => {
      setTimeout(() => { inputEl.readOnly = false; inputEl.focus(); }, 50);
    });
  }

  function refreshUIStrings() {
    win.querySelector('[data-i18n="title"]').textContent = t('title');
    inputEl.placeholder = t('placeholder');
  }

  function addMessage(text, role, sources = []) {
    const msg = document.createElement('div');
    msg.className = `stac-msg ${role}`;
    // Convert URLs and emails to links, escape HTML otherwise
    msg.innerHTML = linkify(escapeHtml(text));

    if (sources && sources.length > 0) {
      const srcDiv = document.createElement('div');
      srcDiv.className = 'stac-sources';
      srcDiv.innerHTML = `<strong>${escapeHtml(t('sources'))}</strong>`;
      sources.forEach((s) => {
        const item = document.createElement('div');
        item.className = 'stac-source-item';
        let badge = '';
        if (s.type === 'pdf') {
          badge = `<span class="badge">📄 ${escapeHtml(s.title || '')}${s.year ? ' ' + s.year : ''}${s.page ? ', str. ' + s.page : ''}</span>`;
        } else if (s.type === 'website') {
          badge = `<span class="badge">🌐 ${escapeHtml(s.title || 'Web')}</span>`;
        }
        item.innerHTML = badge;
        srcDiv.appendChild(item);
      });
      msg.appendChild(srcDiv);
    }

    messagesEl.appendChild(msg);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return msg;
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function linkify(html) {
    // Already-escaped html — turn URLs/emails/phones into links
    return html
      .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline">$1</a>')
      .replace(/([\w.+-]+@[\w-]+\.[\w.-]+)/g, '<a href="mailto:$1" style="color:inherit;text-decoration:underline">$1</a>')
      .replace(/(\+\d[\d\s-]{6,})/g, '<a href="tel:$1" style="color:inherit;text-decoration:underline">$1</a>')
      .replace(/\n/g, '<br>');
  }

  let isLoading = false;
  let sessionId = 'sess_' + Math.random().toString(36).slice(2, 12);

  async function sendMessage(text) {
    if (!text || isLoading) return;
    isLoading = true;
    sendBtn.disabled = true;
    inputEl.value = '';

    addMessage(text, 'user');
    const thinkingMsg = addMessage(t('thinking'), 'bot');
    thinkingMsg.classList.add('thinking');

    try {
      const res = await fetch(`${WORKER_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          language: getCurrentLanguage(),
          sessionId,
        }),
      });
      const data = await res.json();
      thinkingMsg.remove();
      if (data.answer) {
        addMessage(data.answer, 'bot', data.sources || []);
      } else {
        addMessage(t('error'), 'bot');
      }
    } catch (e) {
      thinkingMsg.remove();
      addMessage(t('error'), 'bot');
      console.error('Chat error:', e);
    } finally {
      isLoading = false;
      sendBtn.disabled = false;
      inputEl.focus();
    }
  }

  function showGreeting() {
    messagesEl.innerHTML = '';
    addMessage(t('greeting'), 'bot');
    quickActionsEl.innerHTML = '';
  }

  function toggleWindow() {
    const isOpen = win.classList.contains('open');
    if (isOpen) {
      win.classList.remove('open');
      fab.classList.remove('open');
      fab.innerHTML = '✦';
    } else {
      win.classList.add('open');
      fab.classList.add('open');
      fab.innerHTML = '✕';
      refreshUIStrings();
      if (messagesEl.children.length === 0) showGreeting();
      setTimeout(() => inputEl.focus(), 100);
    }
  }

  // Disable/Enable chat functionality
  const disableLink = win.querySelector('#stac-disable-link');
  let chatDisabled = localStorage.getItem('stac-disabled') === 'true';

  function toggleChatVisibility() {
    chatDisabled = !chatDisabled;
    if (chatDisabled) {
      localStorage.setItem('stac-disabled', 'true');
      win.classList.remove('open');
      win.style.display = 'none';
      fab.classList.remove('open');
      fab.innerHTML = '✦';
    } else {
      localStorage.removeItem('stac-disabled');
      win.style.display = 'flex';
      fab.classList.add('open');
      fab.innerHTML = '✕';
      refreshUIStrings();
      if (messagesEl.children.length === 0) showGreeting();
      setTimeout(() => inputEl.focus(), 100);
    }
  }

  // Check on load
  if (chatDisabled) {
    win.style.display = 'none';
    fab.classList.remove('open');
  }

  disableLink.addEventListener('click', (e) => {
    e.preventDefault();
    toggleChatVisibility();
  });
  disableLink.addEventListener('mouseover', () => {
    disableLink.style.color = '#aaa';
  });
  disableLink.addEventListener('mouseout', () => {
    disableLink.style.color = '#888';
  });

  fab.addEventListener('click', toggleWindow);
  sendBtn.addEventListener('click', () => sendMessage(inputEl.value.trim()));
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendMessage(inputEl.value.trim());
  });

  // Refresh strings if user changes language while widget is open
  const langObserver = new MutationObserver(() => {
    if (win.classList.contains('open')) refreshUIStrings();
  });
  langObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['lang', 'data-current-lang'] });

  console.log('[ST Arc Chat] Widget loaded');
})();
