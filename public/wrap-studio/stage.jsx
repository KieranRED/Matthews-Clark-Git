/* Wrap Studio — Stage: the real M&C bay, recolour engine, before/after, HUD */
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

  // ─── Canvas recolour engine (quick preview) ─────────────────────────────────
  // Paint-ONLY recolour. This is an indicative preview (the studio render is the
  // accurate result), but it must only touch painted body panels — never glass,
  // lights, tyres, wheels, badges or trim — for ANY car colour, black included.
  //
  //   1. analyseBody — the body's dominant luminance + whether the car is
  //      chromatic (red/blue/…) or achromatic (black/white/grey).
  //   2. isPaint — multi-cue candidate test: hue-proximity for coloured cars;
  //      luminance-band + blue-glass + saturation rejection for achromatic cars.
  //   3. connected components — keep only large contiguous regions, which drops
  //      badges, number plate, mirror glass and trim slivers automatically.
  //   4. dilate the kept mask a couple of px to close panel gaps / door handles
  //      so the body recolours solid (no patchy holes).
  //   5. luminance-preserving recolour of the final mask.

  function analyseBody(d, cw, ch) {
    let sumS = 0, n = 0;
    const hue = new Array(36).fill(0);
    const lHist = new Array(20).fill(0);
    for (let y = Math.floor(ch * 0.10); y < ch * 0.90; y += 3) {
      for (let x = Math.floor(cw * 0.06); x < cw * 0.94; x += 3) {
        const i = (y * cw + x) * 4;
        if (d[i+3] < 80) continue;
        const p = rgbToHSL(d[i], d[i+1], d[i+2]);
        if (p.l < 0.04 || p.l > 0.98) continue;
        sumS += p.s; n++;
        if (p.s > 0.08) hue[Math.floor(p.h / 10) % 36]++;
        lHist[Math.min(19, Math.floor(p.l * 20))]++;
      }
    }
    if (!n) return { achromatic: true, bodyL: 0.5, domH: -1 };
    const avgS = sumS / n;
    let mb = 0, mc = 0; for (let i = 0; i < 20; i++) { if (lHist[i] > mc) { mc = lHist[i]; mb = i; } }
    let hb = 0, hc = 0; for (let i = 0; i < 36; i++) { if (hue[i] > hc) { hc = hue[i]; hb = i; } }
    return { achromatic: avgS < 0.10 || hc < n * 0.10, bodyL: (mb + 0.5) / 20, domH: hb * 10 + 5 };
  }

  function isPaint(p, info) {
    const { h, s, l } = p;
    if (l < 0.05) return false;                       // tyre / deep shadow
    if (l > 0.96 && s < 0.12) return false;           // chrome / specular highlight
    if (info.achromatic) {
      if (Math.abs(l - info.bodyL) > 0.34) return false;            // far from body tone = glass/trim
      if (s > 0.12 && h > 170 && h < 265 && l < info.bodyL) return false; // bluish + dark = window glass
      if (s > 0.32) return false;                                    // too saturated for an achromatic car
      return true;
    }
    if (s < 0.10) return false;                       // desaturated on a coloured car = glass/chrome/rubber
    const diff = Math.min(Math.abs(h - info.domH), 360 - Math.abs(h - info.domH));
    return diff < 45 || s > 0.22;                     // hue-close to paint, or vividly saturated
  }

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

        const { r: tr, g: tg, b: tb } = hexToRGB(targetHex);
        const tHSL = rgbToHSL(tr, tg, tb);

        // PPF clear / PPF matte — protective films: subtle tint only, keep paint
        if (finish === 'ppf-clear' || finish === 'ppf-matte') {
          const strength = finish === 'ppf-matte' ? 0.12 : 0.06;
          for (let i = 0; i < d.length; i += 4) {
            if (d[i+3] < 20) continue;
            d[i]   = Math.round(d[i]   * (1-strength) + tr * strength);
            d[i+1] = Math.round(d[i+1] * (1-strength) + tg * strength);
            d[i+2] = Math.round(d[i+2] * (1-strength) + tb * strength);
          }
          ctx.putImageData(id, 0, 0); return resolve(cv.toDataURL('image/png'));
        }

        const info = analyseBody(d, cw, ch);
        const satMult = finish === 'matte' ? 0.82 : finish === 'satin' ? 0.90 : 1.0;
        const n = cw * ch;

        // 1) candidate paint pixels
        const cand = new Uint8Array(n);
        for (let i = 0; i < d.length; i += 4) {
          if (d[i+3] < 40) continue;
          if (isPaint(rgbToHSL(d[i], d[i+1], d[i+2]), info)) cand[i >> 2] = 1;
        }

        // 2) connected components (BFS, O(1) queue) — keep only large regions
        const labels = new Int32Array(n).fill(-1);
        const sizes = [];
        const q = new Int32Array(n);
        let next = 0;
        for (let s = 0; s < n; s++) {
          if (!cand[s] || labels[s] >= 0) continue;
          const lab = next++; let head = 0, tail = 0, sz = 0;
          q[tail++] = s; labels[s] = lab;
          while (head < tail) {
            const c = q[head++]; sz++;
            const cy = (c / cw) | 0, cx = c % cw;
            if (cy > 0)    { const nb = c - cw; if (cand[nb] && labels[nb] < 0) { labels[nb] = lab; q[tail++] = nb; } }
            if (cy < ch-1) { const nb = c + cw; if (cand[nb] && labels[nb] < 0) { labels[nb] = lab; q[tail++] = nb; } }
            if (cx > 0)    { const nb = c - 1;  if (cand[nb] && labels[nb] < 0) { labels[nb] = lab; q[tail++] = nb; } }
            if (cx < cw-1) { const nb = c + 1;  if (cand[nb] && labels[nb] < 0) { labels[nb] = lab; q[tail++] = nb; } }
          }
          sizes.push(sz);
        }
        let total = 0; for (let i = 0; i < cand.length; i++) total += cand[i];
        const minSize = Math.max(300, total * 0.02);
        let paint = new Uint8Array(n);
        for (let i = 0; i < n; i++) { const l = labels[i]; if (l >= 0 && sizes[l] >= minSize) paint[i] = 1; }

        // 3) dilate 2px to close panel gaps / handles, but never onto tyre/chrome
        for (let pass = 0; pass < 2; pass++) {
          const grown = paint.slice();
          for (let i = 0; i < d.length; i += 4) {
            const pix = i >> 2;
            if (paint[pix] || d[i+3] < 40) continue;
            const p = rgbToHSL(d[i], d[i+1], d[i+2]);
            if (p.l < 0.05 || (p.l > 0.96 && p.s < 0.12)) continue; // keep tyres/chrome out
            const x = pix % cw, y = (pix / cw) | 0;
            if ((x > 0 && paint[pix-1]) || (x < cw-1 && paint[pix+1]) ||
                (y > 0 && paint[pix-cw]) || (y < ch-1 && paint[pix+cw])) grown[pix] = 1;
          }
          paint = grown;
        }

        // 4) luminance-preserving recolour of the final paint mask
        for (let i = 0; i < d.length; i += 4) {
          if (!paint[i >> 2]) continue;
          const L = rgbToHSL(d[i], d[i+1], d[i+2]).l;
          const rc = hslToRGB(tHSL.h, tHSL.s * satMult, L);
          d[i] = rc.r; d[i+1] = rc.g; d[i+2] = rc.b;
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
    const { swatch, carUrl, setCarUrl, originalUrl, setOriginalUrl, rendering, renderPct, renderStep,
            startRender, baActive, setBaActive, panels, panelColors, activePanel, setActivePanel,
            finishLabel, brandShort, renderUrl, rendersLeft, renderCap } = props;
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

    // ── file ingest — client-side bg removal, stores both originalUrl + carUrl ──
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

        // Dynamic import via new Function bypasses Babel's import() transformation.
        // Browser caches the module after first load so subsequent calls are instant.
        // Two CDNs: esm.sh primary, jsdelivr fallback (either can flake per-network).
        const MODULE_CDNS = [
          'https://esm.sh/@imgly/background-removal@1.4.5',
          'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.4.5/+esm',
        ];
        let mod = null, lastErr = null;
        for (const u of MODULE_CDNS) {
          try { mod = await new Function('u', 'return import(u)')(u); break; }
          catch (e) { lastErr = e; }
        }
        if (!mod) throw new Error('Could not load the background-removal tool. Check your connection and try again.');

        // The library downloads a multi-MB model the first time. On a flaky
        // connection that fetch fails with a bare "Failed to fetch" and the whole
        // call rejects — so we pin the model host explicitly and retry across a
        // fallback host (jsdelivr 403s the binary data package; unpkg serves it)
        // and across GPU→CPU (WebGPU is unavailable in some browsers).
        // staticimgly is the library default and the most reliable; unpkg backs it up.
        const DATA_CDNS = [
          'https://staticimgly.com/@imgly/background-removal-data/1.4.5/dist/',
          'https://unpkg.com/@imgly/background-removal-data@1.4.5/dist/',
        ];
        // model: 'isnet' is the full-precision general matte — noticeably better on
        // thin structures (rear wings, spoilers, aerials) than the default quantised
        // model. Fall back to the default model if that variant won't load.
        let resultBlob = null;
        lastErr = null;
        outer:
        for (const publicPath of DATA_CDNS) {
          for (const device of ['gpu', 'cpu']) {
            for (const model of ['isnet', undefined]) {
              try {
                const cfg = { publicPath, device };
                if (model) cfg.model = model;
                resultBlob = await mod.removeBackground(file, cfg);
                break outer;
              } catch (e) { lastErr = e; }
            }
          }
        }
        if (!resultBlob) {
          const m = (lastErr && (lastErr.message || String(lastErr))) || '';
          throw new Error(/fetch|network|load/i.test(m)
            ? 'Could not download the cutout model — check your connection and try again.'
            : (m || 'Background removal failed'));
        }

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
    const wrapClip  = baActive ? { clipPath: `inset(0 ${100 - baPos}% 0 0)`, WebkitClipPath: `inset(0 ${100 - baPos}% 0 0)` } : {};
    const origClip  = baActive ? { clipPath: `inset(0 0 0 ${baPos}%)`,        WebkitClipPath: `inset(0 0 0 ${baPos}%)` }        : {};
    const fx = swatch ? fxFor(swatch) : null;
    // Always mask to the original cutout (carUrl) — even when showing recolouredUrl
    const maskStyle = carUrl ? { WebkitMaskImage: `url(${carUrl})`, maskImage: `url(${carUrl})` } : null;

    // Finish overlay layers — used for ALL finishes on top of the canvas-recoloured car.
    // Skipped when a studio render is showing: the render is a finished full-scene
    // photograph, so silhouette-masked sheen layers would misalign on top of it.
    const fxLayers = (carUrl && fx && !renderUrl) ? [
      h('div', { key: 'tone', className: 'car-fx car-tone', style: { ...maskStyle, opacity: fx.tone.opacity, background: '#000' } }),
      h('div', { key: 'tint', className: 'car-fx car-tint ' + (fx.anim || ''), style: { ...maskStyle, ...fx.tint } }),
      h('div', { key: 'sheen', className: 'car-fx car-sheen', style: { ...maskStyle, opacity: fx.sheen.opacity,
        background: 'linear-gradient(118deg, rgba(255,255,255,.9) 0%, transparent 26%, transparent 72%, rgba(255,255,255,.4) 100%)' } }),
    ] : null;

    // The displayed car: renderUrl (studio render) > recolouredUrl (canvas engine) > carUrl
    const displayUrl = renderUrl || recolouredUrl || carUrl;

    useEffect(() => {
      window.__wrapDownload = async () => {
        if (!displayUrl) return false;
        const img = new Image();
        img.src = displayUrl;
        await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
        const cv = document.createElement('canvas');
        cv.width = img.naturalWidth || 1200;
        cv.height = img.naturalHeight || 800;
        const ctx = cv.getContext('2d');
        ctx.drawImage(img, 0, 0, cv.width, cv.height);
        const pad = Math.round(cv.width * 0.02);
        const fontSize = Math.max(14, Math.round(cv.width * 0.025));
        ctx.font = 'bold ' + fontSize + 'px sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText('MATTHEWS / CLARK', cv.width - pad, cv.height - pad);
        await new Promise((res) => cv.toBlob((blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = 'mc-wrap-preview.png'; a.click();
          setTimeout(() => URL.revokeObjectURL(url), 5000);
          res();
        }, 'image/png'));
        return true;
      };
      return () => { if (window.__wrapDownload) delete window.__wrapDownload; };
    }, [displayUrl]);

    // Build the studio-render inputs. Two images go to the model:
    //  1) photoBlob — the car REFRAMED at ≈70% scale, seated low on a NEUTRAL
    //     wall→floor backdrop (not the bay). Reframing fixes "car fills the frame /
    //     looks flopped on"; the neutral backdrop avoids baking the bay's high
    //     downward angle + signage into the edit. From the ORIGINAL photo so wings/
    //     identity survive; outer border feathered; contact shadow pre-drawn.
    //  2) bayBlob — the bay as a REFERENCE the model rebuilds AROUND the car at the
    //     car's camera angle (see route prompt). swatchBlob pins the colour.
    // No edit mask (a masked edit regenerates the car blind and swaps the vehicle).
    useEffect(() => {
      const photoSrc = originalUrl || carUrl;
      window.__wrapRenderCanvas = async () => {
        if (!photoSrc) return null;
        try {
          const loadImg = (src) => new Promise((res, rej) => {
            const i = new Image(); i.crossOrigin = 'anonymous';
            i.onload = () => res(i); i.onerror = rej; i.src = src;
          });
          const [photo, bay] = await Promise.all([
            loadImg(photoSrc),
            loadImg('/wrap-studio/studio-bay.PNG'),
          ]);

          // Landscape canvas — a car in a room reads wide
          const W = 1536, H = 1024;
          const cv = document.createElement('canvas');
          cv.width = W; cv.height = H;
          const ctx = cv.getContext('2d');

          // NEUTRAL backdrop — NOT the bay. We do not bake the bay in because the
          // bay photo is shot from a high downward angle and carries signage; baking
          // it makes the model fight two perspectives and keep stray text. Instead a
          // plain wall→floor gradient gives the car room + a level horizon, and the
          // bay is sent separately as a reference for the model to rebuild at the
          // car's camera angle.
          const g = ctx.createLinearGradient(0, 0, 0, H);
          g.addColorStop(0.00, '#33363b');   // upper wall (darker)
          g.addColorStop(0.52, '#54585e');
          g.addColorStop(0.60, '#65696f');   // wall→floor horizon, roughly at the car's eye level
          g.addColorStop(1.00, '#8a8e95');   // polished floor (lighter)
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, W, H);

          // Car photo scaled to sit IN the scene (not fill it), seated low-centre
          const fit = Math.min((W * 0.72) / photo.naturalWidth, (H * 0.80) / photo.naturalHeight);
          const pw = Math.max(1, Math.round(photo.naturalWidth * fit));
          const ph = Math.max(1, Math.round(photo.naturalHeight * fit));
          const px = Math.round((W - pw) / 2);
          const py = Math.round(H * 0.93 - ph);

          // Feather the photo's outer border so its original background melts into
          // the neutral backdrop, keeping the car (and wing) sharp in the centre
          const o = document.createElement('canvas');
          o.width = pw; o.height = ph;
          const octx = o.getContext('2d');
          octx.drawImage(photo, 0, 0, pw, ph);
          octx.globalCompositeOperation = 'destination-in';
          const m = Math.round(Math.min(pw, ph) * 0.10);
          octx.filter = `blur(${Math.max(1, Math.round(m * 0.8))}px)`;
          octx.fillStyle = '#fff';
          octx.fillRect(m, m, pw - 2 * m, ph - 2 * m);
          octx.filter = 'none';
          octx.globalCompositeOperation = 'source-over';

          // Pre-drawn contact shadow to anchor the car to the floor
          ctx.save();
          ctx.filter = 'blur(16px)';
          ctx.fillStyle = 'rgba(0,0,0,0.4)';
          ctx.beginPath();
          ctx.ellipse(W / 2, py + ph * 0.95, pw * 0.40, ph * 0.05, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          ctx.drawImage(o, px, py);

          // Exact-colour reference swatch
          let swatchBlob = null;
          if (swatch && swatch.hex) {
            const sc = document.createElement('canvas');
            sc.width = 512; sc.height = 512;
            const sctx = sc.getContext('2d');
            if (swatch.hex2) {
              const g = sctx.createLinearGradient(0, 0, 512, 512);
              g.addColorStop(0, swatch.hex); g.addColorStop(1, swatch.hex2);
              sctx.fillStyle = g;
            } else {
              sctx.fillStyle = swatch.hex;
            }
            sctx.fillRect(0, 0, 512, 512);
            swatchBlob = await new Promise((res) => sc.toBlob(res, 'image/png'));
          }

          // Bay sent as a separate REFERENCE — the model rebuilds this studio
          // around the car at the car's perspective (not baked into the composite)
          const bc = document.createElement('canvas');
          const bScale = Math.min(1, 1024 / Math.max(bay.naturalWidth, bay.naturalHeight));
          bc.width = Math.round(bay.naturalWidth * bScale);
          bc.height = Math.round(bay.naturalHeight * bScale);
          bc.getContext('2d').drawImage(bay, 0, 0, bc.width, bc.height);
          const bayBlob = await new Promise((res) => bc.toBlob(res, 'image/jpeg', 0.9));

          const photoBlob = await new Promise((res) => cv.toBlob(res, 'image/jpeg', 0.92));
          return { photoBlob, bayBlob, swatchBlob, size: '1536x1024' };
        } catch { return null; }
      };
      return () => { if (window.__wrapRenderCanvas) delete window.__wrapRenderCanvas; };
    }, [carUrl, originalUrl, swatch ? swatch.id : null]);

    const wrapColorVar = swatch ? swatch.hex : '#3a3d42';

    return h('div', { className: 'stage-col' },
      h('div', { className: 'stage', ref: stageRef,
        style: { '--wrap-color': wrapColorVar, userSelect: baActive ? 'none' : '', WebkitUserSelect: baActive ? 'none' : '' },
        onClick: (e) => { if (justDraggedRef.current) { justDraggedRef.current = false; e.stopPropagation(); } } },

        // the real M&C bay, always
        h('img', { className: 'bay-photo', src: '/wrap-studio/studio-bay.PNG', alt: '', draggable: 'false' }),
        h('div', { className: 'bay-grade' }),

        // car staging — WRAPPED side (left of slider), clipped at car-wrap level
        h('div', { className: 'car-wrap', style: baActive ? wrapClip : {} },
          renderUrl
            // Studio render — full-scene photograph, shown full-bleed
            ? h('img', { className: 'render-scene', src: renderUrl, alt: 'Studio render', draggable: 'false' })
            : carUrl
              ? h('div', { className: 'car-box', 'data-colored': colored ? '1' : '0' },
                  h('img', { className: 'car-base', src: displayUrl, alt: 'Your car', draggable: 'false' }),
                  fxLayers)
              : null
        ),
        // BEFORE side (right of slider) — same cutout, no colour overlay
        baActive && carUrl ? h('div', { className: 'car-wrap', style: origClip, 'data-layer': 'before' },
          h('div', { className: 'car-box' },
            h('img', { className: 'car-base', src: carUrl, alt: 'Before', draggable: 'false' })
          )
        ) : null,

        // empty state — put your car in the bay
        !carUrl ? h('div', { className: 'car-ph' },
          h('div', { className: 'ph-upload' },
            h('div', { className: 'ph-kicker' }, 'Matthews / Clark — Wrap Studio'),
            h('div', { className: 'ph-title' }, 'Put your car ', h('em', null, 'in the bay')),
            h('button', {
              className: 'ph-upload-btn',
              onClick: (e) => { e.stopPropagation(); fileRef.current.click(); }
            }, h(I.Upload, { size: 16 }), 'Upload your car photo'),
            h('span', { className: 'ph-upload-hint' }, 'or drag & drop · JPG · PNG · HEIC'),
            h('span', { className: 'ph-upload-tip' }, 'Best results: 3/4 front or side-on, in good light'))) : null,

        // before/after
        baActive && (colored || renderUrl) ? h(React.Fragment, null,
          h('div', { className: 'ba-tag after' }, renderUrl ? 'Studio render' : 'Wrapped'),
          h('div', { className: 'ba-tag before' }, renderUrl ? 'Original' : 'No wrap'),
          h('div', { className: 'ba-divider', style: { left: baPos + '%' },
            onMouseDown: (e) => { e.stopPropagation(); dragRef.current = true; },
            onTouchStart: (e) => { e.stopPropagation(); dragRef.current = true; } },
            h('div', { className: 'knob' }, h(I.Split, { size: 20 })))
        ) : null,

        // bg removal progress overlay — stays visible on error so the user can see what went wrong
        (removing || removeError) ? h('div', { className: 'render-veil on' },
          h('div', { className: 'render-card' },
            h('div', { className: 'rk' }, 'Preparing your car'),
            removeError
              ? h('h3', { style: { color: 'var(--warn)' } }, 'Background removal failed')
              : h('h3', null, 'Lifting your car off its background'),
            removeError
              ? h('p', null, removeError)
              : h('p', null, 'A few seconds — we isolate the car so the wrap sits only on the body.'),
            !removeError ? h('div', { className: 'removal-bar' }, h('div', { className: 'removal-bar-sweep' })) : null,
            removeError ? h('button', { className: 'btn btn--sm', style: { marginTop: 8 },
              onClick: () => setRemoveError(null) }, 'Dismiss') : null)) : null,

        // drop veil
        h('div', { className: 'drop-veil' }, h(I.Upload, { size: 22, style: { marginRight: 10 } }), 'Drop to place your car'),

        // render veil — the developing room. Narrates the real pipeline (labor
        // illusion / operational transparency) so the ~2-min wait feels active.
        (() => {
          const colourName = swatch ? swatch.name : 'your colour';
          const STEPS = [
            'Reading your car’s panels',
            'Lifting it into the M&C bay',
            'Matching the studio lighting',
            'Wrapping every panel in ' + colourName,
            'Casting shadows & floor reflection',
            'Final polish',
          ];
          return h('div', { className: 'render-veil' + (rendering ? ' on' : '') },
            h('div', { className: 'render-card' },
              h('div', { className: 'rk' }, 'Studio render'),
              h('h3', null, 'Developing your studio shot'),
              h('div', { className: 'render-steps' },
                STEPS.map((s, idx) => {
                  const state = idx < renderStep ? 'done' : (idx === renderStep ? 'now' : 'next');
                  return h('div', { key: idx, className: 'rstep ' + state },
                    h('span', { className: 'rstep-ic' },
                      state === 'done' ? h(I.Check, { size: 13 })
                        : state === 'now' ? h('span', { className: 'rstep-spin' }) : null),
                    h('span', { className: 'rstep-tx' }, s));
                })),
              h('div', { className: 'render-bar' }, h('i', { style: { width: renderPct + '%' } })),
              h('div', { className: 'render-foot' },
                h('span', { className: 'render-pct' }, Math.round(renderPct) + '%'),
                h('span', { className: 'render-reassure' }, 'A real studio shoot, not a filter — worth the minute.'))));
        })(),

        // ── HUD ──
        h('div', { className: 'stage-hud' },
          // top-left: preview-vs-render status — makes it unmistakable that the
          // live view is an APPROXIMATE colour preview until you generate the render
          carUrl && swatch ? h('div', { className: 'hud-tl' },
            h('div', { className: 'preview-tag' + (renderUrl ? ' is-render' : '') },
              h('span', { className: 'pt-dot' }),
              h('span', { className: 'pt-label' }, renderUrl ? 'Studio render' : 'Quick preview'),
              h('span', { className: 'pt-sub' }, renderUrl ? 'true colour & finish' : 'indicative colour only'))) : null,

          // top-right: the one primary stage action — the deliberate AI step.
          // The instant colour preview is free + approximate; THIS generates the
          // photoreal render (the true colour) and uses one daily render.
          carUrl ? h('div', { className: 'hud-tr' },
            h('div', { className: 'render-stack' },
              h('button', {
                className: 'render-cta' + (swatch && !renderUrl && !rendering && rendersLeft !== 0 ? ' is-next' : ''),
                disabled: rendering || rendersLeft === 0,
                onClick: startRender, title: 'Generate a photoreal AI render in the M&C studio' },
                h(I.Sparkle, { size: 16 }),
                rendering ? 'Generating…' : (renderUrl ? 'Generate again' : 'Generate studio render')),
              h('div', { className: 'render-note' + (swatch && !renderUrl && !rendering && rendersLeft !== 0 ? ' is-next' : '') },
                rendersLeft === 0
                  ? 'Daily limit reached — resets tomorrow'
                  : (swatch && !renderUrl
                      ? `↑ Next step — see the true colour · ${typeof rendersLeft === 'number' ? rendersLeft : (renderCap || 3)} left today`
                      : (typeof rendersLeft === 'number'
                          ? `Photoreal AI · ${rendersLeft} of ${renderCap || 3} left today · ~2 min`
                          : `Photoreal AI · ${renderCap || 3} free per day · ~2 min`))))) : null,

          // bottom-left: film caption
          carUrl ? h('div', { className: 'hud-bl' },
            h('div', { className: 'cap' },
              swatch ? h(React.Fragment, null,
                h('b', null, brandShort), h('span', { className: 'sep' }, '/'),
                finishLabel, h('span', { className: 'sep' }, '/'),
                h('b', null, swatch.name)) : 'No film selected',
              swatch ? h(React.Fragment, null, h('span', { className: 'sep' }, '/'), swatch.code || codeFor(swatch)) : null)) : null,

          // bottom-right: tools
          h('div', { className: 'hud-br' },
            carUrl ? h('button', { className: 'pill-btn', title: 'Replace car photo', onClick: () => fileRef.current.click() }, h(I.Refresh, { size: 16 })) : null,
            carUrl ? h('button', { className: 'pill-btn' + (baActive ? ' on' : ''), title: 'Before / after', onClick: () => setBaActive(!baActive) }, h(I.Compare, { size: 16 })) : null)
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
  window.codeFor = codeFor;
})();
