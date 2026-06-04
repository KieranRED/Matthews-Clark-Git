/**
 * WrapStage — canvas stage + photo upload/ingest
 *
 * Props:
 *   originalUrl  {string|null}  dataURL of raw resized photo (for before/after)
 *   carUrl       {string|null}  dataURL of bg-removed cutout PNG
 *   onIngest     {function}     called with { originalUrl, carUrl } when pipeline finishes
 *   activeSwatch {string|null}  hex colour for background fill
 */

const IMGLY_CDN = "https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.4.5/+esm";
const MAX_WIDTH  = 1920;

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

// ─── WrapStage component ────────────────────────────────────────────────────
function WrapStage({ originalUrl, carUrl, onIngest, activeSwatch }) {
  const [ingestState, setIngestState] = React.useState("idle"); // idle | removing | error
  const [progress, setProgress]       = React.useState(0);
  const [lastFile, setLastFile]        = React.useState(null);
  const canvasRef                      = React.useRef(null);
  const fileInputRef                   = React.useRef(null);

  // ── Render composite when carUrl / activeSwatch changes ──────────────────
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !carUrl) return;
    const ctx = canvas.getContext("2d");
    const car = new Image();
    car.onload = () => {
      canvas.width  = car.naturalWidth;
      canvas.height = car.naturalHeight;
      if (activeSwatch) {
        ctx.fillStyle = activeSwatch;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(car, 0, 0);
    };
    car.src = carUrl;
  }, [carUrl, activeSwatch]);

  // ── 3-stage ingest pipeline ───────────────────────────────────────────────
  async function ingest(file) {
    if (!file) return;
    setLastFile(file);
    setIngestState("removing");
    setProgress(0);
    try {
      // Stage 1 (HEIC placeholder): future Plan 02 handles HEIC→JPEG conversion.
      // For now, if HEIC is detected we still pass the file through — it may
      // fail at the resize step on unsupported browsers, surfacing a friendly error.

      // Stage 2: pre-resize to 1920px via canvas → get resizedBlob + originalUrl
      const { resizedBlob, dataUrl: origDataUrl } = await resizeToCap(file);

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

  // ── Render: uploading / progress / error / canvas ────────────────────────
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
    return (
      <div className="ws-stage">
        <canvas ref={canvasRef} />
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
