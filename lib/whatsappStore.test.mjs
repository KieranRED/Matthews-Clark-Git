/**
 * lib/whatsappStore.test.mjs
 *
 * Plain node:test — no test framework dependencies.
 * Node v20 compatible (no mock.module — that requires v22+).
 *
 * Strategy:
 * - Source-text assertions for SQL idempotency strings (no DB needed)
 * - Import guards checked via hasNeon/hasKv env absence
 * - resolveCrmLink tested indirectly via source + shape checks
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORE_PATH = path.join(__dirname, "whatsappStore.js");
const SRC = await readFile(STORE_PATH, "utf8");

// ---------------------------------------------------------------------------
// Exported function shape tests (import without DB/KV env — hasNeon guard fires)
// ---------------------------------------------------------------------------

// Ensure DATABASE_URL and KV env vars are absent so the module no-ops safely
delete process.env.DATABASE_URL;
delete process.env.KV_REST_API_URL;
delete process.env.KV_REST_API_TOKEN;

const store = await import(path.join(__dirname, "whatsappStore.js"));

describe("exported function shapes", () => {
  it("processInboundMessage is exported as a function", () => {
    assert.equal(typeof store.processInboundMessage, "function");
  });

  it("resolveCrmLink is exported as a function", () => {
    assert.equal(typeof store.resolveCrmLink, "function");
  });

  it("upsertThread is exported as a function", () => {
    assert.equal(typeof store.upsertThread, "function");
  });

  it("insertInboundMessage is exported as a function", () => {
    assert.equal(typeof store.insertInboundMessage, "function");
  });

  it("linkThreadToLead is exported as a function", () => {
    assert.equal(typeof store.linkThreadToLead, "function");
  });
});

describe("processInboundMessage guard — no-ops when DATABASE_URL absent", () => {
  it("returns undefined (no-op) when hasNeon() is false", async () => {
    // DATABASE_URL is not set — processInboundMessage should return undefined
    const result = await store.processInboundMessage({
      wamid: "wamid.guard-test",
      from: "27820000001",
      to: "27820000002",
      type: "text",
      body: "guard test",
      timestampMs: "1749416383000",
      contactName: null,
    });
    assert.equal(result, undefined);
  });
});

describe("resolveCrmLink guard — returns nulls when hasKv() is false", () => {
  it("returns { crmClientId: null, crmLeadId: null } when KV absent", async () => {
    const result = await store.resolveCrmLink("27821234567");
    assert.deepEqual(result, { crmClientId: null, crmLeadId: null });
  });
});

// ---------------------------------------------------------------------------
// Source-text assertions — no DB connection needed
// ---------------------------------------------------------------------------

describe("SQL idempotency — source text", () => {
  it("contains ON CONFLICT (wamid) DO NOTHING", () => {
    assert.ok(
      SRC.includes("ON CONFLICT (wamid) DO NOTHING"),
      "Missing ON CONFLICT (wamid) DO NOTHING idempotency clause"
    );
  });

  it("contains ON CONFLICT (contact_wa_id, team_wa_id)", () => {
    assert.ok(
      SRC.includes("ON CONFLICT (contact_wa_id, team_wa_id)"),
      "Missing ON CONFLICT (contact_wa_id, team_wa_id) upsert clause"
    );
  });
});

describe("phone normalisation — source text", () => {
  it("imports normalizePhone from leadStore (not reimplemented)", () => {
    assert.ok(
      SRC.includes("normalizePhone"),
      "normalizePhone must be present in imports"
    );
    assert.ok(
      SRC.includes("leadStore"),
      "import must reference leadStore"
    );
    const hasLocalDef =
      /function normalizePhone/.test(SRC) ||
      /function normalisePhone/.test(SRC);
    assert.ok(
      !hasLocalDef,
      "normalizePhone must NOT be reimplemented in whatsappStore.js"
    );
  });
});

describe("auto-link — source text", () => {
  it("references clientByPhone: KV index key pattern", () => {
    assert.ok(
      SRC.includes("clientByPhone:"),
      "Must look up clientByPhone:{normalizedPhone} from KV for auto-linking"
    );
  });

  it("uses kvZRevRange for most-recent lead resolution", () => {
    assert.ok(
      SRC.includes("kvZRevRange"),
      "Must use kvZRevRange to get the most-recent lead ID for a client"
    );
  });
});
