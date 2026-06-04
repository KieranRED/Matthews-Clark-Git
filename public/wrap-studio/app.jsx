/**
 * WrapStudio App — top-level state manager
 *
 * State:
 *   originalUrl  {string|null}  dataURL of raw resized photo (before bg removal)
 *   carUrl       {string|null}  dataURL of background-removed cutout PNG
 *   activeSwatch {string|null}  currently selected background colour (hex)
 *
 * Persistence: localStorage "ws_state" (quota-safe — drops large dataURLs on overflow)
 */

const LS_KEY = "ws_state";

const SWATCHES = [
  "#1a1a1a", "#2c2c2c", "#ffffff", "#f5f5f0",
  "#1f4fff", "#0f2080", "#ff3b3b", "#c0392b",
  "#27ae60", "#16a085", "#f39c12", "#8e44ad",
  "#e8d5b7", "#c4a882", "#2ecc71", "#e74c3c",
];

// ─── Quota-safe localStorage write ──────────────────────────────────────────
function safePersist(data) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch (e) {
    if (e instanceof DOMException && e.name === "QuotaExceededError") {
      // Save everything EXCEPT large dataURLs
      const slim = { ...data, originalUrl: null, carUrl: null };
      try { localStorage.setItem(LS_KEY, JSON.stringify(slim)); } catch { /* ignore */ }
    }
  }
}

// ─── Load persisted state ────────────────────────────────────────────────────
function loadPersistedState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
}

// ─── App component ────────────────────────────────────────────────────────────
function WrapStudioApp() {
  const persisted = React.useMemo(loadPersistedState, []);

  const [originalUrl,  setOriginalUrl]  = React.useState(persisted.originalUrl  ?? null);
  const [carUrl,       setCarUrl]       = React.useState(persisted.carUrl       ?? null);
  const [activeSwatch, setActiveSwatch] = React.useState(persisted.activeSwatch ?? SWATCHES[0]);

  // ── Persist on state change ───────────────────────────────────────────────
  React.useEffect(() => {
    safePersist({ originalUrl, carUrl, activeSwatch });
  }, [originalUrl, carUrl, activeSwatch]);

  // ── Ingest callback from WrapStage ────────────────────────────────────────
  function handleIngest({ originalUrl: orig, carUrl: car }) {
    setOriginalUrl(orig);
    setCarUrl(car);
  }

  // ── Reset ─────────────────────────────────────────────────────────────────
  function handleReset() {
    setOriginalUrl(null);
    setCarUrl(null);
    setActiveSwatch(SWATCHES[0]);
    try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
  }

  const hasPhoto = Boolean(carUrl);

  return (
    <div id="ws-root">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--fg-2)" }}>
          Wrap Studio
        </div>
        {hasPhoto && (
          <button className="ws-btn" onClick={handleReset}>
            Reset
          </button>
        )}
      </div>

      {/* Stage */}
      <WrapStage
        originalUrl={originalUrl}
        carUrl={carUrl}
        onIngest={handleIngest}
        activeSwatch={activeSwatch}
      />

      {/* Colour picker */}
      {hasPhoto && (
        <div className="ws-section">
          <div className="ws-section-label">Background colour</div>
          <div className="ws-swatches">
            {/* "My background" — restored from originalUrl */}
            {originalUrl && (
              <img
                className={"ws-swatch" + (activeSwatch === "__original__" ? " active" : "")}
                src={originalUrl}
                title="My background (original photo)"
                style={{ objectFit: "cover" }}
                onClick={() => setActiveSwatch("__original__")}
                alt="Original background"
              />
            )}
            {SWATCHES.map((hex) => (
              <div
                key={hex}
                className={"ws-swatch" + (activeSwatch === hex ? " active" : "")}
                style={{ background: hex }}
                title={hex}
                onClick={() => setActiveSwatch(hex)}
              />
            ))}
            {/* Custom colour input */}
            <label
              className="ws-swatch"
              title="Custom colour"
              style={{
                background: "conic-gradient(red,yellow,lime,cyan,blue,magenta,red)",
                cursor: "pointer",
                position: "relative",
              }}
            >
              <input
                type="color"
                style={{ position: "absolute", inset: 0, opacity: 0, width: "100%", height: "100%", cursor: "pointer" }}
                onInput={(e) => setActiveSwatch(e.target.value)}
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Bootstrap ───────────────────────────────────────────────────────────────
const root = ReactDOM.createRoot(document.getElementById("ws-app"));
root.render(React.createElement(WrapStudioApp));
