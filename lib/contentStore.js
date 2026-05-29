import crypto from "node:crypto";

import { hasKv, kvDel, kvGet, kvKeys, kvSet, kvZAdd, kvZRem, kvZRevRange, kvZRangeByScore, maybeParseJson } from "@/lib/kv";

function nowIso() {
  return new Date().toISOString();
}

function scoreFor(iso) {
  return Number.isFinite(Date.parse(iso)) ? Date.parse(iso) : Date.now();
}

function contentKey(id) {
  return `content:${id}`;
}

export async function savePost(post) {
  if (!hasKv()) return null;
  const record = {
    id: post.id || crypto.randomUUID(),
    createdAt: post.createdAt || nowIso(),
    updatedAt: nowIso(),
    status: post.status || "pending",
    scheduledAt: post.scheduledAt || null,
    platforms: Array.isArray(post.platforms) ? post.platforms : ["instagram"],
    caption: post.caption || "",
    hashtags: post.hashtags || "",
    videoUrl: post.videoUrl || null,
    videoBlobPath: post.videoBlobPath || null,
    scriptPdfUrl: post.scriptPdfUrl || null,
    scriptText: post.scriptText || null,
    qualityResult: post.qualityResult || null,
    igContainerId: post.igContainerId || null,
    igMediaId: post.igMediaId || null,
    igError: post.igError || null,
    retryCount: post.retryCount ?? 0
  };

  await kvSet(contentKey(record.id), record);
  await kvZAdd("content:index", scoreFor(record.updatedAt), record.id);
  if (record.scheduledAt && record.status === "pending") {
    const s = Date.parse(record.scheduledAt);
    if (Number.isFinite(s)) await kvZAdd("content:schedule", s, record.id);
  }
  return record;
}

export async function getPost(id) {
  if (!hasKv()) return null;
  return maybeParseJson(await kvGet(contentKey(id)));
}

export async function updatePost(id, patch) {
  if (!hasKv()) return null;
  const existing = (await getPost(id)) || null;
  const base = existing && typeof existing === "object" ? existing : { id };
  const next = { ...base, ...patch, id, updatedAt: nowIso() };
  await kvSet(contentKey(id), next);
  await kvZAdd("content:index", scoreFor(next.updatedAt), id);
  // Schedule set membership rules
  if (next.status === "pending" && next.scheduledAt) {
    const s = Date.parse(next.scheduledAt);
    if (Number.isFinite(s)) await kvZAdd("content:schedule", s, id);
  } else {
    // Any non-pending status (processing/published/failed) removes from schedule
    try { await kvZRem("content:schedule", id); } catch (err) { console.error("[contentStore][schedule:zrem]", err); }
  }
  return next;
}

export async function listPostIds({ limit = 50 } = {}) {
  if (!hasKv()) return [];
  const safeLimit = Math.max(1, Math.min(500, Number(limit) || 50));
  const res = await kvZRevRange("content:index", 0, safeLimit - 1);
  if (res.length) return res;
  const keys = await kvKeys("content:*");
  return keys
    .filter((k) => k.startsWith("content:") && k !== "content:schedule" && k !== "content:index")
    .map((k) => k.slice("content:".length))
    .slice(0, safeLimit);
}

export async function listPosts({ limit = 50, status } = {}) {
  const ids = await listPostIds({ limit });
  const posts = await Promise.all(ids.map((id) => getPost(id)));
  const filtered = posts.filter((p) => p && typeof p === "object");
  const sorted = filtered.sort((a, b) => scoreFor(b.updatedAt || b.createdAt) - scoreFor(a.updatedAt || a.createdAt));
  if (status) return sorted.filter((p) => String(p.status || "").toLowerCase() === String(status).toLowerCase());
  return sorted;
}

export async function getDuePostIds(nowMs = Date.now()) {
  if (!hasKv()) return [];
  return await kvZRangeByScore("content:schedule", 0, nowMs);
}

export async function deletePost(id) {
  if (!hasKv()) return { ok: false, error: "KV not configured" };
  const post = await getPost(id);
  await kvDel(contentKey(id));
  try { await kvZRem("content:index", String(id)); } catch (err) { console.error("[contentStore][index:zrem]", err); }
  try { await kvZRem("content:schedule", String(id)); } catch (err) { console.error("[contentStore][schedule:zrem]", err); }
  return { ok: true, post: post || null };
}
