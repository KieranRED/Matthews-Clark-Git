/**
 * GET /api/admin/test-quote-link
 * Creates a complex test lead (no Telegram) and returns the quote link.
 * ONE-SHOT endpoint — delete after testing.
 */
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { adminCookieName, verifyAdminSession } from "@/lib/adminAuth";
import { saveLead } from "@/lib/leadStore";

export const dynamic = "force-dynamic";

function hmacToken({ secret, leadId }) {
  return crypto.createHmac("sha256", secret).update(String(leadId)).digest("hex");
}

export async function GET(request) {
  const token = cookies().get(adminCookieName())?.value || null;
  const session = await verifyAdminSession(token);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const secret = process.env.LEAD_LINK_SECRET;
  if (!secret) return Response.json({ error: "Missing LEAD_LINK_SECRET" }, { status: 500 });

  const proto = request.headers.get("x-forwarded-proto") || "https";
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const baseUrl = `${proto}://${host}`;

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const lead = {
    id,
    name: "Kieran Test",
    surname: "",
    number: "0792498404",
    email: "kierandeclanredpath@gmail.com",
    car: "Mercedes-AMG G63",
    lane: "present",
    services: ["ppf", "wrap", "tint", "wheel", "starlight"],
    serviceDetails: {
      ppf: {
        coverage: "full-front",
        film: "stealth",
        doorJambs: true,
      },
      wrap: {
        scope: "partial",
        parts: ["roof", "mirrors", "rear-wing"],
        colour: "Satin Obsidian Black",
        notes: "Chrome delete on all trim pieces",
      },
      tint: {
        windows: "all+windscreen",
        shade: "35",
      },
      wheel: {
        service: "powder",
        finish: "gloss",
        colour: "Anthracite Grey",
        notes: "20\" AMG 5-spoke — all 4 wheels",
      },
      starlight: {
        notes: "Full roof liner, warm white fibre optic, shooting star effect requested",
      },
    },
    timeframe: "this-month",
    source: "ig",
    createdAt: now,
    status: "called",
    calledAt: now,
    _test: true,
  };

  await saveLead(lead);

  const t = hmacToken({ secret, leadId: lead.id });
  const url = `${baseUrl}/q/${encodeURIComponent(lead.id)}?t=${t}`;

  return Response.json({ ok: true, leadId: lead.id, url });
}
