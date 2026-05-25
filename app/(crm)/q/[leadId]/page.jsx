import { getLead } from "@/lib/leadStore";
import { verifyToken } from "@/lib/linkToken";

import QuoteForm from "./quote-form";
import styles from "./quote.module.css";

export const metadata = {
  title: "M&C — Quote"
};

const SERVICE_LABELS = {
  ppf: "PPF", wrap: "Wrap", tint: "Tint", ceramic: "Ceramic / Graphene",
  correct: "Paint Correction", detail: "Detail", wheel: "Wheels",
  kit: "Bodykit", starlight: "Starlight Headliner", interior: "Custom Interiors", unsure: "Not sure"
};

function serviceLabel(id) {
  return SERVICE_LABELS[String(id || "")] || String(id || "");
}

export default async function QuotePage({ params, searchParams }) {
  const leadId = params.leadId;
  const token = searchParams?.t || "";

  const secret = process.env.LEAD_LINK_SECRET;
  const valid = secret ? verifyToken({ secret, leadId, token }) : false;
  const lead = valid ? await getLead(leadId) : null;
  const services = Array.isArray(lead?.services) ? lead.services.filter((s) => s && s !== "unsure") : [];

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.eyebrow}>MATTHEWS &amp; CLARK</div>
        <h1 className={styles.title}>Enter Quote</h1>
        <p className={styles.sub}>
          Lead <span className={styles.mono}>{leadId}</span>
        </p>
        {!valid ? (
          <p className={styles.sub} style={{ color: "rgba(255,110,110,.9)" }}>
            Invalid or expired link. Ask Matthews &amp; Clark for a new one.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16, padding: "14px 16px", borderRadius: 12, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)" }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "rgba(255,255,255,.4)", marginBottom: 4 }}>
              Job brief
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: ".01em" }}>
              {lead?.car || "Vehicle not specified"}
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.55)" }}>
              {lead?.name || "—"} · {lead?.number || "—"}
            </div>
            <div style={{ marginTop: 4, display: "flex", flexWrap: "wrap", gap: 6 }}>
              {services.map((s) => (
                <span key={s} style={{ padding: "4px 10px", borderRadius: 999, background: "rgba(31,79,255,.18)", border: "1px solid rgba(31,79,255,.35)", fontSize: 11, fontWeight: 700, color: "#fff", letterSpacing: ".04em" }}>
                  {serviceLabel(s)}
                </span>
              ))}
            </div>
            {lead?.timeframe && (
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(255,255,255,.4)", marginTop: 2 }}>
                Timing: {lead.timeframe.replace(/-/g, " ")}
              </div>
            )}
          </div>
        )}
        {valid ? <QuoteForm leadId={leadId} token={token} lead={lead || null} /> : null}
      </div>
    </main>
  );
}
