// Local stdio MCP server for Claude Desktop / Claude Code.
//
// Run with the alias + env bootstrap:
//   node --import ./mcp/register.mjs mcp/local.js
//
// It speaks MCP over stdio, so it must NOT print anything to stdout except the
// protocol stream — all diagnostics go to stderr.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { registerTools, SERVER_INFO } from "./core.js";

async function main() {
  const server = new McpServer(SERVER_INFO);
  registerTools(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`[mcp] ${SERVER_INFO.name} v${SERVER_INFO.version} ready on stdio`);
}

main().catch((err) => {
  console.error("[mcp] fatal:", err);
  process.exit(1);
});
