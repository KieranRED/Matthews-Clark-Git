import crypto from "node:crypto";

import { hasKv, kvDel, kvGet, kvKeys, kvSet, kvZAdd, kvZRem, kvZRevRange, maybeParseJson } from "@/lib/kv";

function nowIso() {
  return new Date().toISOString();
}

function scoreFor(iso) {
  return Number.isFinite(Date.parse(iso)) ? Date.parse(iso) : Date.now();
}

function taskKey(id) {
  return `task:${id}`;
}

async function indexTask(task) {
  if (!hasKv()) return;
  const due = task.dueAt || task.createdAt || nowIso();
  await kvZAdd("tasks:due", scoreFor(due), String(task.id));
  if (task.clientId) await kvZAdd(`client:${task.clientId}:tasks`, scoreFor(due), String(task.id));
  if (task.leadId) await kvZAdd(`lead:${task.leadId}:tasks`, scoreFor(due), String(task.id));
}

export async function saveTask(task) {
  if (!hasKv()) return null;
  const record = {
    id: task.id || crypto.randomUUID(),
    createdAt: task.createdAt || nowIso(),
    updatedAt: nowIso(),
    status: task.status || "open", // open | done | canceled
    title: task.title ? String(task.title).slice(0, 120) : "Task",
    dueAt: task.dueAt || null,
    clientId: task.clientId || null,
    leadId: task.leadId || null,
    assignedTo: task.assignedTo || null,
    notes: Array.isArray(task.notes) ? task.notes : []
  };
  await kvSet(taskKey(record.id), record);
  await indexTask(record);
  return record;
}

export async function getTask(id) {
  if (!hasKv()) return null;
  return maybeParseJson(await kvGet(taskKey(id)));
}

export async function updateTask(id, patch) {
  if (!hasKv()) return null;
  const existing = (await getTask(id)) || null;
  const base = existing && typeof existing === "object" ? existing : { id };
  const next = { ...base, ...patch, id, updatedAt: nowIso() };
  await kvSet(taskKey(id), next);
  await indexTask(next);
  return next;
}

export async function listTaskIds({ limit = 50 } = {}) {
  if (!hasKv()) return [];
  const safeLimit = Math.max(1, Math.min(500, Number(limit) || 50));
  const res = await kvZRevRange("tasks:due", 0, safeLimit - 1);
  if (res.length) return res;
  const keys = await kvKeys("task:*");
  return keys
    .filter((k) => k.startsWith("task:"))
    .map((k) => k.slice("task:".length))
    .slice(0, safeLimit);
}

export async function listTasks({ limit = 50, status } = {}) {
  const ids = await listTaskIds({ limit });
  const tasks = await Promise.all(ids.map((id) => getTask(id)));
  const filtered = tasks.filter((t) => t && typeof t === "object");
  const sorted = filtered.sort((a, b) => scoreFor(b.dueAt || b.createdAt) - scoreFor(a.dueAt || a.createdAt));
  if (status) return sorted.filter((t) => String(t.status || "").toLowerCase() === String(status).toLowerCase());
  return sorted;
}

export async function deleteTask(id) {
  if (!hasKv()) return { ok: false, error: "KV not configured" };
  const task = await getTask(id);
  await kvDel(taskKey(id));
  try {
    await kvZRem("tasks:due", String(id));
  } catch (err) {
    console.error("[kv][tasks:due][zrem-failed]", err);
  }
  if (task?.clientId) {
    try {
      await kvZRem(`client:${String(task.clientId)}:tasks`, String(id));
    } catch (err) {
      console.error("[kv][client:tasks][zrem-failed]", err);
    }
  }
  if (task?.leadId) {
    try {
      await kvZRem(`lead:${String(task.leadId)}:tasks`, String(id));
    } catch (err) {
      console.error("[kv][lead:tasks][zrem-failed]", err);
    }
  }
  return { ok: true, task: task || null };
}
