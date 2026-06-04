/* Wrap Studio — App: layout, state, persistence, compare + quote, tweaks */
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

  // ===========================================================================
  //  DEMO ONLY — REMOVE BEFORE PRODUCTION
  //  ---------------------------------------------------------------------------
  //  This stock Toyota GR86 photo (with its own waterfront background) is bundled
  //  purely so the studio shows a real car on first load. It is NOT a Matthews &
  //  Clark asset and must not ship. To remove for production:
  //    1. delete wrap-studio/_DEMO-car-REMOVE-BEFORE-PROD.png
  //    2. set DEMO_CAR_SRC = null below
  //  With DEMO_CAR_SRC = null the tool falls back to the "Drop your car photo"
  //  empty state and the proper background-removed-PNG masking pipeline.
  //  (Because this demo photo keeps its background, it is recoloured with hue/
  //   colour blend modes over the whole frame — see demoFx() in stage.jsx —
  //   rather than the production silhouette mask.)
  // ===========================================================================
  const DEMO_CAR_SRC = null;

  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "placement": "right",
    "accent": "#1F4FFF",
    "defaultFinish": "all",
    "panelMode": true,
    "renderSeconds": 14
  }/*EDITMODE-END*/;

  function App() {
    const [t, setTweak] = window.useTweaks(TWEAK_DEFAULTS);

    const [carUrl, setCarUrl] = useState(saved.carUrl != null ? saved.carUrl : DEMO_CAR_SRC);
    // Bundled demo photo carries its own background, so it composites best in the
    // "My background" scene rather than the studio bay. A real (uploaded) car uses
    // the studio pipeline. isDemo also flips the recolour engine to full-frame mode.
    const isDemo = DEMO_CAR_SRC !== null && carUrl === DEMO_CAR_SRC;
    const [selectedId, setSelectedId] = useState(saved.selectedId || null);
    const [panelColors, setPanelColors] = useState(saved.panelColors || {});
    const [activePanel, setActivePanel] = useState(saved.activePanel || 'full');
    const [query, setQuery] = useState('');
    const [brandTab, setBrandTab] = useState('All');
    const [finish, setFinish] = useState(t.defaultFinish || 'all');
    const [favOnly, setFavOnly] = useState(false);
    const [favs, setFavs] = useState(saved.favs || {});
    const [pins, setPins] = useState(saved.pins || []);
    const [bg, setBg] = useState(saved.bg || 'studio');
    const [light, setLight] = useState(saved.light || 'studio');
    const [mode, setMode] = useState('fast');
    const [baActive, setBaActive] = useState(false);
    const [rendering, setRendering] = useState(false);
    const [renderPct, setRenderPct] = useState(0);
    const [compareOpen, setCompareOpen] = useState(false);
    const [quoteOpen, setQuoteOpen] = useState(false);
    const [toast, setToast] = useState(null);
    const toastT = useRef(null);

    const all = window.WRAP_CATALOGUE;
    const sel = selectedId ? all.find((s) => s.id === selectedId) : null;

    // apply accent tweak to CSS
    useEffect(() => {
      document.documentElement.style.setProperty('--accent', t.accent);
    }, [t.accent]);
    useEffect(() => { setFinish(t.defaultFinish || 'all'); }, [t.defaultFinish]);

    // persist
    useEffect(() => {
      const data = { carUrl, selectedId, panelColors, activePanel, favs, pins, bg, light };
      try { localStorage.setItem(LS, JSON.stringify(data)); } catch {}
    }, [carUrl, selectedId, panelColors, activePanel, favs, pins, bg, light]);

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

    const startRender = useCallback(() => {
      setRendering(true); setRenderPct(0);
      const dur = Math.max(4, t.renderSeconds || 14) * 1000;
      const t0 = performance.now();
      const tick = (now) => {
        const p = Math.min(100, ((now - t0) / dur) * 100);
        setRenderPct(p);
        if (p < 100) requestAnimationFrame(tick);
        else setTimeout(() => { setRendering(false); flash('Studio render ready'); }, 250);
      };
      requestAnimationFrame(tick);
    }, [t.renderSeconds, flash]);

    const finishLabel = sel ? ((window.FINISHES.find((f) => f.key === sel.finish) || {}).label || '') : '';
    const brandShort = sel ? (sel.brand === 'Avery Dennison' ? 'AVERY' : sel.brand.toUpperCase()) : '';

    const wsClass = 'workspace workspace--' + (t.placement || 'right');

    return h('div', { className: 'app' },
      // ── top bar (website floating-nav language) ──
      h('header', { className: 'topbar' },
        h('div', { className: 'tb-brand' },
          h('div', { className: 'tb-wm' }, 'MATTHEWS', h('span', { className: 'sl' }, '/'), 'CLARK'),
          h('div', { className: 'tb-tool' }, 'Wrap Visualisation Studio')),
        h('div', { className: 'tb-spacer' }),
        h('div', { className: 'tb-spacer' }),
        h('div', { className: 'tb-actions' },
          h('button', { className: 'btn btn--ghost btn--sm', onClick: () => {
            try { localStorage.removeItem(LS); } catch {}
            setCarUrl(null); setSelectedId(null); setPanelColors({}); setActivePanel('full');
            setFavs({}); setPins([]); setBg('studio'); setLight('studio');
            flash('Session reset');
          }}, h(I.Refresh, { size: 14 }), 'Reset'),
          h('button', { className: 'btn btn--ghost btn--sm', onClick: () => flash('Shareable link copied') },
            h(I.Share, { size: 14 }), 'Share'),
          h('button', { className: 'btn btn--ghost btn--sm', onClick: () => { if (carUrl) flash('Render downloaded (watermarked)'); else flash('Add your car photo first'); } },
            h(I.Download, { size: 14 }), 'Download'),
          h('button', { className: 'btn btn--primary btn--sm', onClick: () => setQuoteOpen(true) },
            'Send to M&C', h('span', { className: 'arr' }, h(I.Send, { size: 13 }))))),

      // ── workspace ──
      h('div', { className: wsClass },
        h(window.WrapStage, {
          swatch: sel, carUrl, setCarUrl, bg, setBg, light, setLight, mode, setMode,
          rendering, renderPct, startRender, baActive, setBaActive,
          panels: PANELS, panelColors, activePanel, setActivePanel,
          showLabels: t.panelMode, finishLabel, brandShort, demo: isDemo,
        }),
        h(window.CataloguePanel, {
          query, setQuery, brandTab, setBrandTab, finish, setFinish, favOnly, setFavOnly,
          selectedId, onSelect, favs, toggleFav, pins, togglePin,
          openCompare: () => setCompareOpen(true), panelColors, activePanel, panels: PANELS,
          onQuote: () => setQuoteOpen(true), placement: t.placement,
        })),

      compareOpen ? h(CompareModal, { pins, carUrl, light, onClose: () => setCompareOpen(false), onPick: (sw) => { onSelect(sw); setCompareOpen(false); } }) : null,
      quoteOpen ? h(QuoteModal, { sel, panelColors, panels: PANELS, carUrl, onClose: () => setQuoteOpen(false), onSent: () => { setQuoteOpen(false); flash('Sent to Matthews & Clark — we\'ll come back fast'); } }) : null,

      // toast
      h('div', { className: 'toast' + (toast ? ' show' : '') }, toast ? h(I.Check, { size: 16 }) : null, toast || ''),

      // ── tweaks ──
      h(window.TweaksPanel, null,
        h(window.TweakSection, { label: 'Layout' }),
        h(window.TweakRadio, { label: 'Catalogue', value: t.placement, options: ['right', 'left', 'bottom'],
          onChange: (v) => setTweak('placement', v) }),
        h(window.TweakToggle, { label: 'Multi-colour panels', value: t.panelMode, onChange: (v) => setTweak('panelMode', v) }),
        h(window.TweakSection, { label: 'Catalogue' }),
        h(window.TweakSelect, { label: 'Default finish', value: t.defaultFinish,
          options: ['all'].concat(window.FINISHES.map((f) => f.key)), onChange: (v) => setTweak('defaultFinish', v) }),
        h(window.TweakSection, { label: 'Brand & render' }),
        h(window.TweakColor, { label: 'Accent', value: t.accent,
          options: ['#1F4FFF', '#4A78FF', '#E7E9EC', '#2F9E5B'], onChange: (v) => setTweak('accent', v) }),
        h(window.TweakSlider, { label: 'Studio render time', value: t.renderSeconds, min: 4, max: 25, unit: 's',
          onChange: (v) => setTweak('renderSeconds', v) })));
  }

  // ── 2×2 comparison ──
  function CompareModal({ pins, carUrl, light, onClose, onPick }) {
    const all = window.WRAP_CATALOGUE;
    const items = pins.filter(Boolean).map((id) => all.find((s) => s.id === id)).filter(Boolean);
    return h('div', { className: 'modal-veil', onClick: onClose },
      h('div', { className: 'modal modal--cmp', onClick: (e) => e.stopPropagation() },
        h('div', { className: 'modal-head' },
          h('div', null, h('div', { className: 'm-eyebrow' }, 'Comparison'), h('h3', null, 'Your car in ' + items.length + ' finishes')),
          h('button', { className: 'pill-btn', onClick: onClose }, h(I.X, { size: 16 }))),
        h('div', { className: 'cmp-grid' },
          items.map((sw) => h(CompareCell, { key: sw.id, sw, carUrl, light, onPick })))));
  }
  function CompareCell({ sw, carUrl, light, onPick }) {
    const fx = window.fxFor(sw);
    const mask = carUrl ? { WebkitMaskImage: `url(${carUrl})`, maskImage: `url(${carUrl})` } : null;
    return h('button', { className: 'cmp-cell', 'data-light': light, onClick: () => onPick(sw),
      style: { '--wrap-color': sw.hex } },
      h('div', { className: 'cmp-stage' },
        h('div', { className: 'bay-floor' }),
        h('div', { className: 'car-box', 'data-colored': '1', style: { position: 'relative', width: '88%', aspectRatio: '16/10', margin: 'auto' } },
          carUrl
            ? h(React.Fragment, null,
                h('img', { className: 'car-base', src: carUrl, alt: '' }),
                h('div', { className: 'car-fx car-tone', style: { ...mask, opacity: fx.tone.opacity, background: '#000' } }),
                h('div', { className: 'car-fx car-tint ' + (fx.anim || ''), style: { ...mask, ...fx.tint } }),
                h('div', { className: 'car-fx car-sheen', style: { ...mask, opacity: fx.sheen.opacity, background: 'linear-gradient(118deg,rgba(255,255,255,.9),transparent 26%,transparent 72%,rgba(255,255,255,.4))' } }))
            : h('div', { className: 'car-ph' },
                h('div', { className: 'ph-color ' + (fx.anim || ''), style: { background: fx.tint.background, opacity: .9 } })))),
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
    const tier = window.TIER_LABEL[top];
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
            h('div', { className: 'q-note' }, "We'll confirm availability and come back with a fixed price — usually same day.")),
          h('div', { className: 'q-form' },
            h('label', null, 'Name', h('input', { defaultValue: '', placeholder: 'First & last' })),
            h('label', null, 'Car', h('input', { defaultValue: '', placeholder: 'e.g. 2024 BMW M3 Competition' })),
            h('label', null, 'WhatsApp / phone', h('input', { defaultValue: '', placeholder: '+27 …' })),
            h('label', null, 'Anything we should know', h('textarea', { rows: 2, placeholder: 'Timeline, partial vs full, plans for PPF…' })),
            h('button', { className: 'btn btn--primary', style: { width: '100%', height: 48, marginTop: 4 }, onClick: onSent },
              h(I.Send, { size: 15 }), 'Send to Matthews & Clark'),
            h('div', { className: 'q-fine' }, carUrl ? 'Your photo + render are attached automatically.' : 'Add your car photo for a render with the request.')))));
  }

  ReactDOM.createRoot(document.getElementById('root')).render(h(App));
})();
