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
  // Runs on the background-removed cutout (so only the car is ever touched, never
  // the surroundings). This is an INDICATIVE preview — the studio render is the
  // accurate result. Reliability beats precision here: rather than a per-pixel
  // paint mask (which fragmented on metallic/grey cars → "half the paint" and
  // misfired on lights), we recolour the WHOLE car luminance-preserved with a
  // smooth per-pixel weight that protects the bright zones (head/tail lights,
  // chrome, hot reflections) and the tyres, and gently eases off on dark glass.
  // Full, even coverage on every car colour; lights kept; no holes.

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

        const clamp01 = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
        const satMult = finish === 'matte' ? 0.82 : finish === 'satin' ? 0.90 : 1.0;

        for (let i = 0; i < d.length; i += 4) {
          if (d[i+3] < 20) continue;                  // outside the cutout
          const px = rgbToHSL(d[i], d[i+1], d[i+2]);
          const L = px.l, S = px.s;

          // weight = how strongly to apply colour (1 = full). The body — at ANY
          // luminance, including the shadowed/dark side of grey & black cars — stays
          // at ~1 so coverage is always complete and even (no "half the paint").
          // Only the genuine extremes ease off: bright lights/chrome/highlights stay
          // bright; the darkest pixels (tyres/shadow) ease out but recolour ≈ black
          // there anyway, so they read correctly. Dark glass tints like the body —
          // an accepted trade for guaranteed full coverage (this is an indicative
          // preview; the studio render is the accurate one).
          void S;
          let w = 1;
          if (L > 0.80) w *= clamp01((0.98 - L) / 0.18);  // head lights, chrome, specular → keep bright
          if (L < 0.10) w *= clamp01(L / 0.10);           // tyres / deep shadow
          if (w <= 0.001) continue;

          const rc = hslToRGB(tHSL.h, tHSL.s * satMult, L);
          d[i]   = Math.round(d[i]   * (1 - w) + rc.r * w);
          d[i+1] = Math.round(d[i+1] * (1 - w) + rc.g * w);
          d[i+2] = Math.round(d[i+2] * (1 - w) + rc.b * w);
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
    // true once we have a clean background-removed cutout. When matting fails we
    // still show the original photo (so the user is never stuck and can render),
    // but we DON'T run the live recolour on it — recolouring a photo that still
    // has its background would tint the background too.
    const [cutoutReady, setCutoutReady] = useState(false);
    const recolourAbort = useRef(null);

    // On load with a restored photo, detect whether it's a real cutout (has
    // transparency) so the live recolour works again without re-uploading.
    useEffect(() => {
      if (!carUrl) return;
      let alive = true;
      const im = new Image(); im.crossOrigin = 'anonymous';
      im.onload = () => {
        if (!alive) return;
        try {
          const c = document.createElement('canvas'); c.width = 64; c.height = 64;
          const x = c.getContext('2d'); x.drawImage(im, 0, 0, 64, 64);
          const dd = x.getImageData(0, 0, 64, 64).data;
          let transparent = 0; for (let i = 3; i < dd.length; i += 4) if (dd[i] < 200) transparent++;
          if (transparent / (dd.length / 4) > 0.08) setCutoutReady(true);
        } catch {}
      };
      im.src = carUrl;
      return () => { alive = false; };
    }, []); // mount only — ingest sets cutoutReady during a fresh upload

    // ── Canvas recolour: runs whenever the car or swatch changes ──────────────
    useEffect(() => {
      if (!carUrl || !swatch || !cutoutReady) { setRecolouredUrl(null); return; }
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
    }, [carUrl, cutoutReady, swatch ? swatch.id : null]);

    const colored = !!swatch;

    // ── file ingest — client-side bg removal, stores both originalUrl + carUrl ──
    const ingest = useCallback(async (file) => {
      if (!file || !/^image\//.test(file.type)) return;
      setRemoveError(null);
      setCutoutReady(false);
      // Show the car INSTANTLY, then isolate it in the background. The cutout is a
      // progressive enhancement (enables the live recolour); it never blocks — the
      // user can generate the studio render immediately (that uses the original).
      let origDataUrl = null;
      try {
        origDataUrl = await new Promise((res, rej) => {
          const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej;
          r.readAsDataURL(file);
        });
      } catch {
        setRemoveError('Could not read that image — try another photo.');
        return;
      }
      if (setOriginalUrl) setOriginalUrl(origDataUrl);
      setCarUrl(origDataUrl);          // ← car visible immediately
      setRemoving(true);               // small non-blocking "isolating" chip
      try {

        // Downscale the input before matting — big phone photos make CPU inference
        // crawl (this was the "stuck" hang). ~1400px long edge keeps a clean cutout
        // while staying fast.
        const inputForMatte = await (async () => {
          try {
            const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = origDataUrl; });
            const s = Math.min(1, 1400 / Math.max(im.naturalWidth, im.naturalHeight));
            if (s >= 1) return file;
            const c = document.createElement('canvas');
            c.width = Math.round(im.naturalWidth * s); c.height = Math.round(im.naturalHeight * s);
            c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
            return await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.92));
          } catch { return file; }
        })();

        // Load the matting module (esm.sh primary, jsdelivr fallback)
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

        // Use the fast/light model ('small' — the @imgly quantised matte) — the
        // studio render uses the original photo, not this cutout, so cutout speed
        // beats thin-part precision. Only attempt GPU when WebGPU actually exists
        // (otherwise the call stalls trying to init a context that isn't there);
        // fall to CPU. Model data from staticimgly, unpkg as fallback. Hard timeout.
        const DATA_CDNS = [
          'https://staticimgly.com/@imgly/background-removal-data/1.4.5/dist/',
          'https://unpkg.com/@imgly/background-removal-data@1.4.5/dist/',
        ];
        const devices = (typeof navigator !== 'undefined' && navigator.gpu) ? ['gpu', 'cpu'] : ['cpu'];
        const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
        let resultBlob = null;
        lastErr = null;
        outer:
        for (const device of devices) {
          for (const publicPath of DATA_CDNS) {
            try {
              resultBlob = await withTimeout(
                mod.removeBackground(inputForMatte, { publicPath, device, model: 'small' }),
                device === 'gpu' ? 30000 : 45000); // background task — give up rather than churn forever
              break outer;
            } catch (e) {
              lastErr = e;
              if (/timeout/i.test(e && e.message) && device === 'gpu') break; // GPU stalled → switch to CPU
            }
          }
        }
        if (!resultBlob) {
          const m = (lastErr && (lastErr.message || String(lastErr))) || '';
          throw new Error(/timeout/i.test(m)
            ? 'Background removal is taking too long on this device — try a smaller photo, or another browser.'
            : (/fetch|network|load/i.test(m)
                ? 'Could not download the cutout model — check your connection and try again.'
                : (m || 'Background removal failed')));
        }

        // Convert result blob to dataURL for masking + storage
        const cutoutDataUrl = await new Promise((res, rej) => {
          const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej;
          r.readAsDataURL(resultBlob);
        });
        setCarUrl(cutoutDataUrl);   // ← upgrade to the clean cutout
        setCutoutReady(true);       //    enables the live recolour
      } catch (err) {
        // Non-blocking: the original photo is already showing and the render still
        // works, so isolation failing just means no live recolour for this photo.
        console.warn('[Stage] background isolation skipped:', err && err.message);
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
    const fxLayers = (carUrl && fx && cutoutReady && !renderUrl) ? [
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

        // Background isolation runs quietly — a small NON-blocking chip, never a veil.
        // The car is already on screen and the studio render works regardless.
        removing ? h('div', { className: 'isolating-chip' },
          h('span', { className: 'iso-spin' }),
          'Isolating your car for live colour…') : null,
        // Only a true read failure shows a (dismissible) error.
        removeError ? h('div', { className: 'isolating-chip iso-error' },
          removeError,
          h('button', { className: 'iso-dismiss', onClick: () => setRemoveError(null) }, h(I.X, { size: 13 }))) : null,

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
            h('div', { className: 'preview-tag' + (renderUrl ? ' is-render' : (cutoutReady ? '' : ' is-limited')) },
              h('span', { className: 'pt-dot' }),
              h('span', { className: 'pt-label' }, renderUrl ? 'Studio render' : (cutoutReady ? 'Quick preview' : 'Colour selected')),
              h('span', { className: 'pt-sub' }, renderUrl ? 'true colour & finish'
                : (cutoutReady ? 'indicative colour only' : 'generate render to see it on your car')))) : null,

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
