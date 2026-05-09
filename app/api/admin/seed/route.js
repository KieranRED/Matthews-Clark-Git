import crypto from "node:crypto";
import { cookies } from "next/headers";

import { adminCookieName, verifyAdminSession } from "@/lib/adminAuth";
import { saveLead } from "@/lib/leadStore";

function getBaseUrl() {
  const envBase = process.env.NEXT_PUBLIC_BASE_URL;
  if (envBase) return envBase.replace(/\/+$/, "");
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;
  return null;
}

export async function POST() {
  const token = cookies().get(adminCookieName())?.value || null;
  const session = await verifyAdminSession(token);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  if (
    !(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) &&
    !(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
  ) {
    return Response.json({ error: "Lead storage not configured (missing KV env vars)." }, { status: 500 });
  }

  const createdAt = new Date().toISOString();
  const baseUrl = getBaseUrl() || "https://www.matthewsandclark.co.za";

  const jordanId = crypto.randomUUID();
  const kyleId = crypto.randomUUID();

  const jordan = {
    id: jordanId,
    createdAt,
    status: "new",
    name: "Jordan",
    number: "27790000001",
    email: "jordan@example.com",
    car: "BMW M2 2024",
    lane: "protect",
    services: ["ppf", "wrap", "wheel"],
    serviceDetails: {
      ppf: { coverage: "full-front", film: "clear", doorJambs: false },
      wrap: { scope: "partial", parts: ["mirrors", "rear-wing"], colour: "White" },
      wheel: { service: "powder", finish: "gloss", colour: "White" }
    },
    timeframe: "this-week",
    source: "INSTAGRAM",
    pageUrl: `${baseUrl}/`,
    referrer: null,
    notes: [{ at: createdAt, by: session.username, text: "Seeded from /api/admin/seed (Jordan)" }]
  };

  const kyle = {
    id: kyleId,
    createdAt,
    status: "new",
    name: "Kyle",
    number: "27790000002",
    email: "kyle@example.com",
    car: "VW Golf R 2023",
    lane: "protect",
    services: ["ppf"],
    serviceDetails: {
      ppf: { coverage: "full-front", film: "clear", doorJambs: false }
    },
    timeframe: "this-month",
    source: "TIKTOK",
    pageUrl: `${baseUrl}/`,
    referrer: null,
    notes: [{ at: createdAt, by: session.username, text: "Seeded from /api/admin/seed (Kyle)" }]
  };

  await Promise.all([saveLead(jordan), saveLead(kyle)]);
  return Response.json({ ok: true, leadIds: [jordanId, kyleId] });
}
