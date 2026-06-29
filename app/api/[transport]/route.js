// Remote MCP endpoint (Streamable HTTP) for claude.ai and other remote clients.
//
// Connect a client to:  https://<your-domain>/api/mcp
//
// Closed by default: until MCP_BEARER_TOKEN is set in the environment the
// endpoint returns 503. When set, every request must send
//   Authorization: Bearer <MCP_BEARER_TOKEN>
//
// This dynamic [transport] segment sits beside the existing static /api/*
// routes; static segments win, so /api/admin, /api/cron, etc. are unaffected.

import crypto from "node:crypto";

import { createMcpHandler } from "mcp-handler";

import { registerTools } from "@/mcp/core";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const baseHandler = createMcpHandler(
  (server) => registerTools(server),
  {},
  { basePath: "/api", maxDuration: 60 }
);

function constantTimeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function json(status, body, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...extraHeaders }
  });
}

async function handler(req) {
  const token = process.env.MCP_BEARER_TOKEN;
  if (!token) {
    return json(503, { error: "MCP remote endpoint is disabled (MCP_BEARER_TOKEN not set)" });
  }

  // Accept the secret two ways:
  //  1. Authorization: Bearer <token>   — for Claude Code / Desktop (header-capable)
  //  2. ?key=<token> in the URL          — for the claude.ai web connector, whose
  //     UI only takes a URL (+ optional OAuth) and has no header field. This is a
  //     "capability URL": the secret lives in the URL itself.
  const authHeader = req.headers.get("authorization") || "";
  const headerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  const queryToken = (() => {
    try {
      return new URL(req.url).searchParams.get("key") || "";
    } catch {
      return "";
    }
  })();
  const provided = headerToken || queryToken;
  if (!provided || !constantTimeEqual(provided, token)) {
    return json(401, { error: "unauthorized" }, { "WWW-Authenticate": "Bearer" });
  }

  return baseHandler(req);
}

export { handler as GET, handler as POST, handler as DELETE };
