"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const SERVICE_LABELS = {
  ppf: "PPF",
  wrap: "Wrap",
  tint: "Tint",
  ceramic: "Ceramic / Graphene",
  correct: "Paint correction",
  pc_street_gloss: "Paint correction - Street Gloss",
  pc_bronze: "Paint correction - Bronze",
  pc_silver: "Paint correction - Silver",
  pc_gold: "Paint correction - Gold",
  pc_diamond: "Paint correction - Diamond",
  detail: "Detail",
  wheel: "Wheels (Powder / Refurb)",
  kit: "Bodykit"
};

function serviceLabel(id) {
  const key = String(id || "");
  return SERVICE_LABELS[key] || key;
}

function labelFor(map, value) {
  const key = value == null ? "" : String(value);
  return map && Object.prototype.hasOwnProperty.call(map, key) ? map[key] : key;
}

function yesNo(v) {
  return v ? "Yes" : "No";
}

function compactParts(list) {
  if (!Array.isArray(list) || !list.length) return "";
  return list.map((v) => String(v)).filter(Boolean).join(", ");
}

function niceTitle(s) {
  return String(s || "").trim();
}

function briefBullets(input) {
  return String(input || "")
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^[-*•]\s*/, ""))
    .filter(Boolean);
}

function serviceInvoiceContent(serviceDetails, sid) {
  const d = serviceDetails?.[sid] || null;
  if (!d || typeof d !== "object") {
    return { title: serviceLabel(sid), bullets: ["Scope confirmed on inspection and handover."] };
  }

  const bullets = [];

  if (sid === "ppf") {
    const coverage = labelFor({ "full-front": "Full front", "track-pack": "Track pack", full: "Full car", custom: "Custom panels" }, d.coverage);
    const film = labelFor({ clear: "Clear PPF", stealth: "Stealth (matte) PPF", colour: "Colour PPF", carbon: "Carbon / forged look" }, d.film);
    bullets.push("Vehicle is decontaminated (wash, clay) and panels are panel-wiped before install.");
    bullets.push("Light paint refinement where needed to ensure best finish under the film.");
    if (d.coverage === "custom") {
      const panels = compactParts(d.panels);
      bullets.push(`Install ${film} on custom selected panels${panels ? `: ${panels}` : "."}`);
    } else {
      bullets.push(`Install ${film} on ${coverage}.`);
    }
    if (d.doorJambs) bullets.push("Door jambs protected in PPF for full edge-to-edge coverage where applicable.");
    if (d.film === "clear") bullets.push("Clear PPF keeps the original colour visible while adding impact + stone-chip protection.");
    if (d.film === "stealth") bullets.push("Stealth PPF provides a smooth satin finish while protecting paint from chips and swirls.");
    if (d.film === "colour") bullets.push("Colour PPF adds a tinted finish with the same protection benefits as PPF.");
    if (d.film === "carbon") bullets.push("Carbon / forged finish panels are aligned for consistent weave direction and symmetry.");
    if (d.notes) bullets.push(`Notes: ${String(d.notes)}`);
    return { title: "Paint Protection Film (PPF)", bullets };
  }

  if (sid === "wrap") {
    const scope = labelFor({ full: "Full wrap", partial: "Partial / accents", custom: "Custom panels" }, d.scope);
    const finish = d.finish ? labelFor({ gloss: "Gloss", satin: "Satin", matte: "Matte" }, d.finish) : null;
    bullets.push("Surfaces are cleaned, decontaminated, and prepped for adhesion (panel wipe + edge prep).");
    bullets.push(`Vinyl wrap applied as: ${scope}${finish ? ` · ${finish}` : ""}.`);
    const wrapParts = compactParts(d.parts);
    if (wrapParts) bullets.push(`Parts wrapped: ${wrapParts}.`);
    const panels = compactParts(d.panels);
    if (panels) bullets.push(`Panels wrapped: ${panels}.`);
    if (String(d.scope || "") === "full" && d.doorJambs) bullets.push("Door jambs included for a full colour-change look.");
    if (d.colour) bullets.push(`Colour/finish selected: ${String(d.colour)}.`);
    bullets.push("Post-heated, trimmed, and inspected for clean lines and long-term durability.");
    if (d.notes) bullets.push(`Notes: ${String(d.notes)}`);
    return { title: "Vehicle Wrap", bullets };
  }

  if (sid === "tint") {
    const windows = labelFor({ "front-2": "Front 2 windows", "rear-3": "Rear set", all: "All windows" }, d.windows);
    const shade = d.shade ? `${d.shade}%` : "—";
    bullets.push("Glass is cleaned and prepped to prevent contamination and ensure a flawless finish.");
    bullets.push(`Tint applied to: ${windows}.`);
    bullets.push(`Shade: ${shade}.`);
    bullets.push("Heat-formed and edge-finished for a clean OEM look.");
    if (d.notes) bullets.push(`Notes: ${String(d.notes)}`);
    return { title: "Window Tint", bullets };
  }

  if (sid === "ceramic") {
    const pkg = labelFor({ "2y": "2 Year", "5y": "5 Year", "10y": "10 Year" }, d.package);
    bullets.push("Decontamination wash + iron removal + panel wipe prior to coating application.");
    bullets.push(`Ceramic / graphene coating package: ${pkg}.`);
    const extras = [];
    if (d.wheels) extras.push("wheels");
    if (d.glass) extras.push("glass");
    if (d.trim) extras.push("trim");
    if (extras.length) bullets.push(`Additional coated areas: ${extras.join(", ")}.`);
    bullets.push("Cured and quality-checked for hydrophobic performance and gloss.");
    if (d.notes) bullets.push(`Notes: ${String(d.notes)}`);
    return { title: "Ceramic / Graphene Coating", bullets };
  }

  if (sid === "correct") {
    const stage = labelFor({ stage1: "Stage 1", stage2: "Stage 2", stage3: "Stage 3" }, d.stage);
    bullets.push("Paint is inspected under proper lighting to identify swirls, haze and defects.");
    bullets.push(`Machine polish: ${stage} correction to improve clarity and gloss.`);
    bullets.push("Finish refined and wiped down to ensure true results (no fillers).");
    if (d.notes) bullets.push(`Notes: ${String(d.notes)}`);
    return { title: "Paint Correction", bullets };
  }

  if (String(sid).startsWith("pc_")) {
    const packageName = d.packageName || serviceLabel(sid).replace(/^Paint correction - /i, "");
    bullets.push("Paint is inspected under proper lighting before correction begins.");
    if (d.protection) bullets.push(`Protection: ${String(d.protection)}.`);
    if (d.durationDays) bullets.push(`Estimated workshop time: ${String(d.durationDays)} ${Number(d.durationDays) === 1 ? "day" : "days"}.`);
    if (d.ceramic) bullets.push("Ceramic protection is included or selected for this package.");
    bullets.push("Final correction depth is subject to paint thickness, clear-coat condition and defect severity.");
    if (d.notes) bullets.push(`Notes: ${String(d.notes)}`);
    return { title: `Paint Correction — ${niceTitle(packageName)}`, bullets };
  }

  if (sid === "detail") {
    const kind = labelFor({ full: "Full detail", interior: "Interior only", exterior: "Exterior only", sale: "Sale prep" }, d.kind);
    bullets.push(`Detail type: ${kind}.`);
    bullets.push("Deep clean with safe chemicals and tools to protect surfaces and finishes.");
    bullets.push("Final inspection and dressings applied for a crisp, showroom look.");
    if (d.notes) bullets.push(`Notes: ${String(d.notes)}`);
    return { title: "Detailing", bullets };
  }

  if (sid === "wheel") {
    const service = labelFor({ powder: "Powder coating", refurb: "Refurb / repair" }, d.service);
    const finish = labelFor({ gloss: "Gloss", satin: "Satin", matte: "Matte" }, d.finish);
    bullets.push("Wheels are removed and inspected for curb rash / damage before work begins.");
    if (d.service === "powder") {
      bullets.push("Old coating stripped, wheels prepped, coated and oven-baked for a durable finish.");
    } else {
      bullets.push("Refurb/repair performed (curb rash correction and surface prep) before finishing.");
    }
    bullets.push(`Finish: ${finish}${d.colour ? ` · Colour: ${String(d.colour)}` : ""}.`);
    bullets.push("Reinstalled and torqued to spec (balancing/alignment handled as needed).");
    if (d.notes) bullets.push(`Notes: ${String(d.notes)}`);
    return { title: `Wheels — ${niceTitle(service)}`, bullets };
  }

  if (d.notes) bullets.push(`Notes: ${String(d.notes)}`);
  if (!bullets.length) bullets.push("Scope confirmed on inspection and handover.");
  return { title: serviceLabel(sid), bullets };
}

function moneyZAR(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(isoLike) {
  if (!isoLike) return "—";
  const d = new Date(String(isoLike));
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
}

export default function InvoiceClient({ model }) {
  const previewRef = useRef(null);
  const ranRef = useRef(false);
  const [state, setState] = useState({ kind: "idle", message: "" });

  const issuedIso = model?.createdAt || new Date().toISOString();
  const dueIso = useMemo(() => {
    const issued = new Date(String(issuedIso));
    if (Number.isNaN(issued.getTime())) return new Date().toISOString();
    const due = new Date(issued);
    // Payment due: 7 days from invoice date.
    due.setDate(due.getDate() + 7);
    return due.toISOString();
  }, [issuedIso]);

  const invoiceNo = String(model?.invoiceNo || "00000").replace(/[^\d]/g, "").slice(-5).padStart(5, "0") || "00000";
  const invNoDisplay = String(model?.invoiceNumberDisplay || "").trim() || `MC_${invoiceNo}`;
  const invRef = String(model?.invoiceRef || "").trim() || invNoDisplay;
  const isPaid = String(model?.status || "due") === "paid";

  const lineItems = useMemo(() => {
    const rows = Array.isArray(model?.lines) ? model.lines : [];
    const details = model?.serviceDetails && typeof model.serviceDetails === "object" ? model.serviceDetails : null;
    return rows
      .map((ln) => {
        if (ln?.kind === "one_off" || ln?.kind === "custom_service" || ln?.kind === "upsell") {
          const amt = Number(ln?.clientEx ?? 0);
          if (!Number.isFinite(amt) || amt <= 0) return null;
          const bullets = [];
          bullets.push(...briefBullets(ln.notes));
          if (!bullets.length) {
            bullets.push(ln?.kind === "upsell" ? "Additional scope confirmed by Matthews & Clark." : "Custom scope confirmed by Matthews & Clark.");
          }
          return { sid: String(ln?.sid || "custom_service"), title: String(ln?.label || "One-off service"), bullets, amt };
        }
        const sid = String(ln?.sid || "");
        const content = serviceInvoiceContent(details, sid);
        const amt = Number(ln?.clientEx ?? 0);
        if (!Number.isFinite(amt) || amt <= 0) return null;
        return { sid, title: content.title, bullets: Array.isArray(content.bullets) ? content.bullets : [], amt };
      })
      .filter(Boolean);
  }, [model?.lines, model?.serviceDetails]);

  const total = useMemo(() => {
    if (Number.isFinite(Number(model?.clientTotalExVat))) return Number(model.clientTotalExVat);
    return lineItems.reduce((s, l) => s + Number(l.amt || 0), 0);
  }, [model?.clientTotalExVat, lineItems]);

  // Default payment terms: 60% upfront, 40% on completion.
  const depositPct = 60;
  const deposit = useMemo(() => Math.round(Number(total || 0) * (depositPct / 100)), [total]);
  const balance = useMemo(() => Math.max(0, Number(total || 0) - Number(deposit || 0)), [total, deposit]);

  const fileName = useMemo(() => {
    const client = String(model?.client?.name || "Client").trim();
    const safeClient = client.replace(/[\\/:*?\"<>|]+/g, "").slice(0, 60) || "Client";
    const safeNum = invRef.replace(/[\\/:*?\"<>|]+/g, "");
    return `M&C · ${safeClient}${safeNum ? ` · ${safeNum}` : ""}.pdf`;
  }, [model?.client?.name, invRef]);

  const addressLines = useMemo(() => {
    const raw = String(model?.client?.address || "").trim();
    if (!raw) return [];
    return raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 5);
  }, [model?.client?.address]);

  async function downloadNow() {
    const preview = previewRef.current;
    if (!preview) throw new Error("Invoice not ready yet.");

    // Ensure CSS has applied before rasterizing, otherwise the PDF can capture fallback styles.
    const waitForCss = async () => {
      const maxMs = 2500;
      const start = Date.now();
      while (Date.now() - start < maxMs) {
          const probe = preview.querySelector(".inv-svc-bullet") || preview.querySelector(".inv-validity-text");
          if (probe) {
            const cs = window.getComputedStyle(probe);
            const fontSize = Number.parseFloat(cs.fontSize || "0");
            const fam = String(cs.fontFamily || "").toLowerCase();
            // We expect 10px body styling here (Inter Tight / sans fallback).
            if (fontSize <= 10.1 && (fam.includes("inter") || fam.includes("system-ui") || fam.includes("sans"))) return;
          }
        await new Promise((r) => setTimeout(r, 60));
      }
    };

    // Wait for fonts to load to avoid layout drift in the PDF render.
    try {
      if (document?.fonts?.ready) await document.fonts.ready;
    } catch {
      // ignore
    }
    await waitForCss();
    await new Promise((r) => setTimeout(r, 120));

    const [{ default: html2canvas }, jspdf] = await Promise.all([import("html2canvas"), import("jspdf")]);
    const { jsPDF } = jspdf;

    const canvas = await html2canvas(preview, {
      backgroundColor: "#050505",
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false
    });

    const imgData = canvas.toDataURL("image/png");

    // PDF dimensions match the rendered content exactly — no A4 clipping.
    const pdfW = 210; // mm
    const pdfH = Math.round((canvas.height / canvas.width) * pdfW);

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: [pdfW, pdfH] });
    pdf.addImage(imgData, "PNG", 0, 0, pdfW, pdfH);
    pdf.save(fileName);
  }

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;
    setState({ kind: "loading", message: "Preparing invoice download…" });
    downloadNow()
      .then(() => setState({ kind: "done", message: "Downloaded. You can close this page." }))
      .catch((err) => setState({ kind: "error", message: err instanceof Error ? err.message : "Failed to download invoice." }));
  }, []);

  return (
    <main className="inv-download">
      <div className="inv-download-card">
        <div className="inv-download-title">Invoice</div>
        <div className="inv-download-sub">{state.message || "Preparing…"}</div>
        {state.kind === "error" ? (
          <button type="button" className="inv-download-btn" onClick={() => downloadNow().catch(() => null)}>
            Download again
          </button>
        ) : null}
      </div>

      {/* Hidden/off-screen render target used for HTML → Canvas → PDF.
          Must remain visible (not display:none) so html2canvas can render it. */}
      <div style={{ position: "fixed", left: -10000, top: 0, width: 794, zIndex: -1 }}>
        <div className="preview" ref={previewRef} style={{ width: 794, padding: "40px 44px 56px" }}>
          <div className="inv-masthead">
            <div className="inv-from">
              <img
                src="/brand/mc-logo.png"
                alt="M&C"
                crossOrigin="anonymous"
                style={{ height: 52, width: "auto", objectFit: "contain", display: "block" }}
              />
              <div className="inv-from-meta">
                <div className="inv-from-name">MATTHEWS &amp; CLARK</div>
                <div className="inv-from-line">Concierge auto styling</div>
                <div className="inv-from-line">3 Muir Road · Woodstock · Cape Town 8001</div>
                <div className="inv-from-line">+27 82 847 7701</div>
              </div>
            </div>
              <div className="inv-stamp">
                <div className="inv-stamp-tag">INVOICE</div>
              <div className="inv-stamp-num">{invNoDisplay}</div>
              <div className={"inv-stamp-status " + (isPaid ? "status-paid" : "status-due")}>{isPaid ? "PAID" : "BALANCE DUE"}</div>
            </div>
          </div>

          <div className="inv-meta">
            <div>
              <span>Issued</span>
              <b>{fmtDate(issuedIso)}</b>
            </div>
            <div>
              <span>Due</span>
              <b>{fmtDate(dueIso)}</b>
            </div>
            <div>
              <span>Invoice No.</span>
              <b>{invNoDisplay}</b>
            </div>
            <div>
              <span>Ref</span>
              <b>{invRef}</b>
            </div>
          </div>

          <div className="inv-parties">
            <div>
              <div className="inv-eyebrow">BILL TO</div>
              <div className="inv-party-name">{String(model?.client?.name || "Client Name")}</div>
              {model?.client?.email ? <div className="inv-party-line">{String(model.client.email)}</div> : null}
              {model?.client?.phone ? <div className="inv-party-line">{String(model.client.phone)}</div> : null}
              {addressLines.length ? (
                <div style={{ marginTop: 8 }}>
                  {addressLines.map((ln, i) => (
                    <div className="inv-party-line" key={i}>
                      {ln}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            <div>
              <div className="inv-eyebrow">VEHICLE</div>
              <div className="inv-party-name">{String(model?.vehicle || "—")}</div>
              <div className="inv-party-line" style={{ opacity: 0.5, fontStyle: "italic" }}>
                VIN to be recorded on collection
              </div>
            </div>
          </div>

          <div className="inv-eyebrow inv-eyebrow--big">WORK PERFORMED</div>
          <div className="inv-table">
            <div className="inv-tr inv-th">
              <div>Service</div>
              <div className="r">Qty</div>
              <div className="r">Amount</div>
            </div>
            {lineItems.length ? (
              lineItems.map((l, i) => (
                <div className="inv-tr" key={i}>
                  <div>
                    <div className="inv-svc">{l.title}</div>
                    {l.bullets?.length ? (
                      <div className="inv-svc-bullets">
                        {l.bullets.slice(0, 6).map((b, bi) => (
                          <div className="inv-svc-bullet" key={bi}>
                            • {b}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="r tab">1</div>
                  <div className="r tab strong">{moneyZAR(l.amt)}</div>
                </div>
              ))
            ) : (
              <div className="inv-tr">
                <div className="inv-svc" style={{ opacity: 0.35 }}>
                  No line items
                </div>
                <div className="r tab">—</div>
                <div className="r tab">—</div>
              </div>
            )}
          </div>

          <div className="inv-totals">
            <div className="inv-totals-rows">
              <div className="row total">
                <span>Total</span>
                <span>{moneyZAR(total)}</span>
              </div>
              <div className="row">
                <span>Deposit due ({depositPct}%)</span>
                <span>{moneyZAR(deposit)}</span>
              </div>
              <div className="row">
                <span>Balance on completion</span>
                <span>{moneyZAR(balance)}</span>
              </div>
            </div>
            <div className={"inv-balance " + (isPaid ? "paid" : "due")}>
              <div className="inv-balance-lbl">{isPaid ? "PAID IN FULL" : "DEPOSIT DUE"}</div>
              <div className="inv-balance-val">{moneyZAR(isPaid ? 0 : deposit)}</div>
              {!isPaid ? <div className="inv-balance-when">By {fmtDate(dueIso)}</div> : null}
              {!isPaid ? <div className="inv-balance-when" style={{ opacity: 0.7 }}>60% upfront · 40% on completion</div> : null}
            </div>
          </div>

          <div className="inv-validity">
            <svg className="inv-validity-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            <div className="inv-validity-text">
              This invoice is valid for <b>7 DAYS</b> from the date of issue
            </div>
          </div>

          <div className="inv-payment">
            <div className="inv-eyebrow">PAYMENT</div>
            <div className="inv-pay-grid">
              <div>
                <span>Bank</span>
                <b>{String(model?.bank?.name || "FNB")}</b>
              </div>
              <div>
                <span>Account holder</span>
                <b>{String(model?.bank?.holder || "Keanan Matthews")}</b>
              </div>
              <div>
                <span>Account type</span>
                <b>{String(model?.bank?.type || "FNBy Next Transact Account")}</b>
              </div>
              <div>
                <span>Account number</span>
                <b>{String(model?.bank?.number || "62883053086")}</b>
              </div>
              <div>
                <span>Branch code</span>
                <b>{String(model?.bank?.branch || "250655")}</b>
              </div>
              <div>
                <span>Reference</span>
                <b>{invRef}</b>
              </div>
            </div>
          </div>

          <div className="inv-partner">
            <div className="inv-eyebrow">YOUR PARTNER</div>
            <div className="inv-partner-row">
              <div className="inv-partner-meta">
                Your dedicated contact at Matthews &amp; Clark is <b>Keanan Matthew</b>
                <br />
                +27 82 847 7701
              </div>
            </div>
          </div>

          <div className="inv-footer-rule">
            <span>MATTHEWS &amp; CLARK</span>
            <span className="dot" />
            <span>CAPE TOWN</span>
          </div>
        </div>
      </div>
    </main>
  );
}
