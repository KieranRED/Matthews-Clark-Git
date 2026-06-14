/* Wrap Studio — App: layout, state, persistence, journey, compare + quote */
(function () {
  const { useState, useEffect, useRef, useCallback } = React;
  const h = React.createElement;
  const I = window.Icon;

  const PANELS = [
    { key: 'full', label: 'Full body' }, { key: 'bonnet', label: 'Bonnet' },
    { key: 'roof', label: 'Roof' }, { key: 'mirrors', label: 'Mirrors' },
    { key: 'pillars', label: 'Pillars' }, { key: 'boot', label: 'Boot' },
    { key: 'accents', label: 'Accents / stripes' },
  ];
  const LS = 'mc-wrap-studio-v1';
  const load = () => { try { return JSON.parse(localStorage.getItem(LS)) || {}; } catch { return {}; } };
  const saved = load();

  function encodeSelection(panelColors) {
    try {
      return btoa(JSON.stringify(panelColors)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    } catch { return ''; }
  }
  function decodeSelection(encoded) {
    try {
      const b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
      const obj = JSON.parse(atob(b64));
      return (obj && typeof obj === 'object') ? obj : null;
    } catch { return null; }
  }
  const shareParam = (() => {
    try { return new URL(window.location.href).searchParams.get('s'); } catch { return null; }
  })();
  const sharedColors = shareParam ? decodeSelection(shareParam) : null;

  function App() {
    const [carUrl, setCarUrl] = useState(saved.carUrl || null);
    const [originalUrl, setOriginalUrl] = useState(saved.originalUrl || null);
    const [selectedId, setSelectedId] = useState(
      sharedColors ? (sharedColors.full || Object.values(sharedColors)[0] || null) : (saved.selectedId || null)
    );
    const [panelColors, setPanelColors] = useState(sharedColors || saved.panelColors || {});
    const [activePanel, setActivePanel] = useState(saved.activePanel || 'full');
    const [query, setQuery] = useState('');
    const [brandTab, setBrandTab] = useState('All');
    const [finish, setFinish] = useState('all');
    const [favOnly, setFavOnly] = useState(false);
    const [favs, setFavs] = useState(saved.favs || {});
    const [pins, setPins] = useState(saved.pins || []);
    const [baActive, setBaActive] = useState(false);
    const [rendering, setRendering] = useState(false);
    const [renderPct, setRenderPct] = useState(0);
    const [renderUrl, setRenderUrl] = useState(null);
    const [sessionRenderCount, setSessionRenderCount] = useState(0);
    const [compareOpen, setCompareOpen] = useState(false);
    const [quoteOpen, setQuoteOpen] = useState(false);
    const [quoteSent, setQuoteSent] = useState(false);
    const [toast, setToast] = useState(null);
    const toastT = useRef(null);

    const all = window.WRAP_CATALOGUE;
    const sel = selectedId ? all.find((s) => s.id === selectedId) : null;

    // persist
    useEffect(() => {
      const data = { carUrl, originalUrl, selectedId, panelColors, activePanel, favs, pins };
      try { localStorage.setItem(LS, JSON.stringify(data)); } catch (e) {
        // Quota exceeded — save without large dataURLs
        if (e instanceof DOMException) {
          try { localStorage.setItem(LS, JSON.stringify({...data, carUrl: null, originalUrl: null})); } catch {}
        }
      }
    }, [carUrl, selectedId, panelColors, activePanel, favs, pins]);

    const flash = useCallback((msg) => {
      setToast(msg); clearTimeout(toastT.current);
      toastT.current = setTimeout(() => setToast(null), 2200);
    }, []);

    const onSelect = useCallback((sw) => {
      setSelectedId((prev) => {
        if (prev === sw.id) {
          // Deselect — remove from active panel
          setPanelColors((p) => { const n = { ...p }; delete n[activePanel]; return n; });
          return null;
        }
        setPanelColors((p) => ({ ...p, [activePanel]: sw.id }));
        return sw.id;
      });
    }, [activePanel]);

    const toggleFav = useCallback((sw) => {
      setFavs((p) => { const n = { ...p }; if (n[sw.id]) delete n[sw.id]; else n[sw.id] = 1; return n; });
    }, []);
    const togglePin = useCallback((sw) => {
      setPins((p) => {
        if (p.includes(sw.id)) return p.filter((x) => x !== sw.id);
        if (p.filter(Boolean).length >= 4) { flash('Comparison holds 4 — remove one first'); return p; }
        return [...p, sw.id];
      });
    }, [flash]);

    const startRender = useCallback(async () => {
      if (!carUrl) { flash('Upload your car photo first'); return; }
      // session cap disabled — re-enable before public launch
      // if (sessionRenderCount >= 3) { flash('Too many renders — try again shortly'); return; }
      if (typeof window.__wrapRenderCanvas !== 'function') { flash('Render not ready yet'); return; }

      setRendering(true); setRenderPct(0);
      const CREEP = 170000; const t0 = performance.now(); let raf;  // gpt-image-2 quality:high takes 120-180s
      const tick = (now) => {
        const p = Math.min(90, ((now - t0) / CREEP) * 90);
        setRenderPct(p);
        if (p < 90) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);

      try {
        const pack = await window.__wrapRenderCanvas();
        if (!pack || !pack.photoBlob) throw new Error('canvas-null');
        // The car is the fixed anchor: send the ORIGINAL photo (keeps wings/thin
        // parts), the studio bay as a reference to rebuild around it, and the exact
        // colour swatch. The model integrates — relights, matches perspective, casts
        // shadows. No mask, no client re-composite.
        const fd = new FormData();
        fd.append('image', pack.photoBlob, 'car.jpg');
        if (pack.bayBlob) fd.append('bay', pack.bayBlob, 'bay.jpg');
        if (pack.swatchBlob) fd.append('swatch', pack.swatchBlob, 'swatch.png');
        fd.append('finish', (sel && sel.finish) || 'gloss');
        fd.append('colourName', (sel && sel.name) || 'wrap');
        fd.append('colourHex', (sel && sel.hex) || '');
        fd.append('size', pack.size || '1536x1024');

        const ctrl = new AbortController();
        const to = setTimeout(() => ctrl.abort(), 290000);
        const resp = await fetch('/api/wrap-render', { method: 'POST', body: fd, signal: ctrl.signal });
        clearTimeout(to);
        cancelAnimationFrame(raf); setRenderPct(100);

        if (resp.status === 429) { setRendering(false); setRenderPct(0); flash('Too many renders — try again shortly'); return; }
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.detail || 'api-' + resp.status);

        setRenderUrl(data.renderUrl);
        setSessionRenderCount((c) => c + 1);
        setTimeout(() => { setRendering(false); flash('Studio render ready'); }, 300);
      } catch (err) {
        cancelAnimationFrame(raf); setRendering(false); setRenderPct(0);
        flash(err && err.name === 'AbortError' ? 'Render timed out — try again' : (err.message || 'Render failed — try again'));
      }
    }, [carUrl, sel, flash, sessionRenderCount]);

    // A studio render belongs to one photo + colour combination — clear it the
    // moment either changes so a stale render never masks the live preview
    useEffect(() => { setRenderUrl(null); }, [carUrl, selectedId]);

    const finishLabel = sel ? ((window.FINISHES.find((f) => f.key === sel.finish) || {}).label || '') : '';
    const brandShort = sel ? (sel.brand === 'Avery Dennison' ? 'AVERY' : sel.brand.toUpperCase()) : '';

    // journey: car → film → render → quote
    const steps = [
      { k: 'car', label: 'Car', done: !!carUrl },
      { k: 'film', label: 'Film', done: !!sel },
      { k: 'render', label: 'Render', done: !!renderUrl },
      { k: 'quote', label: 'Quote', done: quoteSent },
    ];
    const nowIdx = steps.findIndex((s) => !s.done);

    return h('div', { className: 'app' },
      // ── top bar ──
      h('header', { className: 'topbar' },
        h('div', { className: 'tb-brand' },
          h('div', { className: 'tb-wm' }, 'MATTHEWS', h('span', { className: 'sl' }, '/'), 'CLARK'),
          h('div', { className: 'tb-tool' }, 'Wrap Studio')),

        // journey rail
        h('div', { className: 'journey' },
          steps.map((s, i) => h(React.Fragment, { key: s.k },
            i > 0 ? h('span', { className: 'j-sep' + (steps[i - 1].done ? ' done' : '') }) : null,
            h('span', { className: 'j-step' + (s.done ? ' done' : i === nowIdx ? ' now' : '') },
              h('span', { className: 'n' }, s.done ? '✓' : String(i + 1).padStart(2, '0').slice(1)),
              s.label)))),

        h('div', { className: 'tb-actions' },
          h('button', { className: 'btn btn--ghost btn--sm', onClick: () => {
            try { localStorage.removeItem(LS); } catch {}
            setCarUrl(null); setOriginalUrl(null); setSelectedId(null); setPanelColors({}); setActivePanel('full');
            setFavs({}); setPins([]); setRenderUrl(null); setQuoteSent(false);
            flash('Session reset');
          }}, h(I.Refresh, { size: 14 }), 'Reset'),
          h('button', { className: 'btn btn--ghost btn--sm', onClick: () => {
            try {
              const url = new URL(window.location.href);
              const enc = encodeSelection(panelColors);
              if (!enc || Object.keys(panelColors).length === 0) { flash('Pick a colour first'); return; }
              url.searchParams.set('s', enc);
              navigator.clipboard.writeText(url.toString())
                .then(() => flash('Shareable link copied'))
                .catch(() => flash('Could not copy link'));
            } catch { flash('Could not copy link'); }
          }},
            h(I.Share, { size: 14 }), 'Share'),
          h('button', { className: 'btn btn--ghost btn--sm', onClick: async () => {
            if (!carUrl) { flash('Add your car photo first'); return; }
            if (typeof window.__wrapDownload !== 'function') { flash('Render not ready yet'); return; }
            const ok = await window.__wrapDownload();
            flash(ok ? 'Render downloaded (watermarked)' : 'Nothing to download yet');
          }},
            h(I.Download, { size: 14 }), 'Download'),
          h('button', { className: 'btn btn--primary btn--sm', onClick: () => setQuoteOpen(true) },
            'Send to M&C', h('span', { className: 'arr' }, h(I.Send, { size: 13 }))))),

      // ── workspace ──
      h('div', { className: 'workspace' },
        h(window.WrapStage, {
          swatch: sel, carUrl, setCarUrl, originalUrl, setOriginalUrl,
          rendering, renderPct, startRender, baActive, setBaActive,
          panels: PANELS, panelColors, activePanel, setActivePanel,
          finishLabel, brandShort, renderUrl,
        }),
        h(window.CataloguePanel, {
          query, setQuery, brandTab, setBrandTab, finish, setFinish, favOnly, setFavOnly,
          selectedId, onSelect, favs, toggleFav, pins, togglePin,
          openCompare: () => setCompareOpen(true), panelColors, activePanel, panels: PANELS,
          onQuote: () => setQuoteOpen(true),
        })),

      compareOpen ? h(CompareModal, { pins, carUrl, onClose: () => setCompareOpen(false), onPick: (sw) => { onSelect(sw); setCompareOpen(false); } }) : null,
      quoteOpen ? h(QuoteModal, { sel, panelColors, panels: PANELS, carUrl,
        onClose: () => setQuoteOpen(false),
        onSent: (ok, msg) => {
          if (ok) { setQuoteOpen(false); setQuoteSent(true); flash('Sent to Matthews & Clark — we\'ll come back fast'); }
          else { flash(msg || 'Could not send — try again'); }
        } }) : null,

      // toast
      h('div', { className: 'toast' + (toast ? ' show' : '') }, toast ? h(I.Check, { size: 16 }) : null, toast || ''));
  }

  // ── 2×2 comparison — each cell staged in the real bay ──
  function CompareModal({ pins, carUrl, onClose, onPick }) {
    const all = window.WRAP_CATALOGUE;
    const items = pins.filter(Boolean).map((id) => all.find((s) => s.id === id)).filter(Boolean);
    return h('div', { className: 'modal-veil', onClick: onClose },
      h('div', { className: 'modal modal--cmp', onClick: (e) => e.stopPropagation() },
        h('div', { className: 'modal-head' },
          h('div', null, h('div', { className: 'm-eyebrow' }, 'Comparison'), h('h3', null, 'Your car in ' + items.length + ' films')),
          h('button', { className: 'pill-btn', onClick: onClose }, h(I.X, { size: 16 }))),
        h('div', { className: 'cmp-grid' },
          items.map((sw) => h(CompareCell, { key: sw.id, sw, carUrl, onPick })))));
  }
  function CompareCell({ sw, carUrl, onPick }) {
    const fx = window.fxFor(sw);
    const mask = carUrl ? { WebkitMaskImage: `url(${carUrl})`, maskImage: `url(${carUrl})` } : null;
    return h('button', { className: 'cmp-cell', onClick: () => onPick(sw),
      style: { '--wrap-color': sw.hex } },
      h('div', { className: 'cmp-stage' },
        h('div', { className: 'car-box' },
          carUrl
            ? h(React.Fragment, null,
                h('img', { className: 'car-base', src: carUrl, alt: '' }),
                h('div', { className: 'car-fx car-tone', style: { ...mask, opacity: fx.tone.opacity, background: '#000' } }),
                h('div', { className: 'car-fx car-tint ' + (fx.anim || ''), style: { ...mask, ...fx.tint } }),
                h('div', { className: 'car-fx car-sheen', style: { ...mask, opacity: fx.sheen.opacity, background: 'linear-gradient(118deg,rgba(255,255,255,.9),transparent 26%,transparent 72%,rgba(255,255,255,.4))' } }))
            : h('div', { style: { position: 'absolute', inset: '20% 10%', borderRadius: 12, background: fx.tint.background, opacity: .85 } }))),
      h('div', { className: 'cmp-meta' },
        h('div', { className: 'cmp-dot', style: { background: window.swChipBg(sw) } }),
        h('div', { style: { minWidth: 0 } },
          h('div', { className: 'cmp-name' }, sw.name),
          h('div', { className: 'cmp-code' }, sw.brand + ' · ' + sw.code))));
  }

  // ── quote / send-to-M&C ──
  function QuoteModal({ sel, panelColors, panels, carUrl, onClose, onSent }) {
    const all = window.WRAP_CATALOGUE;
    const assigned = panels.map((p) => ({ p, sw: panelColors[p.key] ? all.find((s) => s.id === panelColors[p.key]) : null }))
      .filter((x) => x.sw);
    const list = assigned.length ? assigned : (sel ? [{ p: panels[0], sw: sel }] : []);
    const rank = { standard: 0, premium: 1, specialist: 2 };
    const top = list.reduce((t, x) => rank[x.sw.tier] > rank[t] ? x.sw.tier : t, 'standard');
    const priceTier = top;
    const [name, setName] = useState('');
    const [car, setCar] = useState('');
    const [phone, setPhone] = useState('');
    const [notes, setNotes] = useState('');
    const [busy, setBusy] = useState(false);
    const submit = async () => {
      if (busy) return;
      if (!name.trim() || !car.trim() || phone.trim().length < 8) {
        onSent && onSent(false, 'Add your name, car and phone first');
        return;
      }
      setBusy(true);
      const wrapSelection = list.map(({ p, sw }) => ({
        panel: p.label, swatchId: sw.id, name: sw.name, code: sw.code || '',
        brand: sw.brand || '', finish: sw.finish || '', tier: sw.tier || 'standard',
      }));
      try {
        const res = await fetch('/api/wrap-quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, car, phone, notes, priceTier, wrapSelection }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok) onSent && onSent(true);
        else onSent && onSent(false, 'Something went wrong — try again');
      } catch {
        onSent && onSent(false, 'Network error — try again');
      } finally {
        setBusy(false);
      }
    };
    return h('div', { className: 'modal-veil', onClick: onClose },
      h('div', { className: 'modal modal--quote', onClick: (e) => e.stopPropagation() },
        h('div', { className: 'modal-head' },
          h('div', null, h('div', { className: 'm-eyebrow' }, 'Quote request'), h('h3', null, 'Get a quote for this wrap')),
          h('button', { className: 'pill-btn', onClick: onClose }, h(I.X, { size: 16 }))),
        h('div', { className: 'q-body' },
          h('div', { className: 'q-summary' },
            h('div', { className: 'q-sum-head' },
              h('span', { className: 'qs-l' }, 'Your selection')),
            list.length ? list.map(({ p, sw }) => h('div', { className: 'q-line', key: p.key },
              h('span', { className: 'ql-dot', style: { background: window.swChipBg(sw) } }),
              h('span', { className: 'ql-panel' }, p.label),
              h('span', { className: 'ql-name' }, sw.name),
              h('span', { className: 'ql-code' }, sw.code))) : h('div', { className: 'q-line' }, 'No colour selected yet.'),
            h('div', { className: 'q-note' }, "We'll confirm availability and come back with a fixed price, usually same day.")),
          h('div', { className: 'q-form' },
            h('label', null, 'Name', h('input', { value: name, onChange: (e) => setName(e.target.value), placeholder: 'First & last' })),
            h('label', null, 'Car', h('input', { value: car, onChange: (e) => setCar(e.target.value), placeholder: 'e.g. 2024 BMW M3 Competition' })),
            h('label', null, 'WhatsApp / phone', h('input', { value: phone, onChange: (e) => setPhone(e.target.value), placeholder: '+27 …' })),
            h('label', null, 'Anything we should know', h('textarea', { rows: 2, value: notes, onChange: (e) => setNotes(e.target.value), placeholder: 'Timeline, partial vs full, plans for PPF…' })),
            h('button', { className: 'btn btn--primary', style: { width: '100%', height: 48, marginTop: 4 }, onClick: submit, disabled: busy },
              h(I.Send, { size: 15 }), busy ? 'Sending…' : 'Send to Matthews & Clark'),
            h('div', { className: 'q-fine' }, carUrl ? 'Your photo + render are attached automatically.' : 'Add your car photo for a render with the request.')))));
  }

  ReactDOM.createRoot(document.getElementById('root')).render(h(App));
})();
