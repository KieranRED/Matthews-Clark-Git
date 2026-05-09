import { cookies } from "next/headers";

import { adminCookieName, verifyAdminSession } from "@/lib/adminAuth";
import { listClients, listLeads } from "@/lib/leadStore";
import { listJobs } from "@/lib/jobStore";
import { listTasks } from "@/lib/taskStore";

function dayKey(iso) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  } catch {
    return null;
  }
}

function makeLastNDays(n) {
  const days = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

export async function GET() {
  const token = cookies().get(adminCookieName())?.value || null;
  const session = await verifyAdminSession(token);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  if (
    !(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) &&
    !(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
  ) {
    return Response.json({ error: "Lead storage not configured (missing KV env vars)." }, { status: 500 });
  }

  const leads = await listLeads({ limit: 800 });
  const clients = await listClients({ limit: 800 });
  const jobs = await listJobs({ limit: 300 });
  const tasks = await listTasks({ limit: 200 });

  const statusCounts = {};
  for (const lead of leads) {
    const s = String(lead.status || "new");
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  }

  const days = makeLastNDays(14);
  const leadsByDay = Object.fromEntries(days.map((d) => [d, 0]));
  for (const lead of leads) {
    const k = dayKey(lead.createdAt);
    if (k && k in leadsByDay) leadsByDay[k] += 1;
  }

  const repeatClients = clients.filter((c) => Number(c?.leadCount || 0) > 1).length;

  return Response.json({
    ok: true,
    totals: {
      leads: leads.length,
      clients: clients.length,
      repeatClients,
      jobs: jobs.length,
      openTasks: tasks.filter((t) => String(t.status || "open") === "open").length
    },
    statusCounts,
    leadsByDay
  });
}
