import { z } from "zod";

import { getLead, updateLead } from "@/lib/leadStore";
import { verifyToken } from "@/lib/linkToken";
import { PC_PACKAGES, pcPricing, pcPaymentSchedule, pcBusinessRange, pcIsoDate, pcFmtDate } from "@/app/paint-correction/pcData";

export const dynamic = "force-dynamic";

// Fire-and-forget stage/field sync — called from the client at every real
// transition (package chosen/switched, car details, date picked, payment
// screen reached) so a lead's furthest step is always known in the CRM even
// if they bounce without ever reaching checkout/deposit. Never blocks the UI
// on the client side; failures here are swallowed by the caller.
const Schema = z.object({
  t: z.string().min(1),
  stage: z.string().trim().max(40).optional(),
  patch: z
    .object({
      packageId: z.string().trim().max(60).optional(),
      packageName: z.string().trim().max(120).optional(),
      ceramic: z.boolean().optional(),
      price: z.number().nonnegative().optional(),
      make: z.string().trim().max(60).optional(),
      model: z.string().trim().max(60).optional(),
      year: z.string().trim().max(8).optional(),
      car: z.string().trim().max(160).optional(),
      dropoff: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      pickup: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      durationDays: z.number().optional()
    })
    .partial()
    .optional()
});

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
  const now = new Date().toISOString();
  const topLevelPatch = {};
  const pcPatch = { ...pc, lastActivityAt: now };

  if (parsed.data.stage) pcPatch.stage = parsed.data.stage;

  const p = parsed.data.patch || {};
  if (p.make !== undefined) topLevelPatch.make = p.make;
  if (p.model !== undefined) topLevelPatch.model = p.model;
  if (p.year !== undefined) topLevelPatch.year = p.year;
  if (p.car !== undefined) topLevelPatch.car = p.car;

  // A package/ceramic switch or a (re-)pick of the drop-off date both change
  // the money and the calendar block, so both re-run the full payment
  // calculator and rebuild the booking window — never trust the client's
  // price/durationDays, same as the checkout route. Without this, switching
  // tiers after dates are picked left the CRM's deposit, notes and booking
  // block on the previous tier until (if ever) the client re-ran the whole
  // checkout step.
  const effectivePackageId = p.packageId !== undefined ? p.packageId : pc.packageId;
  const pkg = effectivePackageId ? PC_PACKAGES.find((x) => x.id === effectivePackageId) : null;
  const packageOrDateChanged = p.packageId !== undefined || p.ceramic !== undefined || p.dropoff !== undefined;

  if (pkg && packageOrDateChanged) {
    const effectiveCeramic = p.ceramic !== undefined ? p.ceramic : !!pc.ceramic;
    const { price, durationDays, ceramicOn } = pcPricing(pkg, effectiveCeramic);
    const { hold: deposit, dueAtDropoff, dueAtPickup, balance } = pcPaymentSchedule(price, durationDays);

    pcPatch.packageId = pkg.id;
    pcPatch.packageName = pkg.name;
    pcPatch.ceramic = ceramicOn;
    pcPatch.price = price;
    pcPatch.holdAmount = deposit;
    pcPatch.deposit = deposit;
    pcPatch.dueAtDropoff = dueAtDropoff;
    pcPatch.dueAtPickup = dueAtPickup;
    pcPatch.balance = balance;
    pcPatch.durationDays = durationDays;

    const effectiveDropoff = p.dropoff !== undefined ? p.dropoff : pc.dropoff;
    if (effectiveDropoff) {
      const dropoffDate = new Date(effectiveDropoff + "T00:00:00");
      const range = pcBusinessRange(dropoffDate, durationDays);
      const pickupDate = range[range.length - 1];
      const bookedDates = range.map(pcIsoDate);

      pcPatch.dropoff = effectiveDropoff;
      pcPatch.pickup = pcIsoDate(pickupDate);

      topLevelPatch.booking = {
        ...(lead.booking || {}),
        dropoffDate: effectiveDropoff,
        pickupDate: pcIsoDate(pickupDate),
        durationDays,
        bookedDates,
        scheduledAt: dropoffDate.toISOString(),
        updatedAt: now
      };

      topLevelPatch.serviceDetails = {
        ...(lead.serviceDetails || {}),
        correct: {
          ...(lead.serviceDetails?.correct || {}),
          stage: lead.serviceDetails?.correct?.stage,
          notes: `${pkg.name}${ceramicOn ? " + 18-month ceramic" : ""} · ${pcFmtDate(dropoffDate)} → ${pcFmtDate(pickupDate)} · R${deposit.toLocaleString("en-ZA")} hold · R${dueAtDropoff.toLocaleString("en-ZA")} at drop-off${dueAtPickup > 0 ? ` · R${dueAtPickup.toLocaleString("en-ZA")} at pickup` : ""}`
        }
      };
    }
  } else {
    // No package resolvable yet (shouldn't happen past contact-capture) —
    // fall back to trusting the individual fields the client sent so we
    // still record *something* rather than silently dropping the patch.
    if (p.packageId !== undefined) pcPatch.packageId = p.packageId;
    if (p.packageName !== undefined) pcPatch.packageName = p.packageName;
    if (p.ceramic !== undefined) pcPatch.ceramic = p.ceramic;
    if (p.price !== undefined) pcPatch.price = p.price;
    if (p.dropoff !== undefined) pcPatch.dropoff = p.dropoff;
    if (p.pickup !== undefined) pcPatch.pickup = p.pickup;
    if (p.durationDays !== undefined) pcPatch.durationDays = p.durationDays;
  }

  await updateLead(leadId, { ...topLevelPatch, paintCorrection: pcPatch, updatedAt: now });

  return Response.json({ ok: true });
}
