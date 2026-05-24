/* =========================================================================
   Matthews & Clark — Shared site script (subpages)
   Injects nav, drawer, footer, mobile sticky CTA.
   Page-level integration:
     <body data-page="ppf">               // for active-link highlighting
     <header data-mc-nav></header>
     <footer data-mc-footer></footer>
     <!-- mobile sticky CTA injected automatically -->
   ========================================================================= */

(() => {
  // ── SERVICE INDEX (single source of truth) ─────────────────────
  const SERVICES = [
    { name: 'PPF',                  href: '/ppf',             id: 'ppf' },
    { name: 'Wrapping',             href: '/wrapping',        id: 'wrapping' },
    { name: 'Ceramic Coating',      href: '/ceramic',         id: 'ceramic' },
    { name: 'Paint Correction',     href: '/correction',      id: 'correction' },
    { name: 'Detailing',            href: '/detailing',       id: 'detailing' },
    { name: 'Body Kits',            href: '/body-kits',       id: 'body-kits' },
    { name: 'Custom Wheels',        href: '/wheels',          id: 'wheels' },
    { name: 'Starlight Headliners', href: '/starlight',       id: 'starlight' },
  ];

  const TOP_LINKS = [
    { label: 'The Log',    href: '#',             id: 'log' },
    { label: 'Community',  href: '/community',    id: 'community' },
    { label: 'Work',       href: '/work',         id: 'work' },
    { label: 'About',      href: '/about',        id: 'about' },
    { label: 'Shop',       href: '/shop',         id: 'shop' },
  ];

  const page = document.body.dataset.page || '';

  // ── NAV ──────────────────────────────────────────────────────────
  const navHost = document.querySelector('[data-mc-nav]');
  if (navHost) {
    const svcDrop = SERVICES.map(s => `
      <a href="${s.href}" class="${s.id === page ? 'active' : ''}">
        ${s.name}<span class="arr">→</span>
      </a>
    `).join('');

    const links = TOP_LINKS.filter(l => ['log','community','about'].includes(l.id))
      .map(l => `<a href="${l.href}" class="${l.id === page ? 'active' : ''}">${l.label}</a>`)
      .join('');

    navHost.outerHTML = `
      <header class="nav" id="nav">
        <a class="brand" href="/" aria-label="Matthews / Clark — home">
          <span class="wm">Matthews<span class="slash">/</span>Clark</span>
          <span class="mono">Cape Town</span>
        </a>
        <nav class="links" aria-label="Primary">
          <span class="svc-wrap">
            <a class="has-caret ${SERVICES.some(s => s.id === page) || page === 'services' ? 'active' : ''}"
               href="/services">Services <span>▾</span></a>
            <div class="svc-drop" role="menu">${svcDrop}</div>
          </span>
          ${links}
        </nav>
        <div class="right">
          <a class="btn-accent" href="#book" data-book>
            Book a Slot
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M5 12h14M13 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </a>
          <button class="hamburger" id="mcHamburger" aria-label="Open menu">
            <span class="lines"><span></span><span></span></span>
          </button>
        </div>
      </header>
    `;

    // Scroll behaviour
    const nav = document.getElementById('nav');
    let lastY = -1;
    const onScroll = () => {
      const y = window.scrollY;
      if (y === lastY) return;
      lastY = y;
      nav.classList.toggle('scrolled', y > 60);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ── DRAWER ───────────────────────────────────────────────────────
  const drawer = document.createElement('aside');
  drawer.className = 'drawer';
  drawer.setAttribute('aria-hidden', 'true');
  drawer.innerHTML = `
    <div class="top">
      <span class="wm">Matthews<span class="slash">/</span>Clark</span>
      <button class="close" id="mcDrawerClose" aria-label="Close menu">✕</button>
    </div>
    <nav>
      <a href="#" class="svc-toggle" id="mcDrawerServices">Services <span class="ix">01</span></a>
      <div class="svc-sub" id="mcDrawerServicesSub">
        ${SERVICES.map(s => `<a href="${s.href}">${s.name}</a>`).join('')}
      </div>
      <a href="#">The Log <span class="ix">02</span></a>
      <a href="/community">Community <span class="ix">03</span></a>
      <a href="/work">Work <span class="ix">04</span></a>
      <a href="/about">About <span class="ix">05</span></a>
      <a href="/shop">Shop <span class="ix">06</span></a>
    </nav>
    <div class="spacer"></div>
    <div class="socials">
      <a href="#">Instagram</a>
      <a href="#">TikTok</a>
      <a href="#">WhatsApp</a>
    </div>
    <a class="dm-big" href="#book" data-book data-close-drawer>Book a Slot <span>→</span></a>
  `;
  document.body.appendChild(drawer);

  const hamburger = document.getElementById('mcHamburger');
  const closeBtn  = document.getElementById('mcDrawerClose');
  const svcToggle = document.getElementById('mcDrawerServices');
  const svcSub    = document.getElementById('mcDrawerServicesSub');

  const openDrawer  = () => { drawer.classList.add('open'); drawer.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden'; };
  const closeDrawer = () => { drawer.classList.remove('open'); drawer.setAttribute('aria-hidden','true'); document.body.style.overflow=''; if (svcSub){ svcSub.classList.remove('open'); svcToggle.classList.remove('open'); } };

  if (hamburger) hamburger.addEventListener('click', openDrawer);
  if (closeBtn)  closeBtn.addEventListener('click', closeDrawer);
  if (svcToggle) svcToggle.addEventListener('click', (e) => {
    e.preventDefault();
    svcSub.classList.toggle('open');
    svcToggle.classList.toggle('open');
  });

  // Close drawer on link click (other than services toggle)
  drawer.querySelectorAll('a:not(.svc-toggle)').forEach(a => {
    a.addEventListener('click', () => {
      if (a.hasAttribute('data-close-drawer') || a.getAttribute('href') !== '#') closeDrawer();
    });
  });

  // ── FOOTER ───────────────────────────────────────────────────────
  const footHost = document.querySelector('[data-mc-footer]');
  if (footHost) {
    const svcList = SERVICES.map(s => `<li><a href="${s.href}">${s.name}</a></li>`).join('');
    footHost.outerHTML = `
      <footer class="footer">
        <div class="footer-grid">
          <div>
            <h4>— Matthews / Clark</h4>
            <p class="lede">Protection &amp; presence for the cars you've worked for. Cape Town, by appointment.</p>
          </div>
          <div>
            <h4>Services</h4>
            <ul>${svcList}</ul>
          </div>
          <div>
            <h4>Explore</h4>
            <ul>
              <li><a href="#">The Log</a></li>
              <li><a href="/community">Community</a></li>
              <li><a href="/work">Work</a></li>
              <li><a href="/about">About</a></li>
              <li><a href="/shop">Shop</a></li>
            </ul>
          </div>
          <div>
            <h4>Follow</h4>
            <ul>
              <li><a href="#">Instagram ↗</a></li>
              <li><a href="#">TikTok ↗</a></li>
              <li><a href="#">WhatsApp ↗</a></li>
            </ul>
          </div>
          <div>
            <h4>Visit</h4>
            <ul>
              <li>3 Muir Road, Woodstock</li>
              <li>By appointment only</li>
              <li>Mon–Fri 08–17</li>
              <li><a href="#book" data-book>Book a slot →</a></li>
            </ul>
          </div>
        </div>
        <div class="wordmark-row">
          <div class="wordmark">M<span class="slash">/</span>C</div>
          <div class="legal">
            © 2026 Matthews / Clark<br/>
            Cape Town, South Africa<br/>
            <a href="#">Terms</a>  ·  <a href="#">Privacy</a>
          </div>
        </div>
      </footer>
    `;
  }

  // ── MOBILE STICKY CTA ────────────────────────────────────────────
  if (!document.querySelector('.sticky-cta')) {
    const sticky = document.createElement('a');
    sticky.className = 'sticky-cta';
    sticky.href = '#book';
    sticky.setAttribute('data-book', '');
    sticky.innerHTML = `<span>Book a Slot</span><span class="arr">→</span>`;
    document.body.appendChild(sticky);
  }

  // ── BOOK-A-SLOT SMOOTH SCROLL ────────────────────────────────────
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-book]');
    if (!t) return;
    const href = t.getAttribute('href') || '';
    const target = document.getElementById('book');
    if (target) {
      e.preventDefault();
      if (drawer.classList.contains('open')) closeDrawer();
      window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 80, behavior:'smooth' });
      setTimeout(() => {
        const f = target.querySelector('input,select,textarea');
        if (f) f.focus({ preventScroll: true });
      }, 700);
    } else {
      // no #book on this page — navigate to booking
      e.preventDefault();
      window.location.href = 'https://matthewsandclark.co.za';
    }
  });

  // Escape closes drawer
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('open')) closeDrawer();
  });
})();
