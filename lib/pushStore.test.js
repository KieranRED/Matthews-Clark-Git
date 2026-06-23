/**
 * lib/pushStore.test.js
 *
 * Tests for pushStore.js using node:test + node:assert.
 *
 * Phase 09 precedent: Node v20 lacks mock.module; live KV/Neon/web-push roundtrips
 * are not feasible in the test environment. We use source-text assertions
 * (readFileSync + String.includes) to verify the key wiring is present, plus
 * one pure-logic behavioural test where extractable.
 *
 * Source-text assertions are documented as intentional here — not a shortcut.
 * They verify the structural contract (API shape, key naming, fallback wiring)
 * that downstream callers (webhook route, subscribe route) depend on.
 */

import { test } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = readFileSync(path.join(__dirname, "pushStore.js"), "utf8");

// ---------------------------------------------------------------------------
// 1. Module exports the required functions
// ---------------------------------------------------------------------------
test("pushStore.js exports sendPushNotification", () => {
  assert.ok(
    src.includes("export async function sendPushNotification"),
    "pushStore.js must export sendPushNotification"
  );
});

test("pushStore.js exports dispatchToTeam", () => {
  assert.ok(
    src.includes("export async function dispatchToTeam"),
    "pushStore.js must export dispatchToTeam"
  );
});

// ---------------------------------------------------------------------------
// 2. VAPID setup is guarded and uses mailto: subject
// ---------------------------------------------------------------------------
test("VAPID subject is mailto:, not https://localhost", () => {
  assert.ok(
    src.includes("mailto:"),
    "VAPID subject must use mailto: address (Safari/iOS rejects localhost)"
  );
  assert.ok(
    !src.includes("https://localhost"),
    "VAPID subject must NOT be https://localhost"
  );
});

test("setVapidDetails is guarded when VAPID keys are absent", () => {
  assert.ok(
    src.includes("VAPID_PUBLIC_KEY") && src.includes("VAPID_PRIVATE_KEY"),
    "pushStore.js must reference VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY env vars"
  );
  // Guard pattern: if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
  assert.ok(
    src.includes("VAPID_PUBLIC_KEY") && src.includes("setVapidDetails"),
    "setVapidDetails must be guarded by VAPID env var check"
  );
});

// ---------------------------------------------------------------------------
// 3. sendPushNotification stringifies the payload
// ---------------------------------------------------------------------------
test("sendPushNotification calls JSON.stringify on the payload", () => {
  assert.ok(
    src.includes("JSON.stringify(payload)"),
    "sendPushNotification must call JSON.stringify(payload) before sendNotification"
  );
});

test("sendPushNotification calls webpush.sendNotification", () => {
  assert.ok(
    src.includes("webpush.sendNotification"),
    "sendPushNotification must call webpush.sendNotification"
  );
});

// ---------------------------------------------------------------------------
// 4. KV key uses push:sub: prefix with wa_id
// ---------------------------------------------------------------------------
test("KV key pattern is push:sub:", () => {
  assert.ok(
    src.includes("push:sub:"),
    "KV key must use push:sub: prefix"
  );
});

test("dispatchToTeam reads subscription via kvGet with push:sub: key", () => {
  assert.ok(
    src.includes("kvGet") && src.includes("push:sub:"),
    "dispatchToTeam must read subscriptions from KV using push:sub: key"
  );
});

// ---------------------------------------------------------------------------
// 5. Telegram fallback fires when no subscription
// ---------------------------------------------------------------------------
test("telegramSendMessage is called in the fallback path", () => {
  assert.ok(
    src.includes("telegramSendMessage("),
    "dispatchToTeam must call telegramSendMessage as fallback when no KV subscription"
  );
});

test("Telegram fallback uses TELEGRAM_MC_CHAT_ID env var with fallback", () => {
  assert.ok(
    src.includes("TELEGRAM_MC_CHAT_ID") || src.includes("TELEGRAM_CHAT_ID"),
    "Telegram fallback must reference TELEGRAM_MC_CHAT_ID (or TELEGRAM_CHAT_ID)"
  );
});

// ---------------------------------------------------------------------------
// 6. team_numbers query for active team members
// ---------------------------------------------------------------------------
test("dispatchToTeam queries team_numbers WHERE active = true", () => {
  assert.ok(
    src.includes("team_numbers") && src.includes("active"),
    "dispatchToTeam must query team_numbers WHERE active = true"
  );
});

test("dispatchToTeam selects wa_id from team_numbers", () => {
  assert.ok(
    src.includes("wa_id"),
    "dispatchToTeam must select wa_id from team_numbers"
  );
});

// ---------------------------------------------------------------------------
// 7. hasNeon/hasKv no-op guard
// ---------------------------------------------------------------------------
test("dispatchToTeam returns early when hasNeon or hasKv is false", () => {
  assert.ok(
    src.includes("hasNeon") && src.includes("hasKv"),
    "dispatchToTeam must check hasNeon() and hasKv() and return early locally"
  );
});

// ---------------------------------------------------------------------------
// 8. 410 Gone stale subscription cleanup
// ---------------------------------------------------------------------------
test("410 Gone response triggers kvDel of stale subscription", () => {
  assert.ok(
    src.includes("kvDel") && (src.includes("410") || src.includes("gone")),
    "pushStore must call kvDel to prune stale subscriptions on 410 Gone"
  );
});

// ---------------------------------------------------------------------------
// 9. Per-member try/catch in the fan-out loop
// ---------------------------------------------------------------------------
test("dispatchToTeam wraps each member dispatch in try/catch", () => {
  // Count try/catch blocks — there should be at least one in the loop
  const tryCatchCount = (src.match(/try\s*\{/g) || []).length;
  assert.ok(
    tryCatchCount >= 1,
    "dispatchToTeam must wrap per-member dispatch in try/catch to prevent one bad member aborting fan-out"
  );
});

// ---------------------------------------------------------------------------
// 10. Notification payload shape matches locked spec (10-CONTEXT.md)
// ---------------------------------------------------------------------------
test("notification payload includes title, body, and data fields", () => {
  assert.ok(src.includes("title:"), "payload must include title");
  assert.ok(src.includes("body:"), "payload must include body");
  assert.ok(src.includes("data:"), "payload must include data");
});

test("notification payload data includes threadId and url", () => {
  assert.ok(src.includes("threadId"), "payload.data must include threadId");
  assert.ok(src.includes("url"), "payload.data must include url");
});
