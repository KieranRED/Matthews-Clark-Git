# Matthews & Clark CRM — MCP server

Exposes the CRM (leads, clients, jobs, tasks, team, content) to Claude via the
Model Context Protocol. Most read tools are safe lookup/reporting helpers; write
tools are available for controlled CRM maintenance such as creating leads,
scheduling jobs, adding custom service/package lines, adding true upsells, and
managing tasks.

## Tools

| Tool | Purpose |
| --- | --- |
| `search_crm` | Find clients/leads by name, phone, or email |
| `list_leads` / `get_lead` | Leads (newest first), with linked client |
| `list_clients` / `get_client` | Clients, with full lead history |
| `list_jobs` / `get_job` | Jobs, with linked client |
| `list_tasks` / `get_task` | Tasks (by due date) |
| `list_team_members` | Team — **credentials stripped** |
| `list_content_posts` / `get_content_post` | Social/content posts |
| `dashboard_summary` | Counts + pipeline-by-status snapshot |
| `create_lead` | Create a lead and link/create the matching client |
| `create_job_for_lead` | Create a scheduled job from an existing lead |
| `add_custom_service_line` | Add a one-off custom service/package line (`additive` or `replacement`) |
| `update_custom_service_line` / `delete_custom_service_line` | Edit or remove custom service/package lines |
| `add_upsell_line` | Add a true additive upsell/add-on line; optional vendor cost reduces commission |
| `update_upsell_line` / `delete_upsell_line` | Edit or remove true upsell/add-on lines |
| `add_invoice_service_line` / `update_invoice_service_line` / `delete_invoice_service_line` | Compatibility aliases for custom service/package lines |
| `update_lead_services` / `update_service_details` | Correct lead service selections and service detail fields |
| `update_lead_status` / `update_lead_field` / `add_lead_note` | Maintain lead pipeline data |
| `create_task` / `update_task` / `complete_task` | Manage CRM tasks |

## Architecture

```
mcp/core.js          tool definitions (shared) — imports lib/*Store.js
mcp/local.js         stdio entrypoint → Claude Desktop / Code
mcp/register.mjs     loads "@/" alias + env, used by local.js only
mcp/alias-hook.mjs   "@/" → file resolver for plain Node
app/api/[transport]/route.js   remote HTTP entrypoint → claude.ai
```

The KV/Upstash credentials live **only in Vercel** (Production/Preview). Local
`.env.local` keeps them blank so `next dev` never touches production data.

---

## A) Local (Claude Desktop / Claude Code)

The local server needs real KV creds on disk. Pull them into a dedicated,
gitignored file (this puts the production Upstash token on your machine):

```bash
vercel env pull .env.mcp.local --environment=production
```

`register.mjs` loads `.env.mcp.local` first, then falls back to `.env.local`.

Test it:

```bash
node --import ./mcp/register.mjs mcp/local.js
```

Add to Claude Desktop (`claude_desktop_config.json`) or Claude Code MCP config:

```json
{
  "mcpServers": {
    "matthews-clark-crm": {
      "command": "node",
      "args": ["--import", "./mcp/register.mjs", "mcp/local.js"],
      "cwd": "/Users/kieranredpath/Documents/Matthews&Clark"
    }
  }
}
```

---

## B) Remote (claude.ai web)

Set a bearer token in Vercel and redeploy:

```bash
# generate a long random token
openssl rand -hex 32
vercel env add MCP_BEARER_TOKEN production
```

The endpoint is **disabled (503) until `MCP_BEARER_TOKEN` is set**. Once set,
connect a custom connector in claude.ai to:

```
https://<your-domain>/api/mcp
```

with header `Authorization: Bearer <token>`.

---

## Adding more writes later

Add new tools in `mcp/core.js` (one place, both transports get them). Reuse the
existing patch-based store functions where possible. For especially destructive
or high-privilege mutations, consider a separate token or per-tool gating.
