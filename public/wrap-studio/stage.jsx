/* Wrap Studio — Stage: studio bay, recolour engine, lighting, before/after, HUD */
(function () {
  const { useState, useRef, useEffect, useCallback } = React;
  const h = React.createElement;
  const I = window.Icon;

  // map a swatch -> background / blend treatment for the recolour layers
  function fxFor(sw) {
    if (!sw) return null;
    const c = sw.hex, c2 = sw.hex2 || sw.hex;
    switch (sw.finish) {
      case 'gloss':
        return { tint: { background: c, mixBlendMode: 'color', opacity: .98 },
                 sheen: { opacity: .34 }, tone: { opacity: .12 } };
      case 'satin':
        return { tint: { background: c, mixBlendMode: 'color', opacity: .96 },
                 sheen: { opacity: .16 }, tone: { opacity: .16 } };
      case 'matte':
        return { tint: { background: c, mixBlendMode: 'color', opacity: 1 },
                 sheen: { opacity: 0 }, tone: { opacity: .4 } };
      case 'chrome':
        return { tint: { background: `linear-gradient(115deg,#fff 0%,${c} 22%,${c2} 48%,#fbfdff 64%,${c} 88%)`,
                         mixBlendMode: 'hard-light', opacity: .95 }, anim: 'anim-chrome',
                 sheen: { opacity: .5 }, tone: { opacity: .1 } };
      case 'shift':
        return { tint: { background: `linear-gradient(115deg,${c} 0%,${c2} 38%,${c} 70%,${c2} 100%)`,
                         mixBlendMode: 'color', opacity: .96 }, anim: 'anim-shift',
                 sheen: { opacity: .26 }, tone: { opacity: .14 } };
      case 'ppf-clear':
        return { tint: { background: c, mixBlendMode: 'color', opacity: .12 },
                 sheen: { opacity: .42 }, tone: { opacity: 0 } };
      case 'ppf-matte':
        return { tint: { background: c, mixBlendMode: 'color', opacity: .18 },
                 sheen: { opacity: 0 }, tone: { opacity: .34 } };
      case 'metallic':
        return { tint: { background: c, mixBlendMode: 'color', opacity: .95 },
                 sheen: { opacity: .22 }, tone: { opacity: .18 }, noise: true };
      case 'carbon':
        return { tint: { background: c, mixBlendMode: 'color', opacity: 1 },
                 sheen: { opacity: 0 }, tone: { opacity: .5 } };
      default:
        return { tint: { background: c, mixBlendMode: 'color', opacity: .96 }, sheen: { opacity: .2 }, tone: { opacity: .14 } };
    }
  }

  function Stage(props) {
    const { swatch, carUrl, setCarUrl, originalUrl, setOriginalUrl, bg, light, mode, setMode, rendering, renderPct,
            startRender, baActive, setBaActive, panels, panelColors, activePanel, setActivePanel,
            showLabels, finishLabel, brandShort, demo } = props;
    const stageRef = useRef(null);
    const fileRef = useRef(null);
    const [baPos, setBaPos] = useState(58);
    const dragRef = useRef(false);
    const [removing, setRemoving] = useState(false);
    const [removeError, setRemoveError] = useState(null);

    const fx = fxFor(swatch);
    const colored = !!swatch;

    // ── file ingest — calls bg removal API, stores both originalUrl + carUrl ──
    const ingest = useCallback(async (file) => {
      if (!file || !/^image\//.test(file.type)) return;
      setRemoving(true);
      setRemoveError(null);
      try {
        // Store original as dataURL (for before/after slider)
        const origDataUrl = await new Promise((res, rej) => {
          const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej;
          r.readAsDataURL(file);
        });
        if (setOriginalUrl) setOriginalUrl(origDataUrl);

        // Send to server-side bg removal API
        const fd = new FormData();
        fd.append('image', file, file.name || 'photo.jpg');
        const resp = await fetch('/api/wrap-remove-bg', { method: 'POST', body: fd });
        if (!resp.ok) throw new Error(`Server error ${resp.status}`);
        const resultBlob = await resp.blob();

        // Convert result blob to dataURL for masking + storage
        const cutoutDataUrl = await new Promise((res, rej) => {
          const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej;
          r.readAsDataURL(resultBlob);
        });
        setCarUrl(cutoutDataUrl);
      } catch (err) {
        console.error('[Stage] bg removal failed:', err);
        setRemoveError(err.message || 'Background removal failed');
      } finally {
        setRemoving(false);
      }
    }, [setCarUrl, setOriginalUrl]);

    // drag/drop
    useEffect(() => {
      const el = stageRef.current; if (!el) return;
      let depth = 0;
      const over = (e) => { e.preventDefault(); depth++; el.classList.add('dragging'); };
      const leave = (e) => { e.preventDefault(); if (--depth <= 0) { depth = 0; el.classList.remove('dragging'); } };
      const drop = (e) => { e.preventDefault(); depth = 0; el.classList.remove('dragging');
        const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (f) ingest(f); };
      el.addEventListener('dragenter', over); el.addEventListener('dragover', (e) => e.preventDefault());
      el.addEventListener('dragleave', leave); el.addEventListener('drop', drop);
      return () => { el.removeEventListener('dragenter', over); el.removeEventListener('dragleave', leave); el.removeEventListener('drop', drop); };
    }, [ingest]);

    // before/after drag
    const justDraggedRef = useRef(false);
    useEffect(() => {
      if (!baActive) return;
      const move = (e) => {
        if (!dragRef.current) return;
        justDraggedRef.current = true;
        const el = stageRef.current; if (!el) return;
        const r = el.getBoundingClientRect();
        const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
        setBaPos(Math.max(4, Math.min(96, (x / r.width) * 100)));
      };
      const up = () => { dragRef.current = false; };
      window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
      window.addEventListener('touchmove', move, { passive: true }); window.addEventListener('touchend', up);
      return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up);
        window.removeEventListener('touchmove', move); window.removeEventListener('touchend', up); };
    }, [baActive]);

    // Clips applied at car-wrap level (same coordinate space as stage → baPos% is exact)
    // DO NOT apply clip to individual images/layers — that causes lag due to padding offsets
    const wrapClip  = baActive ? { clipPath: `inset(0 ${100 - baPos}% 0 0)`, WebkitClipPath: `inset(0 ${100 - baPos}% 0 0)` } : {};
    const origClip  = baActive ? { clipPath: `inset(0 0 0 ${baPos}%)`,        WebkitClipPath: `inset(0 0 0 ${baPos}%)` }        : {};
    // Legacy clip variable kept for ph-color placeholder (no-upload state)
    const clip = wrapClip;
    const maskStyle = carUrl ? { WebkitMaskImage: `url(${carUrl})`, maskImage: `url(${carUrl})` } : null;

    // recolour layers — NO clip here, the parent car-wrap handles clipping
    const fxLayers = (carUrl && fx) ? [
      h('div', { key: 'tone', className: 'car-fx car-tone', style: { ...maskStyle, opacity: fx.tone.opacity, background: '#000' } }),
      h('div', { key: 'tint', className: 'car-fx car-tint ' + (fx.anim || ''), style: { ...maskStyle, ...fx.tint } }),
      h('div', { key: 'sheen', className: 'car-fx car-sheen', style: { ...maskStyle, opacity: fx.sheen.opacity,
        background: 'linear-gradient(118deg, rgba(255,255,255,.9) 0%, transparent 26%, transparent 72%, rgba(255,255,255,.4) 100%)' } }),
    ] : null;

    const wrapColorVar = swatch ? swatch.hex : '#3a3d42';

    // DEMO-ONLY full-frame recolour layers (see demoFx note above)
    const dfx = demo ? demoFx(swatch) : null;
    const demoScene = demo ? h('div', { className: 'demo-scene' },
      h('img', { className: 'demo-bg', src: carUrl, alt: 'Demo car' }),
      swatch ? dfx.layers.map((L, i) => h('div', { key: i, className: 'demo-fx ' + (L.anim || ''),
        style: { ...clip, background: L.bg, mixBlendMode: L.blend, opacity: L.op } })) : null,
      swatch && dfx.sheen ? h('div', { className: 'demo-fx', style: { ...clip, opacity: dfx.sheen, mixBlendMode: 'soft-light',
        background: 'linear-gradient(118deg, rgba(255,255,255,.95) 0%, transparent 30%, transparent 70%, rgba(255,255,255,.5) 100%)' } }) : null) : null;

    return h('div', { className: 'stage-col' },
      h('div', { className: 'stage', ref: stageRef, 'data-bg': bg, 'data-light': light,
        'data-screen-label': 'Wrap Studio — Stage',
        style: { '--wrap-color': wrapColorVar, userSelect: baActive ? 'none' : '', WebkitUserSelect: baActive ? 'none' : '' },
        onClick: (e) => { if (justDraggedRef.current) { justDraggedRef.current = false; e.stopPropagation(); } } },
        demo ? null : h('div', { className: 'bay-ceiling' }),
        demo ? null : h('div', { className: 'bay-sign' }, 'M', h('span', { className: 'sl' }, '/'), 'C STUDIO'),
        demo ? null : h('div', { className: 'bay-floor' }),

        // car staging — WRAPPED side (left of slider), clipped at car-wrap level
        demo ? demoScene : h('div', { className: 'car-wrap', style: baActive ? wrapClip : {} },
          h('div', { className: 'car-box', 'data-colored': colored ? '1' : '0' },
            carUrl
              ? h(React.Fragment, null,
                  h('img', { className: 'car-base', src: carUrl, alt: 'Your car', draggable: 'false' }),
                  fxLayers)
              : h('div', { className: 'car-ph' },
                  h('div', { className: 'ph-color ' + (fx && fx.anim ? fx.anim : ''),
                    style: { ...clip, background: fx ? fx.tint.background : '#3a3d42',
                      opacity: colored ? (fx.tint.opacity > .5 ? .9 : fx.tint.opacity + .2) : 0 } }),
                  h('div', { className: 'ph-upload' },
                    h('button', {
                      className: 'ph-upload-btn',
                      onClick: (e) => { e.stopPropagation(); fileRef.current.click(); }
                    }, h(I.Upload, { size: 16 }), 'Upload your car photo'),
                    h('span', { className: 'ph-upload-hint' }, 'or drag & drop  ·  JPG  ·  PNG  ·  HEIC'),
                    h('span', { className: 'ph-upload-tip' }, 'Best: ¾ front or side-on, in good light'))),
          )
        ),
        // BEFORE side (right of slider) — same cutout, no colour overlay
        baActive && carUrl ? h('div', { className: 'car-wrap', style: origClip, 'data-layer': 'before' },
          h('div', { className: 'car-box' },
            h('img', { className: 'car-base', src: carUrl, alt: 'Before', draggable: 'false' })
          )
        ) : null,
        h('div', { className: 'light-overlay' }),

        // before/after
        baActive && colored ? h(React.Fragment, null,
          h('div', { className: 'ba-tag after' }, 'Wrapped'),
          h('div', { className: 'ba-tag before' }, 'No wrap'),
          h('div', { className: 'ba-divider', style: { left: baPos + '%' },
            onMouseDown: (e) => { e.stopPropagation(); dragRef.current = true; },
            onTouchStart: (e) => { e.stopPropagation(); dragRef.current = true; } },
            h('div', { className: 'knob' }, h(I.Split, { size: 20 })))
        ) : null,

        // bg removal progress overlay
        removing ? h('div', { className: 'render-veil on' },
          h('div', { className: 'render-card' },
            h('div', { className: 'rk' }, 'Background Removal'),
            h('h3', null, 'Removing background…'),
            h('p', null, 'This takes 5–15 seconds.'),
            h('div', { className: 'removal-bar' }, h('div', { className: 'removal-bar-sweep' })),
            removeError ? h('p', { style: { color: '#ff6b6b', marginTop: 8, fontSize: 12 } }, removeError) : null)) : null,

        // drop veil
        h('div', { className: 'drop-veil' }, h(I.Upload, { size: 22, style: { marginRight: 10 } }), 'Drop to place your car'),

        // render veil
        h('div', { className: 'render-veil' + (rendering ? ' on' : '') },
          h('div', { className: 'render-card' },
            h('div', { className: 'rk' }, 'Studio Render'),
            h('h3', null, 'Compositing your wrap'),
            h('p', null, 'Re-lighting the paint, reflections and material depth.'),
            h('div', { className: 'render-bar' }, h('i', { style: { width: renderPct + '%' } })),
            h('div', { className: 'render-pct' }, Math.round(renderPct) + '%  ·  ~12s'))),

        // ── HUD ──
        h('div', { className: 'stage-hud' },
          // top-left: coverage chips
          h('div', { className: 'hud-tl' },
            showLabels ? h('div', { className: 'panel-chips' },
              panels.map((p) => {
                const cid = panelColors[p.key];
                const cs = cid ? window.WRAP_CATALOGUE.find((s) => s.id === cid) : null;
                return h('button', { key: p.key, className: 'pchip' + (activePanel === p.key ? ' on' : ''),
                  onClick: () => setActivePanel(p.key) },
                  cs ? h('span', { className: 'sw', style: { background: cs.hex } }) : null, p.label);
              })) : null),

          // top-right: studio background + render mode
          h('div', { className: 'hud-tr' },
            h('div', { className: 'seg' },
              [['studio', 'Studio bay'], ['signage', 'Branded'], ['customer', 'My background']].map(([k, lbl]) =>
                h('button', { key: k, className: bg === k ? 'on' : '', onClick: () => props.setBg(k) }, lbl))),
            h('div', { className: 'seg' },
              h('button', { className: 'on', onClick: () => { setMode('render'); startRender(); } },
                h(I.Sparkle, { size: 13 }), 'Studio Render'))),

          // bottom-left: caption
          h('div', { className: 'hud-bl' },
            demo ? h('div', { className: 'demo-chip' }, 'Demo car', h('span', null, '— drop yours to replace')) : null,
            h('div', { className: 'cap' },
              swatch ? h(React.Fragment, null,
                h('b', null, brandShort), h('span', { className: 'sep' }, '/'),
                finishLabel, h('span', { className: 'sep' }, '/'),
                h('b', null, swatch.name)) : 'NO WRAP SELECTED',
              swatch ? h(React.Fragment, null, h('span', { className: 'sep' }, '/'), swatch.code || codeFor(swatch)) : null)),

          // bottom-center: lighting
          h('div', { className: 'hud-bc' },
            h('div', { className: 'seg light-seg' },
              [['studio', 'Studio'], ['sun', 'Sun'], ['overcast', 'Overcast'], ['night', 'Night']].map(([k, lbl]) =>
                h('button', { key: k, className: light === k ? 'on' : '', onClick: () => props.setLight(k) },
                  h('span', { className: 'ld ' + k }), lbl)))),

          // bottom-right: tools
          h('div', { className: 'hud-br' },
            carUrl ? h('button', { className: 'pill-btn', title: 'Replace car photo', onClick: () => fileRef.current.click() }, h(I.Refresh, { size: 16 })) : null,
            h('button', { className: 'pill-btn' + (baActive ? ' on' : ''), title: 'Before / after', onClick: () => setBaActive(!baActive) }, h(I.Compare, { size: 16 })),
            h('button', { className: 'pill-btn', title: 'Add your car photo', onClick: () => fileRef.current.click() }, h(I.Upload, { size: 16 })))
        ),

        h('input', { ref: fileRef, type: 'file', accept: 'image/*', style: { display: 'none' },
          onChange: (e) => { const f = e.target.files[0]; if (f) ingest(f); e.target.value = ''; } })
      )
    );
  }

  function codeFor(sw) {
    return (sw.brand.split(' ')[0].slice(0, 3) + '·' + (sw.id.split('-').pop() || '').slice(0, 6)).toUpperCase();
  }

  window.WrapStage = Stage;
  window.fxFor = fxFor;

  // hex -> HSL (for deciding chromatic vs achromatic recolour in demo mode)
  function hexHsl(hex) {
    hex = (hex || '').replace('#', '');
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
    const r = parseInt(hex.slice(0, 2), 16) / 255, g = parseInt(hex.slice(2, 4), 16) / 255, b = parseInt(hex.slice(4, 6), 16) / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    let hh = 0, s = 0; const l = (mx + mn) / 2;
    if (d) {
      s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
      if (mx === r) hh = (g - b) / d + (g < b ? 6 : 0);
      else if (mx === g) hh = (b - r) / d + 2; else hh = (r - g) / d + 4;
    }
    return { h: hh * 60, s, l };
  }

  // ===========================================================================
  //  demoFx — DEMO-ONLY recolour for the bundled full-background stock photo.
  //  The production engine (fxFor + silhouette mask above) needs a
  //  background-removed PNG. The demo photo keeps its scenery, so here we blend
  //  over the WHOLE frame: 'hue' recolours the saturated car while leaving the
  //  near-grey water/sky/asphalt untouched; achromatic targets use 'color' to
  //  desaturate the car. Safe to delete alongside DEMO_CAR_SRC.
  // ===========================================================================
  function demoFx(sw) {
    if (!sw) return null;
    const c = sw.hex, c2 = sw.hex2 || sw.hex;
    const achromatic = hexHsl(c).s < 0.18;
    switch (sw.finish) {
      case 'chrome':
        return { layers: [{ bg: `linear-gradient(115deg,#fff 0%,${c} 22%,${c2} 48%,#fbfdff 64%,${c} 88%)`, blend: 'hard-light', op: .8, anim: 'anim-chrome' }], sheen: .32 };
      case 'shift':
        return { layers: [{ bg: `linear-gradient(115deg,${c} 0%,${c2} 40%,${c} 72%,${c2} 100%)`, blend: 'hue', op: .92, anim: 'anim-shift' }], sheen: .2 };
      case 'ppf-clear':
        return { layers: [{ bg: c, blend: 'soft-light', op: .12 }], sheen: .42 };
      case 'ppf-matte':
        return { layers: [{ bg: '#000', blend: 'soft-light', op: .16 }], sheen: 0 };
      case 'matte':
        return achromatic
          ? { layers: [{ bg: c, blend: 'color', op: 1 }, { bg: c, blend: 'soft-light', op: .4 }], sheen: 0 }
          : { layers: [{ bg: c, blend: 'hue', op: .96 }, { bg: '#000', blend: 'soft-light', op: .16 }], sheen: 0 };
      case 'satin':
        return achromatic
          ? { layers: [{ bg: c, blend: 'color', op: .92 }, { bg: c, blend: 'soft-light', op: .42 }], sheen: .15 }
          : { layers: [{ bg: c, blend: 'hue', op: .95 }], sheen: .15 };
      default: // gloss
        return achromatic
          ? { layers: [{ bg: c, blend: 'color', op: .9 }, { bg: c, blend: 'soft-light', op: .45 }], sheen: .3 }
          : { layers: [{ bg: c, blend: 'hue', op: .95 }], sheen: .3 };
    }
  }
  window.codeFor = codeFor;
})();
