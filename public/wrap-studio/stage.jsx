/**
 * WrapStage — canvas stage + photo upload/ingest + recolour fx layers
 *
 * Props:
 *   originalUrl  {string|null}          dataURL of raw resized photo (for before/after)
 *   carUrl       {string|null}          dataURL of bg-removed cutout PNG
 *   onIngest     {function}             called with { originalUrl, carUrl } when pipeline finishes
 *   activeSwatch {string|object|null}   hex string OR swatch object { hex, hex2?, finish }
 *   baActive     {boolean}              before/after slider active
 *   setBaActive  {function}             toggle before/after slider
 */

const IMGLY_CDN    = "https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.4.5/+esm";
const HEIC2ANY_CDN = "https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js";
const MAX_WIDTH    = 1920;

// ─── helper: lazy-load heic2any UMD (only when a .heic/.heif file is seen) ──
let _heicReady = null;
function loadHeic2Any() {
  if (window.heic2any) return Promise.resolve();
  if (_heicReady) return _heicReady;
  _heicReady = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src    = HEIC2ANY_CDN;
    s.onload  = () => resolve();
    s.onerror = () => reject(new Error("Failed to load HEIC converter"));
    document.head.appendChild(s);
  });
  return _heicReady;
}

// ─── helper: load @imgly lazily, store fn on window ─────────────────────────
async function loadImgly() {
  if (window.__imglyRemoveBackground) return window.__imglyRemoveBackground;
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.type  = "module";
    s.textContent = `
      import { removeBackground } from "${IMGLY_CDN}";
      window.__imglyRemoveBackground = removeBackground;
      window.dispatchEvent(new Event("__imgly_ready"));
    `;
    window.addEventListener("__imgly_ready", () => resolve(window.__imglyRemoveBackground), { once: true });
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

// ─── helper: resize blob via canvas, return { resizedBlob, dataUrl } ────────
async function resizeToCap(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objUrl);
      const scale  = img.width > MAX_WIDTH ? MAX_WIDTH / img.width : 1;
      const w      = Math.round(img.width  * scale);
      const h      = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width  = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error("Canvas toBlob failed"));
        const reader = new FileReader();
        reader.onload  = () => resolve({ resizedBlob: blob, dataUrl: reader.result });
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      }, "image/jpeg", 0.92);
    };
    img.onerror = () => { URL.revokeObjectURL(objUrl); reject(new Error("Image load failed")); };
    img.src = objUrl;
  });
}

// ─── helper: blob → dataURL ──────────────────────────────────────────────────
function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const r  = new FileReader();
    r.onload  = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

// ─── fxFor — maps swatch finish to recolour layer config ────────────────────
// sw: { hex, hex2?, finish } OR a plain hex string (treated as gloss)
function fxFor(sw) {
  if (!sw) return null;
  // Normalise plain-hex usage (legacy / simple app.jsx swatches)
  const c  = typeof sw === "string" ? sw : (sw.hex  || "#000");
  const c2 = typeof sw === "string" ? sw : (sw.hex2 || c);
  const finish = typeof sw === "string" ? "gloss" : (sw.finish || "gloss");

  switch (finish) {
    case "gloss":
      return { tint: { background: c, mixBlendMode: "color", opacity: .98 },
               sheen: { opacity: .34 }, tone: { opacity: .12 } };
    case "satin":
      return { tint: { background: c, mixBlendMode: "color", opacity: .96 },
               sheen: { opacity: .16 }, tone: { opacity: .16 } };
    case "matte":
      return { tint: { background: c, mixBlendMode: "color", opacity: 1 },
               sheen: { opacity: 0 }, tone: { opacity: .4 } };
    case "chrome":
      return { tint: { background: `linear-gradient(115deg,#fff 0%,${c} 22%,${c2} 48%,#fbfdff 64%,${c} 88%)`,
                       mixBlendMode: "hard-light", opacity: .95 }, anim: "anim-chrome",
               sheen: { opacity: .5 }, tone: { opacity: .1 } };
    case "shift":
      return { tint: { background: `linear-gradient(115deg,${c} 0%,${c2} 38%,${c} 70%,${c2} 100%)`,
                       mixBlendMode: "color", opacity: .96 }, anim: "anim-shift",
               sheen: { opacity: .26 }, tone: { opacity: .14 } };
    case "metallic":
      return { tint: { background: c, mixBlendMode: "color", opacity: .96 },
               sheen: { opacity: .22 }, tone: { opacity: .18 }, noise: true };
    case "carbon":
      return { tint: { background: c, mixBlendMode: "color", opacity: 1 },
               sheen: { opacity: .08 }, tone: { opacity: .38 } };
    case "ppf-clear":
      return { tint: { background: c, mixBlendMode: "color", opacity: .12 },
               sheen: { opacity: .42 }, tone: { opacity: 0 } };
    case "ppf-matte":
      return { tint: { background: c, mixBlendMode: "color", opacity: .18 },
               sheen: { opacity: 0 }, tone: { opacity: .34 } };
    default:
      return { tint: { background: c, mixBlendMode: "color", opacity: .96 },
               sheen: { opacity: .2 }, tone: { opacity: .14 } };
  }
}

// ─── WrapStage component ────────────────────────────────────────────────────
function WrapStage({ originalUrl, carUrl, onIngest, activeSwatch, baActive, setBaActive }) {
  const [ingestState, setIngestState] = React.useState("idle"); // idle | removing | error
  const [progress, setProgress]       = React.useState(0);
  const [lastFile, setLastFile]        = React.useState(null);
  const [baPos, setBaPos]              = React.useState(50); // 0–100 percent
  const fileInputRef                   = React.useRef(null);
  const stageRef                       = React.useRef(null);
  const draggingRef                    = React.useRef(false);

  // ── Before/after drag handlers ────────────────────────────────────────────
  function getPosFromEvent(e, el) {
    const rect = el.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    return Math.max(0, Math.min(100, pct));
  }

  function handleDividerMouseDown(e) {
    e.preventDefault();
    draggingRef.current = true;
  }

  function handleStageDrag(e) {
    if (!draggingRef.current || !stageRef.current) return;
    setBaPos(getPosFromEvent(e, stageRef.current));
  }

  function handleStageDragEnd() {
    draggingRef.current = false;
  }

  // ── 3-stage ingest pipeline ───────────────────────────────────────────────
  async function ingest(file) {
    if (!file) return;
    setLastFile(file);
    setIngestState("removing");
    setProgress(0);
    try {
      // Stage 1: HEIC → JPEG conversion (lazy-loads heic2any only when needed)
      const ext  = (file.name || "").split(".").pop().toLowerCase();
      const mime = file.type || "";
      const isHeic = ext === "heic" || ext === "heif" ||
                     mime === "image/heic" || mime === "image/heif";
      let processFile = file;
      if (isHeic) {
        await loadHeic2Any();
        const out = await window.heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
        processFile = Array.isArray(out) ? out[0] : out;
      }

      // Stage 2: pre-resize to 1920px via canvas → get resizedBlob + originalUrl
      const { resizedBlob, dataUrl: origDataUrl } = await resizeToCap(processFile);

      // Stage 3: lazy-load @imgly → removeBackground → carUrl dataURL
      const removeBackground = await loadImgly();
      const resultBlob = await removeBackground(resizedBlob, {
        progress: (key, current, total) => {
          if (total > 0) setProgress(Math.round((current / total) * 100));
        },
      });
      const cutoutDataUrl = await blobToDataUrl(resultBlob);

      setIngestState("idle");
      setProgress(100);
      onIngest?.({ originalUrl: origDataUrl, carUrl: cutoutDataUrl });
    } catch (err) {
      console.error("[WrapStage] ingest error", err);
      setIngestState("error");
    }
  }

  // ── File input handlers ───────────────────────────────────────────────────
  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (file) ingest(file);
    e.target.value = "";
  }

  function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove("drag-over");
    const file = e.dataTransfer.files?.[0];
    if (file) ingest(file);
  }

  function handleDragOver(e) { e.preventDefault(); e.currentTarget.classList.add("drag-over"); }
  function handleDragLeave(e) { e.currentTarget.classList.remove("drag-over"); }
  function handleRetry() { if (lastFile) ingest(lastFile); }

  // ── Render: uploading / progress / error / stage ─────────────────────────
  if (ingestState === "removing") {
    return (
      <div className="removal-progress">
        <div className="removal-label">Removing background…</div>
        <div className="removal-bar">
          <div className="removal-bar-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="removal-pct">{progress}%</div>
      </div>
    );
  }

  if (ingestState === "error") {
    return (
      <div className="removal-error">
        <div className="re-icon">⚠</div>
        <div className="re-msg">Background removal failed. Check your connection and try again.</div>
        <button className="re-retry" onClick={handleRetry}>Try again</button>
      </div>
    );
  }

  if (carUrl) {
    const fx = fxFor(activeSwatch);
    // Mask / clip: use the car image as a CSS mask so fx layers only paint the car silhouette
    const maskStyle = {
      position: "absolute", inset: 0,
      WebkitMaskImage: `url(${carUrl})`,
      maskImage: `url(${carUrl})`,
      WebkitMaskSize: "contain",
      maskSize: "contain",
      WebkitMaskRepeat: "no-repeat",
      maskRepeat: "no-repeat",
      WebkitMaskPosition: "center",
      maskPosition: "center",
    };
    // Clip: when BA slider is active, clamp layers to the right (wrapped) side
    const clip = baActive
      ? { clipPath: `inset(0 ${100 - baPos}% 0 0)` }
      : {};

    const colored = Boolean(activeSwatch && fx);

    return (
      <div
        className="ws-stage"
        ref={stageRef}
        onMouseMove={handleStageDrag}
        onMouseUp={handleStageDragEnd}
        onMouseLeave={handleStageDragEnd}
        onTouchMove={handleStageDrag}
        onTouchEnd={handleStageDragEnd}
      >
        {/* SVG noise filter — hidden, referenced by metallic tint via url(#metallic-noise) */}
        <svg style={{ position: "absolute", width: 0, height: 0 }} aria-hidden="true">
          <defs>
            <filter id="metallic-noise" x="0%" y="0%" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="4" seed="2" result="noise" />
              <feColorMatrix type="saturate" values="0" in="noise" result="grey" />
              <feBlend in="SourceGraphic" in2="grey" mode="multiply" result="blended" />
              <feComponentTransfer>
                <feFuncA type="linear" slope="1" />
              </feComponentTransfer>
            </filter>
          </defs>
        </svg>

        {/* Original photo — unclipped, z-index 0 — reveals on the "before" (left) side */}
        {originalUrl && (
          <img
            className="car-base car-base--original"
            src={originalUrl}
            alt="Original car"
          />
        )}

        {/* Cutout car image — clipped to wrapped (right) side when BA active */}
        <img
          className="car-base"
          src={carUrl}
          alt="Your car"
          style={{
            ...clip,
            width: "100%", height: "100%", objectFit: "contain",
            display: "block", position: "relative", zIndex: 1,
          }}
        />

        {/* Recolour fx layers — painted over the car using CSS mask, clipped to right side when BA active */}
        {fx && (
          <>
            {/* Tone layer — luminance base correction */}
            <div
              className="car-fx car-tone"
              style={{
                ...maskStyle,
                ...clip,
                background: "rgba(0,0,0,1)",
                mixBlendMode: "luminosity",
                ...fx.tone,
                zIndex: 2,
              }}
            />
            {/* Tint layer — colour blend; metallic uses SVG noise filter */}
            <div
              className="car-fx car-tint"
              style={{
                ...maskStyle,
                ...clip,
                ...fx.tint,
                filter: fx.noise ? "url(#metallic-noise)" : undefined,
                zIndex: 3,
              }}
            />
            {/* Sheen layer — specular highlight */}
            <div
              className="car-fx car-sheen"
              style={{
                ...maskStyle,
                ...clip,
                background: "linear-gradient(135deg, rgba(255,255,255,.55) 0%, transparent 55%)",
                mixBlendMode: "screen",
                ...fx.sheen,
                zIndex: 4,
              }}
            />
          </>
        )}

        {/* Before/after divider + drag handle */}
        {baActive && colored && (
          <>
            <div
              className="ba-divider"
              style={{ left: `${baPos}%` }}
              onMouseDown={handleDividerMouseDown}
              onTouchStart={handleDividerMouseDown}
            >
              <div className="ba-knob" />
            </div>
            <span className="ba-tag ba-tag--before" style={{ right: `${100 - baPos}%` }}>Original</span>
            <span className="ba-tag ba-tag--after"  style={{ left: `${baPos}%` }}>Wrapped</span>
          </>
        )}

        {/* HUD — bottom-right controls */}
        <div className="stage-hud">
          {/* Replace photo */}
          <label className="pill-btn" title="Replace car photo" style={{ cursor: "pointer" }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.heic,.heif"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
            Replace
          </label>
          {/* Compare — disabled until originalUrl is set */}
          <button
            className={"pill-btn" + (baActive ? " on" : "")}
            title="Before / after"
            aria-label="Toggle before/after comparison"
            style={originalUrl ? null : { opacity: 0.4, cursor: "default", pointerEvents: "none" }}
            onClick={() => { if (originalUrl) setBaActive(!baActive); }}
          >
            Compare
          </button>
        </div>
      </div>
    );
  }

  // Idle upload zone
  return (
    <div
      className="ph-upload"
      onClick={() => fileInputRef.current?.click()}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.heic,.heif"
        onChange={handleFileChange}
      />
      <div className="ph-upload-label">
        <strong>Tap to upload</strong> or drag a photo here
        <br />
        JPEG · PNG · HEIC · up to any size
      </div>
    </div>
  );
}

// Export for use from app.jsx
window.WrapStage = WrapStage;
