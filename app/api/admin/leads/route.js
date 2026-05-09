import { cookies } from "next/headers";
import { z } from "zod";

import { adminCookieName, verifyAdminSession } from "@/lib/adminAuth";
import { listLeads } from "@/lib/leadStore";

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  status: z.string().trim().optional()
});

export async function GET(request) {
  const token = cookies().get(adminCookieName())?.value || null;
  const session = await verifyAdminSession(token);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  if (
    !(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) &&
    !(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
  ) {
    return Response.json(
      {
        error:
          "Lead storage not configured. Add Vercel KV env vars (KV_REST_API_URL and KV_REST_API_TOKEN) or Upstash REST env vars (UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN)."
      },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const parsed = QuerySchema.safeParse({
    limit: searchParams.get("limit") ?? undefined,
    status: searchParams.get("status") ?? undefined
  });
  if (!parsed.success) return Response.json({ error: "Invalid query" }, { status: 400 });

  try {
    const leads = await listLeads({ limit: parsed.data.limit, status: parsed.data.status });
    return Response.json({ ok: true, leads });
  } catch (err) {
    console.error("[admin][leads][list-failed]", err);
    return Response.json({ error: "Failed to load leads" }, { status: 500 });
  }
}
