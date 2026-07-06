import { z } from "zod";
import crypto from "node:crypto";

import { saveLead, upsertClientForLead } from "@/lib/leadStore";
import { hmacToken } from "@/lib/linkToken";
import { sendLeadConversions } from "@/lib/adsCapi";
import { saveTask } from "@/lib/taskStore";

export const dynamic = "force-dynamic";

// Minimal lead capture right after the quiz — before package/car/date are
// known. Gets a name + WhatsApp number into the CRM immediately so a
// mid-funnel drop-off is a followable lead instead of a ghost. The full
// booking route (app/api/lead/paint-correction/route.js) enriches this same
// lead record once car/package/date/email are gathered.
const Schema = z.object({
  name: z.string().trim().min(1).max(80),
  dial: z.string().trim().max(8).optional(),
  number: z.string().trim().min(7).max(40),
  answers: z.record(z.string()).optional(),
  eventId: z.string().max(128).nullable().optional(),
  utm: z
    .object({
      source: z.string().trim().max(120).nullable().optional(),
      medium: z.string().trim().max(120).nullable().optional(),
      campaign: z.string().trim().max(120).nullable().optional(),
      content: z.string().trim().max(120).nullable().optional(),
      term: z.string().trim().max(120).nullable().optional()
    })
    .nullable()
    .optional(),
  clickIds: z
    .object({
      fbclid: z.string().max(512).nullable().optional(),
      ttclid: z.string().max(512).nullable().optional(),
      gclid: z.string().max(512).nullable().optional(),
      fbp: z.string().max(256).nullable().optional(),
      fbc: z.string().max(256).nullable().optional()
    })
    .nullable()
    .optional(),
  pageUrl: z.string().url().nullable().optional(),
  referrer: z.string().max(1024).nullable().optional()
});

export async function POST(request) {
  let json;
  try {
    json = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = Schema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
  }
  const d = parsed.data;

  const leadId = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  const leadRecord = {
    id: leadId,
    firstName: d.name,
    surname: "",
    name: d.name,
    number: d.number,
    dial: d.dial || "+27",
    email: null,
    car: null,
    make: null,
    model: null,
    year: null,
    services: ["correct"],
    serviceDetails: {
      correct: { stage: null, notes: "Quiz complete — awaiting package, car & date" }
    },
    lane: "present",
    timeframe: "no-rush",
    source: "ADS",
    funnel: "paint-correction",
    status: "new",
    createdAt,
    updatedAt: createdAt,
    invoiceStatus: "due",
    reference: null,
    eventId: d.eventId || null,
    utm: d.utm || null,
    clickIds: d.clickIds || null,
    pageUrl: d.pageUrl || null,
    referrer: d.referrer || null,
    paintCorrection: {
      stage: "quiz_complete",
      packageId: null,
      packageName: null,
      ceramic: false,
      holdAmount: null,
      dueAtDropoff: null,
      dueAtPickup: null,
      dropoffPaidAt: null,
      pickupPaidAt: null,
      answers: d.answers || null,
      upsells: [],
      remindersSent: []
    }
  };

  try {
    const client = await upsertClientForLead(leadRecord);
    if (client?.id) leadRecord.clientId = client.id;
  } catch (err) {
    console.error("[pc-quiz-lead][client-upsert-failed]", err);
  }

  await saveLead(leadRecord);
  console.log("[pc-quiz-lead]", { leadId, name: d.name });

  // A quiz-complete lead that never reaches deposit is a real drop-off, not a
  // ghost — auto-create a 3-hour follow-up so Sam/Keanan can WhatsApp them
  // ("built your paint read, want me to hold a slot or talk it through?").
  // Closed automatically once the lead actually books (see pc-deposit route).
  try {
    const dueAt = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();
    const task = await saveTask({
      title: `Follow up — ${d.name} (paint correction quiz, no booking yet)`,
      dueAt,
      leadId,
      notes: [{ at: createdAt, by: "system", text: "Auto-created: quiz completed, no deposit within 3h" }]
    });
    if (task?.id) {
      await saveLead({ ...leadRecord, paintCorrection: { ...leadRecord.paintCorrection, followUpTaskId: task.id } });
    }
  } catch (err) {
    console.error("[pc-quiz-lead][follow-up-task-failed]", err);
  }

  // Server-side "Lead" conversion (CAPI) — this is now the primary optimization
  // event for the ad set, fired the moment quiz+contact are done. Env-gated,
  // never fatal.
  try {
    const capi = await sendLeadConversions({ lead: leadRecord, request });
    if (capi && Object.keys(capi).length) console.log("[pc-quiz-lead][capi]", { leadId, ...capi });
  } catch (err) {
    console.error("[pc-quiz-lead][capi-failed]", err);
  }

  const token = process.env.LEAD_LINK_SECRET ? hmacToken({ secret: process.env.LEAD_LINK_SECRET, leadId }) : null;

  return Response.json({ ok: true, leadId, token });
}
