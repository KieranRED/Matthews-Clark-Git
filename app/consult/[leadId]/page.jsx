import { getLead } from "@/lib/leadStore";
import { verifyToken } from "@/lib/linkToken";

import ConsultClient from "./consult-client";

export const dynamic = "force-dynamic";

export const metadata = { title: "Consultation — Matthews & Clark" };

export default async function ConsultPage({ params, searchParams }) {
  const leadId = params.leadId;
  const token = searchParams?.t || "";

  const secret = process.env.LEAD_LINK_SECRET;
  const valid = secret ? verifyToken({ secret, leadId, token }) : false;
  if (!valid) {
    return (
      <main style={{ minHeight: "100svh", display: "grid", placeItems: "center", background: "#050505", color: "#fff", padding: 24 }}>
        <div style={{ maxWidth: 520, width: "100%", border: "1px solid rgba(255,255,255,.12)", borderRadius: 18, padding: 18 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 28, textTransform: "uppercase" }}>Invalid link</div>
          <div style={{ marginTop: 8, opacity: 0.8 }}>Ask the team to resend the consultation link.</div>
        </div>
      </main>
    );
  }

  const lead = (await getLead(leadId)) || null;
  if (!lead) {
    return (
      <main style={{ minHeight: "100svh", display: "grid", placeItems: "center", background: "#050505", color: "#fff", padding: 24 }}>
        <div style={{ maxWidth: 520, width: "100%", border: "1px solid rgba(255,255,255,.12)", borderRadius: 18, padding: 18 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 28, textTransform: "uppercase" }}>Lead not found</div>
        </div>
      </main>
    );
  }

  return <ConsultClient leadId={leadId} token={token} lead={lead} />;
}

