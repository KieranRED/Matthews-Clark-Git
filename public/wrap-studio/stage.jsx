/* Wrap Studio — Stage: studio bay, recolour engine, lighting, before/after, HUD */
(function () {
  const { useState, useRef, useEffect, useCallback } = React;
  const h = React.createElement;
  const I = window.Icon;

  // ─── Colour utilities ──────────────────────────────────────────────────────

  function hexToRGB(hex) {
    const n = hex.replace('#', '');
    return { r: parseInt(n.slice(0,2),16), g: parseInt(n.slice(2,4),16), b: parseInt(n.slice(4,6),16) };
  }

  function rgbToHSL(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r,g,b), min = Math.min(r,g,b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      else if (max === g) h = ((b - r) / d + 2) / 6;
      else h = ((r - g) / d + 4) / 6;
    }
    return { h: h * 360, s, l };
  }

  function hslToRGB(h, s, l) {
    h /= 360;
    if (s === 0) { const v = Math.round(l * 255); return { r: v, g: v, b: v }; }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const hue2rgb = (t) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    return { r: Math.round(hue2rgb(h+1/3)*255), g: Math.round(hue2rgb(h)*255), b: Math.round(hue2rgb(h-1/3)*255) };
  }

  // ─── Paint pixel detection (works on ALL car colours: black, white, silver, bright) ───

  function analyseCar(data, w, h) {
    // Pass 1: collect visible pixels, detect if car is chromatic or achromatic
    let totalL = 0, totalS = 0, count = 0;
    const hueBuckets = new Array(36).fill(0);
    for (let y = Math.floor(h*0.12); y < h*0.88; y += 4) {
      for (let x = Math.floor(w*0.08); x < w*0.92; x += 4) {
        const i = (y * w + x) * 4;
        if (data[i+3] < 60) continue;
        const px = rgbToHSL(data[i], data[i+1], data[i+2]);
        if (px.l < 0.03 || px.l > 0.97) continue; // exclude pure black/white extremes
        totalL += px.l; totalS += px.s; count++;
        if (px.s > 0.06) hueBuckets[Math.floor(px.h / 10) % 36]++;
      }
    }
    if (!count) return { achromatic: true, avgL: 0.5, domH: -1 };

    const avgL = totalL / count;
    const avgS = totalS / count;

    // Find dominant hue (if car is chromatic)
    let maxB = 0, maxC = 0;
    for (let i = 0; i < 36; i++) { if (hueBuckets[i] > maxC) { maxC = hueBuckets[i]; maxB = i; } }
    const achromatic = avgS < 0.08 || maxC < count * 0.08;

    return { achromatic, avgL, domH: achromatic ? -1 : maxB * 10 + 5 };
  }

  function isPaintPixel(px, carInfo) {
    const { h, s, l } = px;
    // Universal exclusions — these are never paint
    if (l < 0.04) return false;   // absolute black (tyres, deep shadow)
    if (l > 0.97) return false;   // pure specular highlight

    if (carInfo.achromatic) {
      // White, silver, grey, black cars — detect by luminance proximity to car average
      // Glass is usually darker with slight blue tint, chrome is near-white with no variation
      const lDiff = Math.abs(l - carInfo.avgL);
      if (lDiff > 0.40) return false;   // very different luminance = different material
      if (s > 0.28) return false;       // suspiciously saturated for an achromatic car = interior/reflection
      if (s < 0.04 && l > 0.80) return false; // near-white low-sat = chrome trim / glass highlight
      return true;
    } else {
      // Chromatic car (red, blue, green etc.) — detect by hue proximity
      if (s < 0.04) return false;       // achromatic pixel on a coloured car = chrome/glass/rubber
      const diff = Math.min(Math.abs(h - carInfo.domH), 360 - Math.abs(h - carInfo.domH));
      return diff < 40 || s > 0.18;    // hue-close to paint, or highly saturated
    }
  }

  // ─── Canvas recolour engine ────────────────────────────────────────────────
  // Replaces CSS blend modes. Only paints paint pixels, leaves glass/trim alone.

  function recolourCanvas(carUrl, targetHex, finish) {
    return new Promise((resolve) => {
      if (!carUrl || !targetHex) return resolve(null);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const cw = img.naturalWidth, ch = img.naturalHeight;
        const cv = document.createElement('canvas');
        cv.width = cw; cv.height = ch;
        const ctx = cv.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const id = ctx.getImageData(0, 0, cw, ch);
        const d = id.data;

        // PPF clear / PPF matte — just a very subtle tint, don't recolour
        if (finish === 'ppf-clear' || finish === 'ppf-matte') {
          const { r: tr, g: tg, b: tb } = hexToRGB(targetHex);
          const strength = finish === 'ppf-matte' ? 0.12 : 0.06;
          for (let i = 0; i < d.length; i += 4) {
            if (d[i+3] < 20) continue;
            d[i]   = Math.round(d[i]   * (1-strength) + tr * strength);
            d[i+1] = Math.round(d[i+1] * (1-strength) + tg * strength);
            d[i+2] = Math.round(d[i+2] * (1-strength) + tb * strength);
          }
          ctx.putImageData(id, 0, 0); return resolve(cv.toDataURL('image/png'));
        }

        const carInfo = analyseCar(d, cw, ch);
        const { r: tr, g: tg, b: tb } = hexToRGB(targetHex);
        const tHSL = rgbToHSL(tr, tg, tb);

        // Finish-specific saturation modifier
        const satMult = finish === 'matte' ? 0.80 : finish === 'satin' ? 0.88 : 1.0;

        // Lighting-removal recolour:
        // Strip original lighting → apply target colour → add back 30% of body-line variation
        // GPT re-lights the scene properly. Finish overlays (CSS) add gloss/matte/metallic on top.
        //
        // BODY_LINE_RETAIN = 0.30 — keeps panel shapes, creases, shadow edges visible
        const BODY_LINE_RETAIN = 0.30;

        // Build a paint mask first (flag each pixel), then use neighbor check to kill speckles
        const paintMask = new Uint8Array(d.length / 4);
        for (let i = 0; i < d.length; i += 4) {
          if (d[i+3] < 20) continue;
          if (isPaintPixel(rgbToHSL(d[i], d[i+1], d[i+2]), carInfo)) paintMask[i/4] = 1;
        }

        // Anti-speckle: require at least 3 of 8 neighbours to also be paint
        const paintFinal = new Uint8Array(paintMask.length);
        for (let y = 1; y < ch-1; y++) {
          for (let x = 1; x < cw-1; x++) {
            const idx = y * cw + x;
            if (!paintMask[idx]) continue;
            let neighbours = 0;
            for (let dy = -1; dy <= 1; dy++)
              for (let dx = -1; dx <= 1; dx++)
                if (dy !== 0 || dx !== 0) neighbours += paintMask[(y+dy)*cw+(x+dx)] || 0;
            if (neighbours >= 3) paintFinal[idx] = 1;
          }
        }

        // Apply colour to confirmed paint pixels
        for (let i = 0; i < d.length; i += 4) {
          if (!paintFinal[i/4]) continue;
          const px = rgbToHSL(d[i], d[i+1], d[i+2]);
          const deviation = px.l - carInfo.avgL;
          let outL = tHSL.l + deviation * BODY_LINE_RETAIN;
          outL = Math.max(0.02, Math.min(0.97, outL));
          const { r, g, b } = hslToRGB(tHSL.h, tHSL.s * satMult, outL);
          d[i] = r; d[i+1] = g; d[i+2] = b;
        }

        ctx.putImageData(id, 0, 0);
        resolve(cv.toDataURL('image/png'));
      };
      img.onerror = () => resolve(null);
      img.src = carUrl;
    });
  }

  // ─── Finish overlays ──────────────────────────────────────────────────────
  // Applied ON TOP of the canvas-recoloured car.
  // These affect reflectivity / sheen / texture only — never change the hue.
  // Chrome and colour-shift are full CSS replacements (not canvas recolourable).

  const SHEEN = 'linear-gradient(118deg, rgba(255,255,255,.55) 0%, transparent 28%, transparent 68%, rgba(255,255,255,.22) 100%)';
  const SOFT_SHEEN = 'linear-gradient(118deg, rgba(255,255,255,.28) 0%, transparent 35%)';

  function fxFor(sw) {
    if (!sw) return null;
    const c = sw.hex, c2 = sw.hex2 || sw.hex;
    switch (sw.finish) {
      case 'chrome':
        return { tint: { background: `linear-gradient(115deg,#fff 0%,${c} 22%,${c2} 48%,#fbfdff 64%,${c} 88%)`,
                 mixBlendMode: 'hard-light', opacity: .92 }, anim: 'anim-chrome', sheen: { opacity: .5 }, tone: { opacity: .08 } };
      case 'shift':
        return { tint: { background: `linear-gradient(115deg,${c} 0%,${c2} 38%,${c} 70%,${c2} 100%)`,
                 mixBlendMode: 'hue', opacity: .94 }, anim: 'anim-shift', sheen: { opacity: .22 }, tone: { opacity: .1 } };
      // Finish overlays — overlay blend adds/removes lightness without touching hue
      case 'gloss':
        return { tint: { background: SHEEN, mixBlendMode: 'overlay', opacity: .65 },
                 sheen: { opacity: .30 }, tone: { opacity: 0 } };
      case 'satin':
        return { tint: { background: SOFT_SHEEN, mixBlendMode: 'soft-light', opacity: .55 },
                 sheen: { opacity: .14 }, tone: { opacity: 0 } };
      case 'matte':
        return { tint: { background: 'rgba(0,0,0,0.05)', mixBlendMode: 'multiply', opacity: 1 },
                 sheen: { opacity: 0 }, tone: { opacity: .06 } };
      case 'metallic':
        return { tint: { background: SOFT_SHEEN, mixBlendMode: 'overlay', opacity: .45 },
                 sheen: { opacity: .18 }, tone: { opacity: 0 }, noise: true };
      case 'carbon':
        return { tint: { background: 'rgba(0,0,0,0.10)', mixBlendMode: 'multiply', opacity: 1 },
                 sheen: { opacity: 0 }, tone: { opacity: .10 } };
      case 'ppf-clear':
        return { tint: { background: SHEEN, mixBlendMode: 'overlay', opacity: .20 },
                 sheen: { opacity: .38 }, tone: { opacity: 0 } };
      case 'ppf-matte':
        return { tint: { background: 'rgba(0,0,0,0.04)', mixBlendMode: 'multiply', opacity: 1 },
                 sheen: { opacity: 0 }, tone: { opacity: .08 } };
      default:
        return { tint: { background: SHEEN, mixBlendMode: 'overlay', opacity: .50 },
                 sheen: { opacity: .20 }, tone: { opacity: 0 } };
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
    const [recolouredUrl, setRecolouredUrl] = useState(null);
    const recolourAbort = useRef(null);

    // ── Canvas recolour: runs whenever the car or swatch changes ──────────────
    useEffect(() => {
      if (!carUrl || !swatch) { setRecolouredUrl(null); return; }
      // Chrome + shift are full CSS replacements — canvas not needed
      if (swatch.finish === 'chrome' || swatch.finish === 'shift') { setRecolouredUrl(null); return; }

      // Cancel any in-flight recolour
      if (recolourAbort.current) recolourAbort.current = false;
      const token = { alive: true };
      recolourAbort.current = token;

      recolourCanvas(carUrl, swatch.hex, swatch.finish).then((url) => {
        if (token.alive) setRecolouredUrl(url);
      });
      return () => { token.alive = false; };
    }, [carUrl, swatch ? swatch.id : null]);

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
    const fx = swatch ? fxFor(swatch) : null;
    // Always mask to the original cutout (carUrl) — even when showing recolouredUrl
    const maskStyle = carUrl ? { WebkitMaskImage: `url(${carUrl})`, maskImage: `url(${carUrl})` } : null;

    // Finish overlay layers — used for ALL finishes on top of the canvas-recoloured car
    const fxLayers = (carUrl && fx) ? [
      h('div', { key: 'tone', className: 'car-fx car-tone', style: { ...maskStyle, opacity: fx.tone.opacity, background: '#000' } }),
      h('div', { key: 'tint', className: 'car-fx car-tint ' + (fx.anim || ''), style: { ...maskStyle, ...fx.tint } }),
      h('div', { key: 'sheen', className: 'car-fx car-sheen', style: { ...maskStyle, opacity: fx.sheen.opacity,
        background: 'linear-gradient(118deg, rgba(255,255,255,.9) 0%, transparent 26%, transparent 72%, rgba(255,255,255,.4) 100%)' } }),
    ] : null;

    // The displayed car: recolouredUrl (canvas engine) or carUrl (base/chrome/shift)
    const displayUrl = recolouredUrl || carUrl;

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
                  h('img', { className: 'car-base', src: displayUrl, alt: 'Your car', draggable: 'false' }),
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
