/* Fabric Winterfest 2026: navigation, ticket waves, contact form, hover glow. */
(() => {
  'use strict';

  /* ---- Hover glow: cards light up where the pointer is ---- */
  const GLOW = '.piste, .wave, .facts-grid > div, .slot, .other-slope, .faq details, .contact-list li';
  if (window.matchMedia('(hover: hover)').matches) {
    document.addEventListener('pointermove', (e) => {
      const el = e.target.closest(GLOW);
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`);
      el.style.setProperty('--my', `${e.clientY - r.top}px`);
    }, { passive: true });
  }

  /* ---- Floating dock: tuck up once the page is scrolled ---- */
  const header = document.querySelector('.site-header');
  if (header) {
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---- Mobile menu ---- */
  const menuToggle = document.querySelector('.menu-toggle');
  const nav = document.getElementById('site-nav');
  if (menuToggle && nav) {
    const setMenu = (open) => {
      nav.classList.toggle('is-open', open);
      menuToggle.setAttribute('aria-expanded', String(open));
      menuToggle.querySelector('use').setAttribute('href', menuToggle.dataset.icons + (open ? '#i-x' : '#i-list'));
    };
    menuToggle.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); menuToggle.focus(); } });
  }

  /* ---- Program dropdown (desktop) ---- */
  const programBtn = document.querySelector('.nav-program > button');
  const programMenu = document.getElementById('program-menu');
  if (programBtn && programMenu) {
    const setProgram = (open) => {
      programBtn.setAttribute('aria-expanded', String(open));
      programMenu.hidden = !open;
    };
    programBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      setProgram(programBtn.getAttribute('aria-expanded') !== 'true');
    });
    document.addEventListener('click', (e) => { if (!e.target.closest('.nav-program')) setProgram(false); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && programBtn.getAttribute('aria-expanded') === 'true') { setProgram(false); programBtn.focus(); }
    });
    programMenu.addEventListener('focusout', (e) => { if (!programMenu.contains(e.relatedTarget) && e.relatedTarget !== programBtn) setProgram(false); });
  }

  /* ---- Ticket waves: mark the wave on sale right now ----
     Opening times carry the Belgian UTC offset (data-opens), so every visitor
     switches at the same moment. The list's data-closes ends sales after the event.
     Re-checked every minute and when the tab becomes visible again, so a page left
     open still moves the "On sale now" flag and the Get tickets button. */
  const waveList = document.querySelector('.waves');
  const waves = waveList ? [...waveList.querySelectorAll('.wave')] : [];
  if (waves.length) {
    const opens = waves.map((w) => (w.dataset.opens ? new Date(w.dataset.opens) : new Date(0)));
    const closes = waveList.dataset.closes ? new Date(waveList.dataset.closes) : null;
    waves.forEach((w) => { const f = w.querySelector('.wave-flag'); f.dataset.upcoming = f.innerHTML; });
    const update = () => {
      const now = new Date();
      let current = -1;
      opens.forEach((d, i) => { if (now >= d) current = i; });
      if (closes && now >= closes) current = waves.length; // event is over: every wave closed
      waves.forEach((w, i) => {
        const flag = w.querySelector('.wave-flag');
        w.classList.toggle('is-current', i === current);
        w.classList.toggle('is-past', i < current);
        if (i === current) flag.textContent = 'On sale now';
        else if (i < current) flag.textContent = 'Closed';
        else flag.innerHTML = flag.dataset.upcoming;
      });
      // Hero price line follows the live wave; hidden once sales have ended
      const live = document.querySelector('[data-live-price]');
      if (live) {
        const wave = waves[current];
        live.closest('li').hidden = !wave;
        if (wave) live.textContent = `${wave.querySelector('h3').textContent}: ${wave.querySelector('.wave-price').textContent}, on sale now`;
      }
    };
    update();
    setInterval(update, 60 * 1000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) update(); });
  }

  /* ---- Contact form: send via FormSubmit without leaving the page ---- */
  const form = document.getElementById('contact-form');
  const status = document.getElementById('contact-status');
  if (form && status) {
    const showStatus = (msg, ok) => {
      status.textContent = msg;
      status.dataset.state = ok ? 'success' : 'error';
      status.hidden = false;
    };
    // No-JS path: FormSubmit redirects back with ?sent=1
    if (new URLSearchParams(location.search).get('sent') === '1') {
      showStatus('Thanks, your message has been sent. We\'ll get back to you soon.', true);
    }
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const button = form.querySelector('button[type="submit"]');
      const label = button.querySelector('span');
      const data = Object.fromEntries(new FormData(form));
      delete data._next;
      data._subject = `Winterfest website: ${data.subject || 'new contact message'}`;
      button.disabled = true;
      label.textContent = 'Sending…';
      status.hidden = true;
      try {
        const res = await fetch(form.action.replace('formsubmit.co/', 'formsubmit.co/ajax/'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(data),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || String(json.success) !== 'true') throw new Error(json.message || res.statusText);
        form.reset();
        showStatus('Thanks, your message has been sent. We\'ll get back to you soon.', true);
      } catch (err) {
        showStatus('Sorry, your message could not be sent. Please email us directly at team@fabricbelgium.be.', false);
      } finally {
        button.disabled = false;
        label.textContent = 'Send message';
      }
    });
  }
})();
