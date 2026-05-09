import { cookies } from "next/headers";

import { adminCookieName, verifyAdminSession } from "@/lib/adminAuth";
import { listLeads } from "@/lib/leadStore";

function csvEscape(value) {
  const s = value == null ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(request) {
  const token = cookies().get(adminCookieName())?.value || null;
  const session = await verifyAdminSession(token);
  if (!session) return new Response("Unauthorized", { status: 401 });

  if (
    !(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) &&
    !(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
  ) {
    return new Response("Storage not configured", { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.max(1, Math.min(2000, Number(searchParams.get("limit") || 1000)));
  const leads = await listLeads({ limit });

  const headers = [
    "createdAt",
    "status",
    "name",
    "number",
    "email",
    "car",
    "lane",
    "services",
    "timeframe",
    "source",
    "clientId",
    "clientLeadCount",
    "assignedTo",
    "followUpAt",
    "quoteAmount",
    "jobValue",
    "quoteUrl",
    "lostReason",
    "leadId"
  ];

  const rows = [headers.join(",")];
  for (const l of leads) {
    rows.push(
      [
        l.createdAt,
        l.status,
        l.name,
        l.number,
        l.email,
        l.car,
        l.lane,
        Array.isArray(l.services) ? l.services.join(" · ") : "",
        l.timeframe,
        l.source,
        l.clientId,
        l.clientLeadCount,
        l.assignedTo,
        l.followUpAt,
        l.quoteAmount,
        l.jobValue,
        l.quoteUrl,
        l.lostReason,
        l.id
      ]
        .map(csvEscape)
        .join(",")
    );
  }

  return new Response(rows.join("\n"), {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "cache-control": "no-store",
      "content-disposition": "attachment; filename=\"leads.csv\""
    }
  });
}
