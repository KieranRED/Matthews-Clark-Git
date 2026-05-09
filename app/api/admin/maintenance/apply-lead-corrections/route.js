import { cookies } from "next/headers";
import { z } from "zod";

import { adminCookieName, verifyAdminSession } from "@/lib/adminAuth";
import { listLeads, updateLead } from "@/lib/leadStore";

const BodySchema = z
  .object({
    confirm: z.string().trim().min(1),
    jordan: z
      .object({
        name: z.string().trim().min(1).default("Jordan")
      })
      .optional(),
    kyle: z
      .object({
        name: z.string().trim().min(1).default("Kyle")
      })
      .optional()
  })
  .strict();

function normName(s) {
  return String(s || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function newestByName(leads, wantedName) {
  const n = normName(wantedName);
  const matches = leads.filter((l) => normName(l?.name) === n);
  matches.sort((a, b) => Date.parse(b?.createdAt || 0) - Date.parse(a?.createdAt || 0));
  return matches[0] || null;
}

export async function POST(request) {
  const token = cookies().get(adminCookieName())?.value || null;
  const session = await verifyAdminSession(token);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  if (
    !(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) &&
    !(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
  ) {
    return Response.json({ error: "Lead storage not configured (missing KV env vars)." }, { status: 500 });
  }

  const json = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) return Response.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });

  if (parsed.data.confirm !== "APPLY_LEAD_CORRECTIONS") {
    return Response.json({ error: "Missing confirmation (confirm must equal APPLY_LEAD_CORRECTIONS)" }, { status: 400 });
  }

  const leads = await listLeads({ limit: 400 });
  const now = new Date().toISOString();

  const updated = [];

  const jordanName = parsed.data.jordan?.name || "Jordan";
  const jordan = newestByName(leads, jordanName);
  if (jordan?.id) {
    const patch = {
      services: ["ppf", "wrap", "wheel"],
      serviceDetails: {
        ppf: { coverage: "full-front", film: "clear", doorJambs: false },
        wrap: { scope: "partial", parts: ["mirrors", "rear-wing"], colour: "White" },
        wheel: { service: "powder", finish: "gloss", colour: "White" }
      },
      notes: [{ at: now, by: session.username, text: "Maintenance: applied Jordan service details" }, ...(Array.isArray(jordan.notes) ? jordan.notes : [])].slice(
        0,
        200
      )
    };
    const next = await updateLead(String(jordan.id), patch);
    if (next) updated.push({ id: String(jordan.id), name: jordan.name, ok: true });
  }

  const kyleName = parsed.data.kyle?.name || "Kyle";
  const kyle = newestByName(leads, kyleName);
  if (kyle?.id) {
    const patch = {
      services: ["ppf"],
      serviceDetails: {
        ppf: { coverage: "full-front", film: "clear", doorJambs: false }
      },
      notes: [{ at: now, by: session.username, text: "Maintenance: applied Kyle service details" }, ...(Array.isArray(kyle.notes) ? kyle.notes : [])].slice(
        0,
        200
      )
    };
    const next = await updateLead(String(kyle.id), patch);
    if (next) updated.push({ id: String(kyle.id), name: kyle.name, ok: true });
  }

  return Response.json({
    ok: true,
    updated,
    warning:
      "This updates the newest lead matching each name (case-insensitive exact match). If there are multiple Jordans/Kyles, rename the correct lead first or extend this endpoint to target IDs."
  });
}

