import { z } from "zod";

import { getLead, updateLead } from "@/lib/leadStore";
import { verifyToken } from "@/lib/linkToken";

export const dynamic = "force-dynamic";

const Schema = z.object({
  t: z.string().min(1),
  packageId: z.string().trim().min(1).max(60).optional(),
  packageName: z.string().trim().min(1).max(120).optional(),
  price: z.number().nonnegative().optional()
});

const HOLD_HOURS = 24;

// Marks a lead that chose "rather talk it through first" on the payment
// screen instead of holding their slot immediately. Status is "quoted", not
// "contacted" — we owe THEM a message, they haven't reached out (E3: a status
// that reads backwards gets misread). Soft-holds their chosen calendar slot
// for 24h (see availability route, which ignores an expired hold). Records
// whatsappHandoffAt so the chase cron knows when the 60-minute
// no-inbound-reply window starts (see lib/pcChase.js).
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
  const booking = lead.booking || {};
  const now = new Date();
  const heldUntil = new Date(now.getTime() + HOLD_HOURS * 60 * 60 * 1000).toISOString();

  await updateLead(leadId, {
    status: "quoted",
    paintCorrection: {
      ...pc,
      stage: "whatsapp_handoff",
      whatsappHandoffAt: now.toISOString(),
      packageId: parsed.data.packageId || pc.packageId || null,
      packageName: parsed.data.packageName || pc.packageName || null,
      price: parsed.data.price ?? pc.price ?? null
    },
    // paid:false is explicit — this is a soft pencil, not a real hold (D2).
    // The availability route only blocks a "held" slot once booking.paid.
    booking: booking.dropoffDate
      ? { ...booking, status: "held", heldUntil, paid: false, updatedAt: now.toISOString() }
      : booking,
    updatedAt: now.toISOString()
  });

  return Response.json({ ok: true, heldUntil });
}
