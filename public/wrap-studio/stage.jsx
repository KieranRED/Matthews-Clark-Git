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

        // ── BULLETPROOF PAINT MASK ──────────────────────────────────────────
        //
        // Step 1: Initial candidates — colour/luminance heuristics
        // Step 2: Connected component analysis (BFS, O(n))
        //         Paint body is the LARGEST contiguous region — trim, speckles,
        //         glass flakes and chrome are small disconnected components and
        //         get eliminated automatically regardless of car colour
        // Step 3: Size threshold — components < 1% of candidates are discarded
        // Step 4: Apply colour only to surviving paint pixels
        //
        // This approach is car-colour agnostic: black, white, silver, red, any.

        const n = cw * ch;

        // Step 1: initial candidate pass
        const cands = new Uint8Array(n);
        for (let i = 0; i < d.length; i += 4) {
          if (d[i+3] < 25) continue;
          if (isPaintPixel(rgbToHSL(d[i], d[i+1], d[i+2]), carInfo)) cands[i >> 2] = 1;
        }

        // Step 2: BFS connected components with O(1) queue
        const labels = new Int32Array(n).fill(-1);
        const compSizes = [];
        const bfsQ = new Int32Array(n); // pre-allocated queue — no Array.shift() O(n) cost
        let nextLabel = 0;

        for (let start = 0; start < n; start++) {
          if (!cands[start] || labels[start] >= 0) continue;
          const label = nextLabel++;
          let head = 0, tail = 0;
          bfsQ[tail++] = start;
          labels[start] = label;
          let size = 0;
          while (head < tail) {
            const cur = bfsQ[head++]; size++;
            const cy = Math.floor(cur / cw), cx = cur % cw;
            // 4-connected neighbours
            if (cy > 0)    { const nb = cur - cw; if (cands[nb] && labels[nb] < 0) { labels[nb] = label; bfsQ[tail++] = nb; } }
            if (cy < ch-1) { const nb = cur + cw; if (cands[nb] && labels[nb] < 0) { labels[nb] = label; bfsQ[tail++] = nb; } }
            if (cx > 0)    { const nb = cur - 1;  if (cands[nb] && labels[nb] < 0) { labels[nb] = label; bfsQ[tail++] = nb; } }
            if (cx < cw-1) { const nb = cur + 1;  if (cands[nb] && labels[nb] < 0) { labels[nb] = label; bfsQ[tail++] = nb; } }
          }
          compSizes.push(size);
        }

        // Step 3: keep components >= 1% of all candidates (eliminates all isolated noise)
        const totalCands = cands.reduce((a, b) => a + b, 0);
        const minCompSize = Math.max(200, totalCands * 0.01);
        const keepSet = new Uint8Array(nextLabel);
        for (let l = 0; l < nextLabel; l++) { if (compSizes[l] >= minCompSize) keepSet[l] = 1; }

        // Step 4: apply colour only to pixels whose component survived
        for (let i = 0; i < d.length; i += 4) {
          const pix = i >> 2;
          if (!cands[pix] || !keepSet[labels[pix]]) continue;
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
    const { swatch, carUrl, setCarUrl, setOriginalUrl, rendering, renderPct,
            startRender, baActive, setBaActive, panels, panelColors, activePanel, setActivePanel,
            finishLabel, brandShort, renderUrl } = props;
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
        let resultBlob = null;
        lastErr = null;
        for (const publicPath of DATA_CDNS) {
          for (const device of ['gpu', 'cpu']) {
            try { resultBlob = await mod.removeBackground(file, { publicPath, device }); break; }
            catch (e) { lastErr = e; }
          }
          if (resultBlob) break;
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

    // Expose composite + mask + colour-reference for the studio render upload.
    // - composite: car pre-placed in the studio bay with a drawn contact shadow,
    //   so gpt-image-2 receives a fully positioned scene, not a floating car.
    // - mask: alpha mask, transparent ONLY over the (dilated) car silhouette and a
    //   reflection band beneath it — used CLIENT-SIDE ONLY by __wrapFinaliseRender
    //   (never sent to the API: masked API edits regenerate the car blind).
    // - swatch: small solid PNG of the exact wrap colour, sent as a reference image.
    // IMPORTANT: composites from the ORIGINAL cutout (carUrl), NOT the canvas
    // recolour — the recolour is patchy on hard photos and destroys the identity
    // cues (grille, badges, trim) the model needs to keep it the same car. The
    // wrap colour is communicated via the swatch reference + exact hex in the
    // prompt instead. Never composites renderUrl — a finished render must not
    // feed back into the next composite as the "car".
    useEffect(() => {
      const srcUrl = carUrl;
      window.__wrapRenderCanvas = async () => {
        if (!srcUrl) return null;
        try {
          const loadImg = (src) => new Promise((res, rej) => {
            const i = new Image(); i.crossOrigin = 'anonymous';
            i.onload = () => res(i); i.onerror = rej; i.src = src;
          });
          const [carImg, bayImg] = await Promise.all([
            loadImg(srcUrl),
            loadImg('/wrap-studio/studio-bay.PNG'),
          ]);

          // Output matches GPT request size: 1536×1024
          const W = 1536, H = 1024;
          const cv = document.createElement('canvas');
          cv.width = W; cv.height = H;
          const ctx = cv.getContext('2d');

          // Studio bay — scale to cover canvas, center
          const bayScale = Math.max(W / bayImg.naturalWidth, H / bayImg.naturalHeight);
          const bayW = bayImg.naturalWidth * bayScale;
          const bayH = bayImg.naturalHeight * bayScale;
          ctx.drawImage(bayImg, (W - bayW) / 2, (H - bayH) / 2, bayW, bayH);

          // Car — 65% canvas width, seated on the floor
          const carScale = (W * 0.65) / carImg.naturalWidth;
          const carW = carImg.naturalWidth * carScale;
          const carH = carImg.naturalHeight * carScale;
          const carX = (W - carW) / 2;
          const carY = H - carH - 56;

          // Soft contact shadow under the car — anchors it to the floor and gives
          // the model an existing shadow to refine rather than invent
          ctx.save();
          ctx.filter = 'blur(18px)';
          ctx.fillStyle = 'rgba(0,0,0,0.45)';
          ctx.beginPath();
          ctx.ellipse(W / 2, carY + carH - 6, carW * 0.46, carH * 0.07, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          ctx.drawImage(carImg, carX, carY, carW, carH);

          // ── Edit mask: opaque = locked, transparent = model may edit ──
          // Editable region = car silhouette dilated ~6px + reflection zone below.
          const mk = document.createElement('canvas');
          mk.width = W; mk.height = H;
          const mctx = mk.getContext('2d');
          mctx.fillStyle = '#000';
          mctx.fillRect(0, 0, W, H);
          mctx.globalCompositeOperation = 'destination-out';
          mctx.filter = 'blur(4px)';
          // dilate by stamping the silhouette at 8 offsets (only alpha matters here)
          // — kept tight (6px) so the blend seam around the car stays invisible
          for (let a = 0; a < 8; a++) {
            const dx = Math.cos(a * Math.PI / 4) * 6, dy = Math.sin(a * Math.PI / 4) * 6;
            mctx.drawImage(carImg, carX + dx, carY + dy, carW, carH);
          }
          mctx.drawImage(carImg, carX, carY, carW, carH);
          // shadow + floor-reflection zone under the car
          mctx.filter = 'blur(14px)';
          mctx.beginPath();
          mctx.ellipse(W / 2, carY + carH - 6, carW * 0.55, carH * 0.30, 0, 0, Math.PI * 2);
          mctx.fill();
          mctx.filter = 'none';
          mctx.globalCompositeOperation = 'source-over';

          // ── Exact-colour reference swatch ──
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

          const toBlob = (c) => new Promise((res) => c.toBlob(res, 'image/png'));
          return {
            blob: await toBlob(cv),
            maskBlob: await toBlob(mk),
            swatchBlob,
            compositeUrl: cv.toDataURL('image/png'),
            maskUrl: mk.toDataURL('image/png'),
          };
        } catch { return null; }
      };
      return () => { if (window.__wrapRenderCanvas) delete window.__wrapRenderCanvas; };
    }, [carUrl, swatch ? swatch.id : null]);

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

        // render veil — the developing room
        h('div', { className: 'render-veil' + (rendering ? ' on' : '') },
          h('div', { className: 'render-card' },
            h('div', { className: 'rk' }, 'Studio render'),
            h('h3', null, 'Developing your studio shot'),
            h('p', null, 'Photographic lighting, floor reflection, your exact film. Usually 1–2 minutes.'),
            h('div', { className: 'render-bar' }, h('i', { style: { width: renderPct + '%' } })),
            h('div', { className: 'render-pct' }, Math.round(renderPct) + '%'))),

        // ── HUD ──
        h('div', { className: 'stage-hud' },
          // top-left: coverage chips
          carUrl ? h('div', { className: 'hud-tl' },
            h('div', { className: 'panel-chips' },
              panels.map((p) => {
                const cid = panelColors[p.key];
                const cs = cid ? window.WRAP_CATALOGUE.find((s) => s.id === cid) : null;
                return h('button', { key: p.key, className: 'pchip' + (activePanel === p.key ? ' on' : ''),
                  onClick: () => setActivePanel(p.key) },
                  cs ? h('span', { className: 'sw', style: { background: cs.hex } }) : null, p.label);
              }))) : null,

          // top-right: the one primary stage action
          carUrl ? h('div', { className: 'hud-tr' },
            h('button', { className: 'render-cta', disabled: rendering, onClick: startRender },
              h(I.Sparkle, { size: 15 }), renderUrl ? 'Re-render studio shot' : 'Studio render')) : null,

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

  // ── Exact-background guarantee ─────────────────────────────────────────────
  // The model regenerates the whole frame, so to make the studio bay
  // pixel-perfect we re-composite: original bay everywhere the mask is opaque,
  // model output only inside the editable (car + reflection) region. Soft mask
  // edges blend the two seamlessly.
  window.__wrapFinaliseRender = async (renderUrl, compositeUrl, maskUrl) => {
    try {
      const loadImg = (src) => new Promise((res, rej) => {
        const i = new Image(); i.crossOrigin = 'anonymous';
        i.onload = () => res(i); i.onerror = rej; i.src = src;
      });
      const [render, composite, mask] = await Promise.all([
        loadImg(renderUrl), loadImg(compositeUrl), loadImg(maskUrl),
      ]);
      const W = 1536, H = 1024;
      // restrict the model's output to the editable region
      const top = document.createElement('canvas');
      top.width = W; top.height = H;
      const tctx = top.getContext('2d');
      tctx.drawImage(render, 0, 0, W, H);
      tctx.globalCompositeOperation = 'destination-out';
      tctx.drawImage(mask, 0, 0, W, H); // removes output wherever the mask is opaque (locked)
      // exact bay + pre-composited car underneath
      const out = document.createElement('canvas');
      out.width = W; out.height = H;
      const octx = out.getContext('2d');
      octx.drawImage(composite, 0, 0, W, H);
      octx.drawImage(top, 0, 0);
      return out.toDataURL('image/png');
    } catch { return null; }
  };
})();
