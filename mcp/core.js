// Shared, transport-agnostic tool definitions for the Matthews & Clark CRM MCP.
//
// `registerTools(server)` attaches every tool to an McpServer instance. Both
// entrypoints — the local stdio server (mcp/local.js) and the remote HTTP route
// (app/api/mcp/route.js) — call this, so the tool surface is defined exactly once.

import crypto from "node:crypto";
import { z } from "zod";

import {
  listLeads,
  getLead,
  saveLead,
  updateLead,
  upsertClientForLead,
  listClients,
  getClient,
  listClientLeadIds,
  getClientIdByEmail,
  normalizePhone
} from "@/lib/leadStore";
import { listJobs, getJob, saveJob } from "@/lib/jobStore";
import { listTasks, getTask, saveTask, updateTask } from "@/lib/taskStore";
import { listTeamMembers } from "@/lib/teamStore";
import { listPosts, getPost } from "@/lib/contentStore";
import { SERVICES, STAGES, SOURCES } from "@/lib/crmKitAdapter";
import { allocateInvoiceDigits } from "@/lib/invoiceSeq";

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

/** Wrap any JS value as an MCP text result containing pretty JSON. */
function jsonResult(value) {
  return {
    content: [{ type: "text", text: JSON.stringify(value, null, 2) }]
  };
}

/** Strip anything credential-shaped from a record before it leaves the server. */
const SECRET_KEY = /pass|hash|salt|secret|token/i;
function sanitize(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const out = Array.isArray(obj) ? [] : {};
  for (const [k, v] of Object.entries(obj)) {
    if (SECRET_KEY.test(k)) continue;
    out[k] = v && typeof v === "object" ? sanitize(v) : v;
  }
  return out;
}

function normEmail(input) {
  return String(input || "").trim().toLowerCase();
}

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function serviceLabel(id) {
  const key = String(id || "");
  return SERVICES.find((s) => s.id === key)?.label || key;
}

function splitName(fullName) {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { firstName: parts[0] || "", surname: "" };
  return { firstName: parts.slice(0, -1).join(" "), surname: parts.at(-1) || "" };
}

function vehicleFromLead(lead) {
  return {
    make: lead?.make || null,
    model: lead?.model || null,
    year: lead?.year || null,
    label: lead?.car || null
  };
}

function invoiceLines(lead) {
  return Array.isArray(lead?.upsells) ? lead.upsells : [];
}

function findInvoiceLine(lead, lineId) {
  const id = String(lineId || "");
  return invoiceLines(lead).find((line) => String(line?.id || "") === id) || null;
}

// ---------------------------------------------------------------------------
// tool registration
// ---------------------------------------------------------------------------

export function registerTools(server) {
  // -- search ---------------------------------------------------------------
  server.tool(
    "search_crm",
    "Search leads and clients by name, phone, or email. Returns matching clients and leads. Use this first when looking up a specific person.",
    {
      query: z.string().min(1).describe("Name, phone number, or email to search for"),
      limit: z.number().int().min(1).max(2500).optional().describe("Max recent records to scan (default 500)")
    },
    async ({ query, limit }) => {
      const scan = limit || 500;
      const q = String(query).trim();
      const qLower = q.toLowerCase();
      const phone = normalizePhone(q);
      const email = normEmail(q);

      const [clients, leads] = await Promise.all([
        listClients({ limit: scan }),
        listLeads({ limit: scan })
      ]);

      const matchClient = (c) => {
        const hay = [c.name, c.phone, c.phoneNorm, c.email].map((v) => String(v || "").toLowerCase());
        return (
          (qLower && hay.some((h) => h.includes(qLower))) ||
          (phone && String(c.phoneNorm || "").includes(phone)) ||
          (email && normEmail(c.email) === email)
        );
      };
      const matchLead = (l) => {
        const hay = [l.name, l.number, l.email, l.car].map((v) => String(v || "").toLowerCase());
        return (
          (qLower && hay.some((h) => h.includes(qLower))) ||
          (phone && normalizePhone(l.number).includes(phone)) ||
          (email && normEmail(l.email) === email)
        );
      };

      // Exact client-by-email lookup catches clients outside the recent scan window.
      let exactClient = null;
      if (email) {
        const id = await getClientIdByEmail(email).catch(() => null);
        if (id) exactClient = await getClient(id).catch(() => null);
      }

      const clientMatches = clients.filter(matchClient);
      if (exactClient && !clientMatches.some((c) => c.id === exactClient.id)) {
        clientMatches.unshift(exactClient);
      }

      return jsonResult({
        query: q,
        clients: clientMatches,
        leads: leads.filter(matchLead)
      });
    }
  );

  // -- leads ----------------------------------------------------------------
  server.tool(
    "list_leads",
    "List leads, newest first. Optionally filter by status.",
    {
      limit: z.number().int().min(1).max(2500).optional().describe("Max leads to return (default 50)"),
      status: z.string().optional().describe("Filter by lead status, e.g. 'new', 'contacted'")
    },
    async ({ limit, status }) => jsonResult(await listLeads({ limit: limit || 50, status }))
  );

  server.tool(
    "get_lead",
    "Get one lead by id, including its linked client (if any).",
    { id: z.string().min(1).describe("Lead id") },
    async ({ id }) => {
      const lead = await getLead(id);
      if (!lead) return jsonResult({ error: "Lead not found", id });
      const client = lead.clientId ? await getClient(lead.clientId).catch(() => null) : null;
      return jsonResult({ lead, client });
    }
  );

  // -- clients --------------------------------------------------------------
  server.tool(
    "list_clients",
    "List clients, most recently updated first.",
    { limit: z.number().int().min(1).max(2500).optional().describe("Max clients to return (default 50)") },
    async ({ limit }) => jsonResult(await listClients({ limit: limit || 50 }))
  );

  server.tool(
    "get_client",
    "Get one client by id, including their full lead history.",
    {
      id: z.string().min(1).describe("Client id"),
      leadLimit: z.number().int().min(1).max(200).optional().describe("Max leads to include (default 50)")
    },
    async ({ id, leadLimit }) => {
      const client = await getClient(id);
      if (!client) return jsonResult({ error: "Client not found", id });
      const leadIds = await listClientLeadIds({ clientId: id, limit: leadLimit || 50 });
      const leads = (await Promise.all(leadIds.map((lid) => getLead(lid)))).filter(Boolean);
      return jsonResult({ client, leads });
    }
  );

  // -- jobs -----------------------------------------------------------------
  server.tool(
    "list_jobs",
    "List jobs, most recently updated first. Optionally filter by status.",
    {
      limit: z.number().int().min(1).max(500).optional().describe("Max jobs to return (default 50)"),
      status: z.string().optional().describe("Filter by job status, e.g. 'scheduled', 'completed'")
    },
    async ({ limit, status }) => jsonResult(await listJobs({ limit: limit || 50, status }))
  );

  server.tool(
    "get_job",
    "Get one job by id, including its linked client.",
    { id: z.string().min(1).describe("Job id") },
    async ({ id }) => {
      const job = await getJob(id);
      if (!job) return jsonResult({ error: "Job not found", id });
      const client = job.clientId ? await getClient(job.clientId).catch(() => null) : null;
      return jsonResult({ job, client });
    }
  );

  // -- tasks ----------------------------------------------------------------
  server.tool(
    "list_tasks",
    "List tasks ordered by due date. Optionally filter by status (open | done | canceled).",
    {
      limit: z.number().int().min(1).max(500).optional().describe("Max tasks to return (default 50)"),
      status: z.string().optional().describe("Filter by task status: open, done, or canceled")
    },
    async ({ limit, status }) => jsonResult(await listTasks({ limit: limit || 50, status }))
  );

  server.tool(
    "get_task",
    "Get one task by id.",
    { id: z.string().min(1).describe("Task id") },
    async ({ id }) => {
      const task = await getTask(id);
      return jsonResult(task || { error: "Task not found", id });
    }
  );

  // -- team -----------------------------------------------------------------
  server.tool(
    "list_team_members",
    "List team members. Credentials (password hashes/salts) are never returned.",
    { limit: z.number().int().min(1).max(200).optional().describe("Max members to return (default 50)") },
    async ({ limit }) => jsonResult(sanitize(await listTeamMembers({ limit: limit || 50 })))
  );

  // -- content --------------------------------------------------------------
  server.tool(
    "list_content_posts",
    "List social/content posts, newest first. Optionally filter by status.",
    {
      limit: z.number().int().min(1).max(500).optional().describe("Max posts to return (default 50)"),
      status: z.string().optional().describe("Filter by post status, e.g. 'draft', 'scheduled', 'published'")
    },
    async ({ limit, status }) => jsonResult(await listPosts({ limit: limit || 50, status }))
  );

  server.tool(
    "get_content_post",
    "Get one content post by id.",
    { id: z.string().min(1).describe("Content post id") },
    async ({ id }) => {
      const post = await getPost(id);
      return jsonResult(post || { error: "Post not found", id });
    }
  );

  // -- services / taxonomy --------------------------------------------------
  server.tool(
    "list_services",
    "List the services Matthews & Clark offers (the canonical service catalog used across the CRM), plus the pipeline stages and lead sources.",
    {},
    async () =>
      jsonResult({
        services: SERVICES,
        pipelineStages: STAGES,
        leadSources: SOURCES
      })
  );

  // -- dashboard ------------------------------------------------------------
  server.tool(
    "dashboard_summary",
    "High-level snapshot: counts of clients, recent leads by status, jobs by status, and open tasks. Use this to orient before drilling in.",
    {},
    async () => {
      const [leads, clients, jobs, tasks] = await Promise.all([
        listLeads({ limit: 2500 }),
        listClients({ limit: 2500 }),
        listJobs({ limit: 500 }),
        listTasks({ limit: 500 })
      ]);

      const tally = (arr, key) =>
        arr.reduce((acc, item) => {
          const k = String(item[key] || "unknown").toLowerCase();
          acc[k] = (acc[k] || 0) + 1;
          return acc;
        }, {});

      return jsonResult({
        generatedAt: new Date().toISOString(),
        totals: {
          clients: clients.length,
          leads: leads.length,
          jobs: jobs.length,
          tasks: tasks.length
        },
        leadsByStatus: tally(leads, "status"),
        jobsByStatus: tally(jobs, "status"),
        tasksByStatus: tally(tasks, "status"),
        openTasks: tasks.filter((t) => String(t.status || "").toLowerCase() === "open").length
      });
    }
  );
  // -- write: leads ----------------------------------------------------------

  const SERVICE_IDS = SERVICES.map((s) => s.id);
  const LEAD_STATUSES = ["new", "called", "quoted", "booked", "in_progress", "completed", "lost"];
  const LEAD_SOURCES = ["WEBSITE", "INSTAGRAM", "TIKTOK", "ADS", "MCP"];
  const EDITABLE_FIELDS = ["name", "phone", "car", "timeframe", "source", "lane"];
  const DETAIL_SERVICES = ["ppf", "wrap", "tint", "ceramic", "correct", "detail", "wheel", "kit"];

  server.tool(
    "create_lead",
    "Create a new CRM lead and link/create the matching client by phone/email. Use this when a new enquiry arrives outside the website lead form.",
    {
      name: z.string().min(1).max(160).describe("Client full name"),
      number: z.string().min(7).max(40).describe("Client phone number"),
      email: z.string().email().optional().describe("Client email address, if known"),
      car: z.string().min(1).max(160).describe("Vehicle label, e.g. 2020 BMW M2 Competition"),
      services: z.array(z.enum(SERVICE_IDS)).min(1).default(["unsure"]).describe(`Requested services. Valid ids: ${SERVICE_IDS.join(", ")}`),
      serviceDetails: z.record(z.any()).optional().describe("Optional per-service details keyed by service id"),
      surname: z.string().max(80).optional().describe("Client surname if you want to override the split from name"),
      make: z.string().max(60).optional(),
      model: z.string().max(60).optional(),
      year: z.string().max(10).optional(),
      lane: z.enum(["protect", "present", "both"]).default("both"),
      timeframe: z.enum(["this-week", "this-month", "no-rush"]).default("no-rush"),
      source: z.enum(LEAD_SOURCES).default("MCP"),
      status: z.enum(LEAD_STATUSES).default("new"),
      note: z.string().max(2000).optional().describe("Optional initial note")
    },
    async ({ name, number, email, car, services, serviceDetails, surname, make, model, year, lane, timeframe, source, status, note }) => {
      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      const split = splitName(name);
      const firstName = split.firstName || name;
      const leadRecord = {
        id,
        firstName,
        surname: surname || split.surname || "",
        name: String(name).trim(),
        number: String(number).trim(),
        email: email ? String(email).trim() : null,
        car: String(car).trim(),
        make: make || null,
        model: model || null,
        year: year || null,
        services,
        serviceDetails: serviceDetails && typeof serviceDetails === "object" ? serviceDetails : {},
        lane,
        timeframe,
        source,
        status,
        createdAt: now,
        updatedAt: now,
        mcpNotes: note ? [{ text: note, createdAt: now, via: "mcp" }] : []
      };

      const client = await upsertClientForLead(leadRecord).catch((err) => ({ error: err?.message || String(err) }));
      if (client?.id) leadRecord.clientId = client.id;
      await saveLead(leadRecord);
      return jsonResult({ ok: true, lead: leadRecord, client: client?.error ? null : client, clientError: client?.error || null });
    }
  );

  server.tool(
    "update_service_details",
    "Update the detail fields for a specific service on a lead (e.g. wrap finish, scope, colour; PPF coverage; tint shade). Pass only the fields you want to change — others are preserved. Service must be one of: ppf, wrap, tint, ceramic, correct, detail, wheel, kit.",
    {
      leadId: z.string().min(1).describe("Lead ID"),
      service: z.enum(DETAIL_SERVICES).describe("Which service's details to update"),
      fields: z.record(z.union([z.string(), z.boolean(), z.array(z.string()), z.null()])).describe(
        "Key/value pairs to merge into the service detail. wrap: scope, finish, colour, doorJambs, panels, parts, notes. ppf: coverage, film, doorJambs, panels, notes. tint: windows, shade, notes. ceramic: package, wheels, glass, trim, notes. correct: stage, notes. detail: kind, notes. wheel: service, finish, colour, notes. kit: notes."
      )
    },
    async ({ leadId, service, fields }) => {
      const lead = await getLead(leadId);
      if (!lead) return jsonResult({ error: "Lead not found", leadId });
      const existing = (lead.serviceDetails && typeof lead.serviceDetails === "object") ? lead.serviceDetails : {};
      const existingService = (existing[service] && typeof existing[service] === "object") ? existing[service] : {};
      const merged = { ...existingService, ...fields };
      const updated = await updateLead(leadId, {
        serviceDetails: { ...existing, [service]: merged }
      });
      return jsonResult({ ok: true, leadId, service, details: updated.serviceDetails?.[service] });
    }
  );

  server.tool(
    "update_lead_services",
    "Replace the services selected on a lead. Use when a client made a mistake or changed their mind. Pass the full desired services array.",
    {
      leadId: z.string().min(1).describe("Lead ID"),
      services: z.array(z.enum(SERVICE_IDS)).min(1).describe(`New services list. Valid ids: ${SERVICE_IDS.join(", ")}`)
    },
    async ({ leadId, services }) => {
      const lead = await getLead(leadId);
      if (!lead) return jsonResult({ error: "Lead not found", leadId });
      const updated = await updateLead(leadId, { services });
      return jsonResult({ ok: true, leadId, services: updated.services });
    }
  );

  server.tool(
    "update_lead_status",
    "Move a lead to a different pipeline stage. Valid statuses: new, called, quoted, booked, in_progress, completed, lost.",
    {
      leadId: z.string().min(1).describe("Lead ID"),
      status: z.enum(LEAD_STATUSES).describe("New status")
    },
    async ({ leadId, status }) => {
      const lead = await getLead(leadId);
      if (!lead) return jsonResult({ error: "Lead not found", leadId });
      const updated = await updateLead(leadId, { status });
      return jsonResult({ ok: true, leadId, status: updated.status });
    }
  );

  server.tool(
    "update_lead_field",
    "Correct a single field on a lead: name, phone, car, timeframe, source, or lane.",
    {
      leadId: z.string().min(1).describe("Lead ID"),
      field: z.enum(EDITABLE_FIELDS).describe("Field to update"),
      value: z.string().min(1).max(500).describe("New value")
    },
    async ({ leadId, field, value }) => {
      const lead = await getLead(leadId);
      if (!lead) return jsonResult({ error: "Lead not found", leadId });
      if (field === "source" && !LEAD_SOURCES.includes(value.toUpperCase())) {
        return jsonResult({ error: `Invalid source. Valid values: ${LEAD_SOURCES.join(", ")}` });
      }
      const patch = { [field]: field === "source" ? value.toUpperCase() : value };
      if (field === "phone") {
        patch.number = value;
        delete patch.phone;
      }
      const updated = await updateLead(leadId, patch);
      return jsonResult({ ok: true, leadId, field, value: field === "phone" ? updated.number : updated[field] });
    }
  );

  server.tool(
    "add_lead_note",
    "Append a freeform note to a lead. Notes are timestamped and never overwrite existing ones.",
    {
      leadId: z.string().min(1).describe("Lead ID"),
      note: z.string().min(1).max(2000).describe("Note text")
    },
    async ({ leadId, note }) => {
      const lead = await getLead(leadId);
      if (!lead) return jsonResult({ error: "Lead not found", leadId });
      const existing = Array.isArray(lead.mcpNotes) ? lead.mcpNotes : [];
      const entry = { text: note, createdAt: new Date().toISOString(), via: "mcp" };
      const updated = await updateLead(leadId, { mcpNotes: [...existing, entry] });
      return jsonResult({ ok: true, leadId, note: entry, totalNotes: updated.mcpNotes.length });
    }
  );

  // -- write: jobs / invoices ------------------------------------------------

  server.tool(
    "create_job_for_lead",
    "Create a scheduled job from an existing lead. The job inherits the lead's client, vehicle, and services unless you override them.",
    {
      leadId: z.string().min(1).describe("Lead ID to convert/schedule"),
      scheduledAt: z.string().datetime().nullable().optional().describe("Optional scheduled date/time in ISO 8601 format"),
      services: z.array(z.enum(SERVICE_IDS)).optional().describe("Override services for the job; defaults to the lead services"),
      status: z.enum(["scheduled", "in_progress", "completed", "canceled"]).default("scheduled"),
      quoteAmount: z.number().finite().min(0).nullable().optional(),
      jobValue: z.number().finite().min(0).nullable().optional(),
      paidAmount: z.number().finite().min(0).nullable().optional(),
      paymentStatus: z.enum(["unpaid", "deposit_paid", "paid"]).default("unpaid"),
      note: z.string().max(2000).optional(),
      updateLeadStatus: z.boolean().default(true).describe("When true, marks the lead as booked")
    },
    async ({ leadId, scheduledAt, services, status, quoteAmount, jobValue, paidAmount, paymentStatus, note, updateLeadStatus }) => {
      const lead = await getLead(leadId);
      if (!lead) return jsonResult({ error: "Lead not found", leadId });
      const client = lead.clientId ? null : await upsertClientForLead(lead).catch(() => null);
      const clientId = lead.clientId || client?.id || null;
      const job = await saveJob({
        clientId,
        leadId,
        status,
        vehicle: vehicleFromLead(lead),
        services: Array.isArray(services) && services.length ? services : Array.isArray(lead.services) ? lead.services : [],
        scheduledAt: scheduledAt || null,
        quoteAmount: quoteAmount ?? lead.quoteAmount ?? null,
        jobValue: jobValue ?? lead.jobValue ?? null,
        paidAmount: paidAmount ?? null,
        paymentStatus,
        notes: [{ at: new Date().toISOString(), by: "mcp", text: note || "Created from MCP" }]
      });
      let updatedLead = lead;
      if (updateLeadStatus) {
        updatedLead = await updateLead(leadId, {
          status: "booked",
          jobId: job?.id || lead.jobId || null,
          clientId,
          updatedAt: new Date().toISOString()
        });
      }
      return jsonResult({ ok: true, job: sanitize(job), lead: updatedLead });
    }
  );

  server.tool(
    "add_invoice_service_line",
    "Add a priced one-off service line to a lead's invoice. The line can be fully custom or based on an existing service catalog id.",
    {
      leadId: z.string().min(1).describe("Lead ID whose invoice should receive the service line"),
      amountExVat: z.number().finite().positive().describe("Client price ex VAT/ZAR for this line"),
      label: z.string().min(1).max(200).optional().describe("Line item label. Required for fully custom lines; optional when serviceId is supplied"),
      serviceId: z.enum(SERVICE_IDS).optional().describe("Existing service catalog id this line is based on, if any"),
      notes: z.string().max(2000).optional(),
      billingMode: z.enum(["additive", "replacement"]).default("additive").describe("additive adds this line on top of the base invoice; replacement makes this line replace the base invoice package total"),
      vendorCostExVat: z.number().finite().min(0).optional().describe("Optional Izimoto/vendor cost ex VAT for commission tracking"),
      createInvoiceIfMissing: z.boolean().default(true).describe("Allocate an invoice number and mark the invoice due if the lead has no invoice yet")
    },
    async ({ leadId, amountExVat, label, serviceId, notes, billingMode, vendorCostExVat, createInvoiceIfMissing }) => {
      const lead = await getLead(leadId);
      if (!lead) return jsonResult({ error: "Lead not found", leadId });
      const now = new Date().toISOString();
      const lineLabel = String(label || (serviceId ? serviceLabel(serviceId) : "")).trim();
      if (!lineLabel) return jsonResult({ error: "Missing label for custom invoice line" });

      const requestId = vendorCostExVat != null && vendorCostExVat > 0 ? crypto.randomUUID() : null;
      const line = {
        id: crypto.randomUUID(),
        label: lineLabel,
        serviceId: serviceId || null,
        amountExVat: round2(amountExVat),
        notes: notes || null,
        billingMode,
        requestId,
        addedAt: now,
        addedBy: "mcp",
        source: "mcp"
      };

      const patch = {
        upsells: [...(Array.isArray(lead.upsells) ? lead.upsells : []), line],
        updatedAt: now
      };

      if (requestId) {
        patch.upsellRequests = [
          ...(Array.isArray(lead.upsellRequests) ? lead.upsellRequests : []),
          {
            id: requestId,
            service: serviceId || "custom",
            label: lineLabel,
            notes: notes || null,
            vendorExVat: round2(vendorCostExVat),
            status: "confirmed",
            requestedAt: now,
            requestedBy: "mcp",
            confirmedAt: now
          }
        ];
      }

      if (createInvoiceIfMissing && !lead.invoiceCreatedAt && !lead.quoteBuiltAt) {
        patch.invoiceCreatedAt = now;
        patch.invoiceNumber = lead.invoiceNumber || (await allocateInvoiceDigits()) || String(leadId).replace(/[^0-9]/g, "").slice(-5).padStart(5, "0");
        patch.invoiceStatus = lead.invoiceStatus || "due";
      }

      const updated = await updateLead(leadId, patch);
      return jsonResult({ ok: true, leadId, line, invoiceCreatedAt: updated?.invoiceCreatedAt || null, invoiceNumber: updated?.invoiceNumber || null });
    }
  );

  server.tool(
    "update_invoice_service_line",
    "Edit an existing one-off invoice service line on a lead. Use serviceId: null to remove catalog-based wording such as 'Based on: ...' from the rendered invoice.",
    {
      leadId: z.string().min(1).describe("Lead ID whose invoice line should be edited"),
      lineId: z.string().min(1).describe("Invoice service line id, from lead.upsells[].id"),
      label: z.string().min(1).max(200).optional().describe("New line item label"),
      amountExVat: z.number().finite().positive().optional().describe("New client price ex VAT/ZAR"),
      serviceId: z.enum(SERVICE_IDS).nullable().optional().describe("Catalog service this line is based on, or null for a fully custom invoice line"),
      notes: z.string().max(4000).nullable().optional().describe("New invoice brief. New lines render as separate bullets; no 'Notes:' label is shown."),
      billingMode: z.enum(["additive", "replacement"]).optional().describe("additive adds this line on top of the base invoice; replacement makes this line replace the base invoice package total"),
      vendorCostExVat: z.number().finite().min(0).nullable().optional().describe("Optional Izimoto/vendor cost ex VAT for commission tracking, or null to remove the tracked cost")
    },
    async ({ leadId, lineId, label, amountExVat, serviceId, notes, billingMode, vendorCostExVat }) => {
      const lead = await getLead(leadId);
      if (!lead) return jsonResult({ error: "Lead not found", leadId });
      const existingLine = findInvoiceLine(lead, lineId);
      if (!existingLine) return jsonResult({ error: "Invoice service line not found", leadId, lineId });

      const now = new Date().toISOString();
      const existing = invoiceLines(lead);
      let requestId = existingLine.requestId || null;

      const nextLine = {
        ...existingLine,
        updatedAt: now,
        updatedBy: "mcp"
      };
      if (label !== undefined) nextLine.label = label;
      if (amountExVat !== undefined) nextLine.amountExVat = round2(amountExVat);
      if (serviceId !== undefined) nextLine.serviceId = serviceId || null;
      if (notes !== undefined) nextLine.notes = notes || null;
      if (billingMode !== undefined) nextLine.billingMode = billingMode;

      const patch = {
        upsells: existing.map((line) => (String(line?.id || "") === String(lineId) ? nextLine : line)),
        updatedAt: now
      };

      if (vendorCostExVat !== undefined) {
        const requests = Array.isArray(lead.upsellRequests) ? lead.upsellRequests : [];
        if (vendorCostExVat == null) {
          patch.upsellRequests = requests.filter((req) => !requestId || String(req?.id || "") !== String(requestId));
          nextLine.requestId = null;
          patch.upsells = existing.map((line) => (String(line?.id || "") === String(lineId) ? nextLine : line));
        } else {
          if (!requestId) requestId = crypto.randomUUID();
          nextLine.requestId = requestId;
          const requestRecord = {
            id: requestId,
            service: nextLine.serviceId || "custom",
            label: nextLine.label,
            notes: nextLine.notes || null,
            vendorExVat: round2(vendorCostExVat),
            status: "confirmed",
            requestedAt: now,
            requestedBy: "mcp",
            confirmedAt: now,
            updatedAt: now
          };
          const found = requests.some((req) => String(req?.id || "") === String(requestId));
          patch.upsellRequests = found
            ? requests.map((req) => (String(req?.id || "") === String(requestId) ? { ...req, ...requestRecord } : req))
            : [...requests, requestRecord];
          patch.upsells = existing.map((line) => (String(line?.id || "") === String(lineId) ? nextLine : line));
        }
      }

      const updated = await updateLead(leadId, patch);
      return jsonResult({ ok: true, leadId, line: findInvoiceLine(updated, lineId) });
    }
  );

  server.tool(
    "delete_invoice_service_line",
    "Delete an existing one-off invoice service line from a lead. This removes the line from lead.upsells and its linked vendor-cost request if one exists.",
    {
      leadId: z.string().min(1).describe("Lead ID whose invoice line should be deleted"),
      lineId: z.string().min(1).describe("Invoice service line id, from lead.upsells[].id")
    },
    async ({ leadId, lineId }) => {
      const lead = await getLead(leadId);
      if (!lead) return jsonResult({ error: "Lead not found", leadId });
      const existingLine = findInvoiceLine(lead, lineId);
      if (!existingLine) return jsonResult({ error: "Invoice service line not found", leadId, lineId });

      const requestId = existingLine.requestId || null;
      const patch = {
        upsells: invoiceLines(lead).filter((line) => String(line?.id || "") !== String(lineId)),
        updatedAt: new Date().toISOString()
      };
      if (requestId) {
        patch.upsellRequests = (Array.isArray(lead.upsellRequests) ? lead.upsellRequests : []).filter(
          (req) => String(req?.id || "") !== String(requestId)
        );
      }
      const updated = await updateLead(leadId, patch);
      return jsonResult({ ok: true, leadId, deletedLine: existingLine, remainingLines: invoiceLines(updated).length });
    }
  );

  // -- write: tasks ----------------------------------------------------------

  server.tool(
    "create_task",
    "Create a new task, optionally linked to a lead or client.",
    {
      title: z.string().min(1).max(120).describe("Task title"),
      leadId: z.string().optional().describe("Lead ID to link this task to (optional)"),
      clientId: z.string().optional().describe("Client ID to link this task to (optional)"),
      dueAt: z.string().optional().describe("ISO 8601 due date/time (optional)"),
      assignedTo: z.string().optional().describe("Team member name or ID to assign to (optional)"),
      notes: z.string().optional().describe("Initial notes for the task (optional)")
    },
    async ({ title, leadId, clientId, dueAt, assignedTo, notes }) => {
      const task = await saveTask({
        title,
        leadId: leadId || null,
        clientId: clientId || null,
        dueAt: dueAt || null,
        assignedTo: assignedTo || null,
        notes: notes ? [{ text: notes, createdAt: new Date().toISOString() }] : []
      });
      return jsonResult({ ok: true, task: sanitize(task) });
    }
  );

  server.tool(
    "complete_task",
    "Mark a task as done.",
    {
      taskId: z.string().min(1).describe("Task ID")
    },
    async ({ taskId }) => {
      const task = await getTask(taskId);
      if (!task) return jsonResult({ error: "Task not found", taskId });
      const updated = await updateTask(taskId, { status: "done" });
      return jsonResult({ ok: true, taskId, status: updated.status });
    }
  );

  server.tool(
    "update_task",
    "Update a task's title, due date, assignee, notes, or status (open, done, canceled).",
    {
      taskId: z.string().min(1).describe("Task ID"),
      title: z.string().min(1).max(120).optional().describe("New title"),
      status: z.enum(["open", "done", "canceled"]).optional().describe("New status"),
      dueAt: z.string().nullable().optional().describe("New due date (ISO 8601), or null to clear"),
      assignedTo: z.string().nullable().optional().describe("New assignee, or null to clear"),
      note: z.string().max(2000).optional().describe("Append a note to the task")
    },
    async ({ taskId, title, status, dueAt, assignedTo, note }) => {
      const task = await getTask(taskId);
      if (!task) return jsonResult({ error: "Task not found", taskId });
      const patch = {};
      if (title !== undefined) patch.title = title;
      if (status !== undefined) patch.status = status;
      if (dueAt !== undefined) patch.dueAt = dueAt;
      if (assignedTo !== undefined) patch.assignedTo = assignedTo;
      if (note) {
        const existing = Array.isArray(task.notes) ? task.notes : [];
        patch.notes = [...existing, { text: note, createdAt: new Date().toISOString() }];
      }
      const updated = await updateTask(taskId, patch);
      return jsonResult({ ok: true, task: sanitize(updated) });
    }
  );
}

export const SERVER_INFO = { name: "matthews-clark-crm", version: "1.0.0" };
