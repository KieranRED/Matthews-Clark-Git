/* Matthews & Clark — Mobile hero interactions
   Loaded via Next.js Script strategy="afterInteractive"
   Only runs when #m-scroller is present (mc-site home page only) */

(() => {
  const scroller = document.getElementById('m-scroller');
  if (!scroller) return;                        // not on this page
  if (window.innerWidth > 860) return;          // not mobile — wider guard than CSS 760 for safety

  const $  = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

  const slides    = $$('.mobile-slide', scroller);
  const below     = document.getElementById('m-below');
  const topbar    = document.getElementById('m-topbar');
  const sticky    = document.getElementById('m-stickyCta');
  const hint      = document.getElementById('m-hint');
  const progress  = document.getElementById('m-progress');
  const drawer    = document.getElementById('m-drawer');
  const menuBtn   = document.getElementById('m-menuBtn');
  const closeBtn  = document.getElementById('m-closeDrawer');
  const svcToggle = document.getElementById('m-servicesToggle');
  const svcSub    = document.getElementById('m-servicesSub');

  // ── Drawer ──────────────────────────────────────────────────────────
  const openDrawer = () => {
    if (!drawer) return;
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
  };
  const closeDrawer = () => {
    if (!drawer) return;
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    if (svcSub) svcSub.classList.remove('open');
  };

  if (menuBtn) {
    menuBtn.addEventListener('touchstart', (e) => { e.stopPropagation(); }, { passive: false });
    menuBtn.addEventListener('touchend',   (e) => { e.preventDefault(); e.stopPropagation(); openDrawer(); }, { passive: false });
    menuBtn.addEventListener('click', openDrawer);
  }
  if (closeBtn) {
    closeBtn.addEventListener('touchstart', (e) => { e.stopPropagation(); }, { passive: false });
    closeBtn.addEventListener('touchend',   (e) => { e.preventDefault(); e.stopPropagation(); closeDrawer(); }, { passive: false });
    closeBtn.addEventListener('click', closeDrawer);
  }
  if (svcToggle) svcToggle.addEventListener('click', (e) => {
    e.preventDefault();
    if (svcSub) svcSub.classList.toggle('open');
  });

  // ── HLS initialisation ──────────────────────────────────────────────
  // hlsInstances[i] holds the hls.js instance for slide i, or null for native HLS.
  // The play engine uses this to call hls.startLoad() on stall recovery, which keeps
  // the hls.js instance intact — safer than v.load() which would sever hls.js attachment.
  const hlsInstances = new Array(slides.length).fill(null);

  function initHlsVideo(video, autoplay, slideIdx) {
    if (!video) return;
    const src = video.dataset.hls;
    if (!src) return;
    // React's `muted` prop is a known bug — it sets the JS property but NOT the
    // DOM attribute. iOS Safari checks the attribute for autoplay policy, so we
    // must set both. setAttribute first, then property, then load().
    video.setAttribute('muted', '');
    video.muted = true;

    function attach() {
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS — Safari / iOS. <source> in the HTML provides the URL.
        // If the inline pre-init script already called load(), skip it here —
        // calling load() again resets the buffer and causes a visible delay.
        if (!video.dataset.preinit) {
          video.load();
          if (autoplay) {
            video.addEventListener('canplay', () => video.play().catch(() => {}), { once: true });
          }
        }
        return;
      }
      if (!window.Hls || !window.Hls.isSupported()) return;
      const hls = new window.Hls({ debug: false, startLevel: -1, abrEwmaDefaultEstimate: 5000000 });
      hlsInstances[slideIdx] = hls;
      hls.loadSource(src);
      hls.attachMedia(video);
      if (autoplay) {
        hls.on(window.Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
      }
    }

    if (window.Hls) {
      attach();
    } else {
      // Reuse an already-loading script tag rather than creating one per slide.
      // Without this guard, slides.forEach fires all calls synchronously before
      // window.Hls is set, causing N duplicate hls.min.js loads.
      const existing = document.querySelector('script[src*="hls.min.js"]');
      if (existing) {
        existing.addEventListener('load', attach, { once: true });
      } else {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.7/dist/hls.min.js';
        s.onload = attach;
        document.head.appendChild(s);
      }
    }
  }
  // Slide 0 — init immediately so the hero video is ready on first paint.
  // Slides 1+ — lazy-init via IntersectionObserver so we don't fetch HLS
  // manifests for slides the user hasn't swiped to yet.
  if (slides[0]) initHlsVideo(slides[0].querySelector('video'), true, 0);

  if (slides.length > 1) {
    if ('IntersectionObserver' in window) {
      const hlsObs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const slideEl = entry.target;
          const idx = slides.indexOf(slideEl);
          if (idx > 0) {
            initHlsVideo(slideEl.querySelector('video'), false, idx);
            hlsObs.unobserve(slideEl);
          }
        });
      }, { rootMargin: '200px', threshold: 0 });
      slides.slice(1).forEach(slide => hlsObs.observe(slide));
    } else {
      // Fallback for older browsers — init all slides immediately
      slides.slice(1).forEach((slide, i) => initHlsVideo(slide.querySelector('video'), false, i + 1));
    }
  }

  // ── Progress bar-dots ────────────────────────────────────────────────
  if (progress) {
    slides.forEach((_, i) => {
      const d = document.createElement('span');
      d.className = 'dot' + (i === 0 ? ' active' : '');
      progress.appendChild(d);
    });
  }
  const dots = progress ? $$('.dot', progress) : [];

  // ── First-load swipe hint ────────────────────────────────────────────
  try {
    if (hint && !localStorage.getItem('mc_seenHint')) {
      setTimeout(() => hint.classList.add('show'), 1800);
      setTimeout(() => hint.classList.remove('show'), 4200);
      localStorage.setItem('mc_seenHint', '1');
    }
  } catch (_) {}

  // ── Sound toggle SVG paths ──────────────────────────────────────────
  const mutedPaths   = '<path d="M11 5L6 9H3v6h3l5 4V5z" fill="none" stroke="#fff" stroke-width="1.7"/><path d="M16 8l5 8M21 8l-5 8" stroke="#fff" stroke-width="1.7" stroke-linecap="round"/>';
  const unmutedPaths = '<path d="M11 5L6 9H3v6h3l5 4V5z" fill="none" stroke="#fff" stroke-width="1.7"/><path d="M15 9c1.5 1 1.5 5 0 6M18 6c3 2 3 10 0 12" stroke="#fff" stroke-width="1.7" stroke-linecap="round" fill="none"/>';

  // Global sound state — persists across slides, resets when leaving the hero.
  let soundOn = false;

  // Apply current soundOn state to a video + its button icon.
  // When unmuting: removes the muted attribute so iOS actually passes audio through.
  // When muting: only sets the property — never setAttribute after play() has been
  // invoked or Safari may cancel the pending play request.
  function applySoundState(slide, on) {
    const v   = slide.querySelector('video');
    const btn = slide.querySelector('[data-sound]');
    const svg = btn && btn.querySelector('svg');
    if (v) {
      if (on) { v.removeAttribute('muted'); v.muted = false; }
      else    { v.muted = true; }
    }
    if (svg) svg.innerHTML = on ? unmutedPaths : mutedPaths;
  }

  function setupSound(slide) {
    const v   = slide.querySelector('video');
    const btn = slide.querySelector('[data-sound]');
    if (!v || !btn) return;

    const toggle = () => { soundOn = !soundOn; applySoundState(slide, soundOn); };

    btn.addEventListener('touchstart', (e) => { e.stopPropagation(); }, { passive: false });
    btn.addEventListener('touchend',   (e) => { e.preventDefault(); e.stopPropagation(); toggle(); }, { passive: false });
    btn.addEventListener('click',      (e) => { e.stopPropagation(); toggle(); });
  }
  slides.forEach(setupSound);

  // ── Bulletproof play engine ──────────────────────────────────────────
  //
  // Design:
  //   Each slide slot has a version counter (slotVer[ix]).
  //   startSlotPlay() increments the version, making every callback from the
  //   previous session instantly stale — no ghost plays, no double-fires.
  //   live() = "is this session still the current owner of slot ix?"
  //
  // Retry ladder (never gives up while the slide is active):
  //   1. play() — immediate
  //   2. AbortError (concurrent play collision, e.g. pre-init + IO observer racing)
  //      → retry after 200 ms; the winner's play() will have resolved or failed cleanly.
  //   3. Any other rejection (NotAllowedError, NotSupportedError — video not ready):
  //      a. If readyState ≥ 3 already → retry after 80 ms (video is ready, just
  //         hit a transient policy window; a short pause is enough)
  //      b. Otherwise → wait for 'canplay', with a hard timeout:
  //           ≤ 2 retries: 3 500 ms timeout
  //           > 2 retries: 7 000 ms timeout
  //         On timeout, force-reload the source to unstick a stalled buffer:
  //           hls.js path  → hls.startLoad(-1)  (keeps instance, reloads from start)
  //           native HLS   → v.load()            (re-evaluates <source>, muted attr intact)
  //         Then schedule another retry.
  //   4. After MAX_RETRIES force-reloads, switch to 5 s poll — keeps trying
  //      indefinitely but stops hammering the server.
  //   5. Health watch — once playing, poll every HEALTH_MS. If the video is
  //      unexpectedly paused (network stall, iOS background, etc.), restart the
  //      whole ladder from step 1.
  //
  // External recovery:
  //   • visibilitychange: page foregrounded → restart if active slide video is paused.
  //   • Leaving the hero: active = -1 + cancelAll() → all live() checks fail instantly.

  let active = -1; // -1 = hero section not visible / pre-first-IO-fire

  const slotVer    = new Array(slides.length).fill(0);   // version counter per slot
  const slotCancel = new Array(slides.length).fill(null); // current session cancel fn

  const STALL_MS    = 3500; // ms to wait for 'canplay' before forcing a reload
  const HEALTH_MS   = 2000; // ms between health-watch polls
  const MAX_RETRIES = 5;    // force-reload attempts before switching to long-poll

  function cancelSlotPlay(ix) {
    if (slotCancel[ix]) { slotCancel[ix](); slotCancel[ix] = null; }
  }
  function cancelAll() {
    slides.forEach((_, ix) => cancelSlotPlay(ix));
  }

  function startSlotPlay(v, ix) {
    cancelSlotPlay(ix);

    const ver  = ++slotVer[ix];
    const live = () => active === ix && slotVer[ix] === ver;

    let canplayH = null; // current 'canplay' listener, if any
    let stallT   = null; // stall / retry timer
    let healthT  = null; // health-watch timer
    let retries  = 0;

    // Tear down all timers + listeners for this session.
    const cleanup = () => {
      clearTimeout(stallT);  stallT   = null;
      clearTimeout(healthT); healthT  = null;
      if (canplayH) { v.removeEventListener('canplay', canplayH); canplayH = null; }
      if (slotCancel[ix] === cleanup) slotCancel[ix] = null;
    };
    slotCancel[ix] = cleanup;

    // ─── Single play attempt ────────────────────────────────────────
    const attempt = () => {
      if (!live()) return cleanup();

      v.muted = true; // always muted for iOS autoplay policy; unmuted in .then() after play resolves

      const p = v.play();
      if (!p) { cleanup(); return; } // old browser sync path

      p.then(() => {
        if (!live()) { try { v.pause(); } catch (_) {} cleanup(); return; }
        // ── Play succeeded ──────────────────────────────────────────
        cleanup(); // retire retry machinery
        if (soundOn) { v.removeAttribute('muted'); v.muted = false; }
        const svg = slides[ix] && slides[ix].querySelector('[data-sound] svg');
        if (svg) svg.innerHTML = soundOn ? unmutedPaths : mutedPaths;
        healthWatch();
      }).catch((err) => {
        if (!live()) return cleanup();

        if (err && err.name === 'AbortError') {
          // Another play() call superseded ours (pre-init and IO observer racing,
          // or a rapid slide switch). The winning call will resolve on its own;
          // we just need to check back shortly in case it also failed.
          stallT = setTimeout(attempt, 200);
          return;
        }

        // Video not ready yet — enter retry ladder
        retry();
      });
    };

    // ─── Retry: wait for 'canplay' + stall-timeout fallback ─────────
    const retry = () => {
      if (!live()) return cleanup();
      retries++;

      clearTimeout(stallT); stallT = null;
      if (canplayH) { v.removeEventListener('canplay', canplayH); canplayH = null; }

      // Video already has enough data — just re-attempt directly (no event needed)
      if (v.readyState >= 3) { stallT = setTimeout(attempt, 80); return; }

      // Wait for 'canplay'
      canplayH = () => {
        canplayH = null;
        clearTimeout(stallT); stallT = null;
        if (live()) attempt();
      };
      v.addEventListener('canplay', canplayH, { once: true });

      // Hard timeout — if 'canplay' hasn't fired, the source is genuinely stalled.
      const ms = retries <= 2 ? STALL_MS : STALL_MS * 2;
      stallT = setTimeout(() => {
        stallT = null;
        if (canplayH) { v.removeEventListener('canplay', canplayH); canplayH = null; }
        if (!live()) return cleanup();

        // Force-reload the source to unstick the buffer.
        const hls = hlsInstances[ix];
        if (hls) {
          try { hls.startLoad(-1); } catch (_) {} // hls.js: reload from start, instance intact
        } else {
          try { v.load(); } catch (_) {}           // native HLS: re-evaluates <source>
        }

        if (retries < MAX_RETRIES) {
          stallT = setTimeout(retry, 300); // brief pause for load() to take effect
        } else {
          // Past the reload budget — switch to a long-interval poll.
          // Keeps trying indefinitely without hammering the server.
          const poll = () => {
            if (!live()) return;
            if (v.readyState >= 3 || v.networkState === 2 /* NETWORK_LOADING */) {
              attempt();
            } else {
              stallT = setTimeout(poll, 5000);
            }
          };
          stallT = setTimeout(poll, 5000);
        }
      }, ms);
    };

    // ─── Health watch — detect unexpected stalls post-play ────────────
    // Polls every HEALTH_MS. If the video is paused while still the active
    // slide (network stall, iOS memory pressure, backgrounding, etc.),
    // restart the whole play ladder from scratch.
    const healthWatch = () => {
      clearTimeout(healthT);
      healthT = setTimeout(() => {
        healthT = null;
        if (!live()) return;
        if (v.paused && !v.ended) {
          startSlotPlay(v, ix); // full restart — new session, new version
          return;
        }
        healthWatch(); // still playing — schedule next check
      }, HEALTH_MS);
    };

    attempt();
  }

  // ── Page visibility recovery ─────────────────────────────────────────
  // iOS pauses all media when the app moves to background. On return to
  // foreground, kick the active slide if it's no longer playing.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden || active < 0 || active >= slides.length) return;
    const v = slides[active].querySelector('video');
    if (v && v.paused && !v.ended) startSlotPlay(v, active);
  }, { passive: true });

  // ── Track active slide + play/pause videos ───────────────────────────
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting || en.intersectionRatio < 0.5) return;
      const i = +en.target.dataset.i;
      if (i === active) return;
      active = i;

      slides.forEach((s, ix) => {
        const v = s.querySelector('video');
        if (!v) return;

        if (ix === i) {
          // Sync icon immediately (before play resolves) so the UI never flashes
          const svg = s.querySelector('[data-sound] svg');
          if (svg) svg.innerHTML = soundOn ? unmutedPaths : mutedPaths;
          startSlotPlay(v, ix);
        } else {
          // Deactivate — cancel any in-flight play session before pausing
          cancelSlotPlay(ix);
          try { v.pause(); v.currentTime = 0; v.muted = true; } catch (_) {}
          const svg = s.querySelector('[data-sound] svg');
          const btn = s.querySelector('[data-sound]');
          if (svg) svg.innerHTML = mutedPaths;
          if (btn) btn.style.borderColor = '';
        }
      });

      dots.forEach((d, ix) => d.classList.toggle('active', ix === i));
      if (i !== 0) clearTimeout(peekTimer);
    });
  }, { root: scroller, threshold: [0, 0.5, 0.99] });
  slides.forEach((s) => io.observe(s));

  // ── Peek nudge: bounce slide up after 4s to hint at scrollability ────
  let peekTimer = null;
  const resetPeek = () => {
    clearTimeout(peekTimer);
    if (active > 0) return;
    peekTimer = setTimeout(() => {
      const s = slides[0];
      if (!s || scroller.scrollTop > 60) return;
      s.classList.add('nudging');
      s.addEventListener('animationend', () => {
        s.classList.remove('nudging');
        resetPeek();
      }, { once: true });
    }, 4000);
  };
  resetPeek();

  // ── Scroll: topbar state + sticky CTA + snap release + peek reset ────
  let snapReleased = false;
  let wasInFeed    = true;
  const RELEASE  = 200;
  const REENGAGE = 800;

  scroller.addEventListener('scroll', () => {
    const y        = scroller.scrollTop;
    const max      = scroller.scrollHeight - scroller.clientHeight;
    const belowTop = below ? below.offsetTop : Infinity;
    const inFeed   = y < belowTop - 80;

    if (y > 10) { clearTimeout(peekTimer); if (slides[0]) slides[0].classList.remove('nudging'); }

    if (wasInFeed && !inFeed) {
      // Leaving the slide section — set active = -1 BEFORE cancelAll() so that
      // every in-flight live() check fails immediately with no side-effects.
      soundOn = false;
      active  = -1;
      cancelAll();
      slides.forEach((s) => {
        const v = s.querySelector('video');
        if (!v) return;
        v.muted = true;
        try { v.pause(); } catch (_) {}
        const svg = s.querySelector('[data-sound] svg');
        const btn = s.querySelector('[data-sound]');
        if (svg) svg.innerHTML = mutedPaths;
        if (btn) btn.style.borderColor = '';
      });
    }
    wasInFeed = inFeed;

    if (topbar) {
      // Never apply 'scrolled' (dark bg) while inside the hero slides —
      // topbar stays transparent over video; only goes opaque once below the fold.
      topbar.classList.remove('scrolled');
      topbar.classList.toggle('opaque', !inFeed);
    }
    if (progress) progress.style.opacity = inFeed ? '1' : '0';
    if (sticky)   sticky.classList.toggle('visible', !inFeed && y < max - 40);

    if (!snapReleased && y >= belowTop - RELEASE) {
      scroller.style.scrollSnapType = 'none';
      snapReleased = true;
    } else if (snapReleased && y < belowTop - REENGAGE) {
      scroller.style.scrollSnapType = 'y mandatory';
      snapReleased = false;
    }
  }, { passive: true });

  // ── Status-bar tap → scroll to top (mirrors iOS native behaviour) ──────
  const statusBarTap = document.getElementById('m-statusBarTap');
  if (statusBarTap) {
    statusBarTap.addEventListener('touchend', (e) => {
      e.preventDefault();
      scroller.scrollTo({ top: 0, behavior: 'smooth' });
    }, { passive: false });
    statusBarTap.addEventListener('click', () => {
      scroller.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ── Book CTAs — navigate to lead form at / ───────────────────────────
  $$('[data-book]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (drawer && drawer.classList.contains('open')) closeDrawer();
      window.location.href = '/';
    });
  });

  // ── Book form success state ──────────────────────────────────────────
  const bookForm = document.getElementById('m-book-form');
  if (bookForm) {
    bookForm.addEventListener('submit', (e) => {
      e.preventDefault();
      bookForm.classList.add('sent');
    });
  }
})();
