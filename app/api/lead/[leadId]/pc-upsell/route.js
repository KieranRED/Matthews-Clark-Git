import { z } from "zod";

import { getLead, updateLead } from "@/lib/leadStore";
import { verifyToken } from "@/lib/linkToken";

export const dynamic = "force-dynamic";

const Schema = z.object({
  t: z.string().min(1),
  id: z.string().trim().min(1).max(60),
  name: z.string().trim().min(1).max(120),
  price: z.number().nonnegative()
});

// Records post-deposit upsell interest on the lead (rolls into whichever of
// the drop-off/pickup amounts settles last — see PaintCorrectionFlow.jsx's
// PCConfirm for the fold-in math). Best-effort — the team confirms at handover.
export async function POST(request, { params }) {
  const leadId = String(params.leadId || "");
  const secret = process.env.LEAD_LINK_SECRET;
  if (!secret) return Response.json({ error: "Missing LEAD_LINK_SECRET" }, { status: 500 });

  const json = await request.json().catch(() => null);
  const parsed = Schema.safeParse(json);
  if (!parsed.success) return Response.json({ error: "Invalid payload" }, { status: 400 });

  if (!verifyToken({ secret, leadId, token: parsed.data.t })) return Response.json({ error: "Invalid link token" }, { status: 401 });

  const lead = await getLead(leadId);
  if (!lead) return Response.json({ error: "Not found" }, { status: 404 });

  const pc = lead.paintCorrection || {};
  const upsells = Array.isArray(pc.upsells) ? [...pc.upsells] : [];
  if (!upsells.find((u) => u.id === parsed.data.id)) {
    upsells.push({ id: parsed.data.id, name: parsed.data.name, price: parsed.data.price, at: new Date().toISOString() });
  }
  await updateLead(leadId, { paintCorrection: { ...pc, upsells }, updatedAt: new Date().toISOString() });

  return Response.json({ ok: true });
}
