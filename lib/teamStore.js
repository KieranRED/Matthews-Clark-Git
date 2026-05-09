import crypto from "node:crypto";

import { hasKv, kvGet, kvKeys, kvSet, kvZAdd, kvZRevRange, maybeParseJson } from "@/lib/kv";

function nowIso() {
  return new Date().toISOString();
}

function scoreFor(iso) {
  return Number.isFinite(Date.parse(iso)) ? Date.parse(iso) : Date.now();
}

function memberKey(id) {
  return `team:${id}`;
}

function usernameKey(username) {
  return `teamByUsername:${String(username || "").toLowerCase()}`;
}

export const TEAM_ROLES = [
  "mc_owner",
  "mc_staff",
  "izimoto_owner",
  "izimoto_staff"
];

export function roleLabel(role) {
  const r = String(role || "");
  if (r === "mc_owner") return "M&C · Owner";
  if (r === "mc_staff") return "M&C · Team";
  if (r === "izimoto_owner") return "Izimoto · Owner";
  if (r === "izimoto_staff") return "Izimoto · Team";
  return "Team";
}

export function accentForRole(role) {
  const r = String(role || "");
  if (r.startsWith("izimoto")) return "#9B51E0"; // purple
  return "#1F4FFF"; // M&C blue
}

function scryptHash(password, saltHex) {
  const salt = saltHex ? Buffer.from(saltHex, "hex") : crypto.randomBytes(16);
  const derived = crypto.scryptSync(String(password), salt, 32, { N: 16384, r: 8, p: 1 });
  return { saltHex: salt.toString("hex"), hashHex: Buffer.from(derived).toString("hex") };
}

function timingSafeEqHex(aHex, bHex) {
  const a = Buffer.from(String(aHex || ""), "hex");
  const b = Buffer.from(String(bHex || ""), "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function verifyTeamPassword({ username, password }) {
  if (!hasKv()) return null;
  const id = maybeParseJson(await kvGet(usernameKey(username)));
  if (!id) return null;
  const member = maybeParseJson(await kvGet(memberKey(id)));
  if (!member || typeof member !== "object") return null;
  if (!member.username || String(member.username).toLowerCase() !== String(username || "").toLowerCase()) return null;
  if (!member.passwordSalt || !member.passwordHash) return null;
  const { hashHex } = scryptHash(password, member.passwordSalt);
  const ok = timingSafeEqHex(hashHex, member.passwordHash);
  if (!ok) return null;
  return member;
}

async function indexMember(member) {
  if (!hasKv()) return;
  const s = scoreFor(member.updatedAt || member.createdAt || nowIso());
  await kvZAdd("team:index", s, String(member.id));
}

export async function saveTeamMember(input) {
  if (!hasKv()) return null;
  const id = input?.id ? String(input.id) : crypto.randomUUID();
  const createdAt = input?.createdAt || nowIso();
  const updatedAt = nowIso();

  const member = {
    id,
    createdAt,
    updatedAt,
    name: input?.name ? String(input.name).slice(0, 80) : "Team member",
    username: input?.username ? String(input.username).slice(0, 40) : `user_${id.slice(0, 6)}`,
    role: TEAM_ROLES.includes(String(input?.role)) ? String(input.role) : "mc_owner",
    phone: input?.phone ? String(input.phone).slice(0, 40) : null,
    email: input?.email ? String(input.email).slice(0, 120) : null,
    // Password fields optional in writes; only stored when set/reset.
    passwordSalt: input?.passwordSalt || null,
    passwordHash: input?.passwordHash || null
  };

  await kvSet(memberKey(id), member);
  await kvSet(usernameKey(member.username), id);
  await indexMember(member);
  return member;
}

export async function getTeamMemberById(id) {
  if (!hasKv()) return null;
  return maybeParseJson(await kvGet(memberKey(id)));
}

export async function getTeamMemberByUsername(username) {
  if (!hasKv()) return null;
  const id = maybeParseJson(await kvGet(usernameKey(username)));
  if (!id) return null;
  return getTeamMemberById(String(id));
}

export async function listTeamMemberIds({ limit = 50 } = {}) {
  if (!hasKv()) return [];
  const safeLimit = Math.max(1, Math.min(200, Number(limit) || 50));
  const res = await kvZRevRange("team:index", 0, safeLimit - 1);
  if (res.length) return res.map(String);
  const keys = await kvKeys("team:*");
  return keys
    .filter((k) => k.startsWith("team:") && !k.startsWith("teamByUsername:"))
    .map((k) => k.slice("team:".length))
    .slice(0, safeLimit);
}

export async function listTeamMembers({ limit = 50 } = {}) {
  const ids = await listTeamMemberIds({ limit });
  const list = await Promise.all(ids.map((id) => getTeamMemberById(id)));
  const filtered = list.filter((m) => m && typeof m === "object");
  return filtered.sort((a, b) => scoreFor(b.updatedAt || b.createdAt) - scoreFor(a.updatedAt || a.createdAt));
}

export async function createTeamMemberWithPassword({ name, username, password, role, phone, email }) {
  if (!hasKv()) return null;
  const { saltHex, hashHex } = scryptHash(password);
  return saveTeamMember({
    name,
    username,
    role,
    phone,
    email,
    passwordSalt: saltHex,
    passwordHash: hashHex
  });
}

export async function setTeamMemberPassword({ id, password }) {
  if (!hasKv()) return null;
  const existing = await getTeamMemberById(id);
  if (!existing) return null;
  const { saltHex, hashHex } = scryptHash(password);
  return saveTeamMember({
    ...existing,
    id: String(existing.id),
    passwordSalt: saltHex,
    passwordHash: hashHex
  });
}

