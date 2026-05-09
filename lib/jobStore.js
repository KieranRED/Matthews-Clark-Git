import crypto from "node:crypto";

import { hasKv, kvDel, kvGet, kvKeys, kvSet, kvZAdd, kvZRem, kvZRevRange, maybeParseJson } from "@/lib/kv";

function nowIso() {
  return new Date().toISOString();
}

function scoreFor(iso) {
  return Number.isFinite(Date.parse(iso)) ? Date.parse(iso) : Date.now();
}

function jobKey(id) {
  return `job:${id}`;
}

async function indexJob(job) {
  if (!hasKv()) return;
  const s = scoreFor(job.updatedAt || job.createdAt || nowIso());
  await kvZAdd("jobs:index", s, String(job.id));
  if (job.clientId) await kvZAdd(`client:${job.clientId}:jobs`, s, String(job.id));
}

export async function saveJob(job) {
  if (!hasKv()) return null;
  const record = {
    id: job.id || crypto.randomUUID(),
    createdAt: job.createdAt || nowIso(),
    updatedAt: nowIso(),
    status: job.status || "scheduled",
    clientId: job.clientId || null,
    leadId: job.leadId || null,
    vehicle: job.vehicle || null,
    services: Array.isArray(job.services) ? job.services : [],
    scheduledAt: job.scheduledAt || null,
    quoteAmount: job.quoteAmount ?? null,
    jobValue: job.jobValue ?? null,
    paidAmount: job.paidAmount ?? null,
    paymentStatus: job.paymentStatus || "unpaid",
    notes: Array.isArray(job.notes) ? job.notes : []
  };

  await kvSet(jobKey(record.id), record);
  await indexJob(record);
  return record;
}

export async function getJob(id) {
  if (!hasKv()) return null;
  return maybeParseJson(await kvGet(jobKey(id)));
}

export async function updateJob(id, patch) {
  if (!hasKv()) return null;
  const existing = (await getJob(id)) || null;
  const base = existing && typeof existing === "object" ? existing : { id };
  const next = { ...base, ...patch, id, updatedAt: nowIso() };
  await kvSet(jobKey(id), next);
  await indexJob(next);
  return next;
}

export async function listJobIds({ limit = 50 } = {}) {
  if (!hasKv()) return [];
  const safeLimit = Math.max(1, Math.min(500, Number(limit) || 50));
  const res = await kvZRevRange("jobs:index", 0, safeLimit - 1);
  if (res.length) return res;
  const keys = await kvKeys("job:*");
  return keys
    .filter((k) => k.startsWith("job:"))
    .map((k) => k.slice("job:".length))
    .slice(0, safeLimit);
}

export async function listJobs({ limit = 50, status } = {}) {
  const ids = await listJobIds({ limit });
  const jobs = await Promise.all(ids.map((id) => getJob(id)));
  const filtered = jobs.filter((j) => j && typeof j === "object");
  const sorted = filtered.sort((a, b) => scoreFor(b.updatedAt || b.createdAt) - scoreFor(a.updatedAt || a.createdAt));
  if (status) return sorted.filter((j) => String(j.status || "").toLowerCase() === String(status).toLowerCase());
  return sorted;
}

export async function deleteJob(id) {
  if (!hasKv()) return { ok: false, error: "KV not configured" };
  const job = await getJob(id);
  await kvDel(jobKey(id));
  try {
    await kvZRem("jobs:index", String(id));
  } catch (err) {
    console.error("[kv][jobs:index][zrem-failed]", err);
  }
  if (job?.clientId) {
    try {
      await kvZRem(`client:${String(job.clientId)}:jobs`, String(id));
    } catch (err) {
      console.error("[kv][client:jobs][zrem-failed]", err);
    }
  }
  return { ok: true, job: job || null };
}
