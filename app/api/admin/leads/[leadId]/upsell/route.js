import { cookies } from "next/headers";
import crypto from "node:crypto";
import { z } from "zod";

import { adminCookieName, verifyAdminSession } from "@/lib/adminAuth";
import { getLead, updateLead } from "@/lib/leadStore";

export const dynamic = "force-dynamic";

const AddSchema = z.object({
  label: z.string().trim().min(1).max(200),
  amountExVat: z.coerce.number().finite().positive(),
  requestId: z.string().optional()
});

async function auth() {
  const token = cookies().get(adminCookieName())?.value || null;
  return verifyAdminSession(token);
}

export async function POST(request, { params }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = AddSchema.safeParse(json);
  if (!parsed.success) return Response.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });

  const leadId = String(params.leadId || "");
  const lead = await getLead(leadId);
  if (!lead) return Response.json({ error: "Not found" }, { status: 404 });

  const upsell = {
    id: crypto.randomUUID(),
    label: parsed.data.label,
    amountExVat: Math.round((Number(parsed.data.amountExVat) + Number.EPSILON) * 100) / 100,
    addedAt: new Date().toISOString(),
    addedBy: session.username
  };

  const existing = Array.isArray(lead.upsells) ? lead.upsells : [];
  const patch = { upsells: [...existing, upsell] };

  // Mark the originating upsell request as confirmed
  if (parsed.data.requestId) {
    const requests = Array.isArray(lead.upsellRequests) ? lead.upsellRequests : [];
    patch.upsellRequests = requests.map((r) =>
      r.id === parsed.data.requestId ? { ...r, status: "confirmed", confirmedAt: upsell.addedAt } : r
    );
  }

  const updated = await updateLead(leadId, patch);

  return Response.json({ ok: true, upsell, lead: updated || null });
}

export async function DELETE(request, { params }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

  const leadId = String(params.leadId || "");
  const lead = await getLead(leadId);
  if (!lead) return Response.json({ error: "Not found" }, { status: 404 });

  const existing = Array.isArray(lead.upsells) ? lead.upsells : [];
  const filtered = existing.filter((u) => u.id !== id);
  if (filtered.length === existing.length) return Response.json({ error: "Upsell not found" }, { status: 404 });

  const updated = await updateLead(leadId, { upsells: filtered });
  return Response.json({ ok: true, lead: updated || null });
}
