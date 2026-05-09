import { getLead } from "@/lib/leadStore";
import { verifyToken } from "@/lib/linkToken";

import QuoteForm from "./quote-form";
import styles from "./quote.module.css";

export const metadata = {
  title: "M&C — Quote"
};

const SERVICE_LABELS = {
  ppf: "PPF",
  wrap: "Wrap",
  tint: "Tint",
  ceramic: "Ceramic / Graphene",
  correct: "Paint correction",
  detail: "Detail",
  wheel: "Wheels (Powder / Refurb)",
  kit: "Bodykit",
  unsure: "Not sure"
};

function serviceLabel(id) {
  const key = String(id || "");
  return SERVICE_LABELS[key] || key;
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
            Invalid link token. Ask Matthews &amp; Clark for a new link.
          </p>
        ) : (
          <div style={{ display: "grid", gap: 8, marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.65)" }}>
              <b style={{ color: "#fff" }}>Car:</b> {lead?.car || "—"}
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.65)" }}>
              <b style={{ color: "#fff" }}>Services:</b> {services.length ? services.map(serviceLabel).join(" · ") : "—"}
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.65)" }}>
              <b style={{ color: "#fff" }}>Timing:</b> {lead?.timeframe || "—"}
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.65)" }}>
              <b style={{ color: "#fff" }}>Client:</b> {lead?.name || "—"} · {lead?.number || "—"}
            </div>
          </div>
        )}
        {valid ? <QuoteForm leadId={leadId} token={token} lead={lead || null} /> : null}
      </div>
    </main>
  );
}
