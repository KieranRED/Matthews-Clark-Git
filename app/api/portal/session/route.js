import { getClient, listClientLeadIds, getLead, listLeads } from "@/lib/leadStore";
import { verifyExpiringToken } from "@/lib/signedToken";
import { hmacToken } from "@/lib/linkToken";

export const dynamic = "force-dynamic";

function portalSecret() {
  return process.env.CLIENT_LINK_SECRET || process.env.LEAD_LINK_SECRET || "";
}

function leadLinkSecret() {
  return process.env.LEAD_LINK_SECRET || "";
}

function safeLead(lead) {
  if (!lead || typeof lead !== "object") return null;
  const exec = lead.execution && typeof lead.execution === "object" ? lead.execution : null;
  const safeExecution = exec
    ? {
        id: exec.id || null,
        startedAt: exec.startedAt || null,
        updatedAt: exec.updatedAt || null,
        steps: Array.isArray(exec.steps)
          ? exec.steps.slice(0, 20).map((s) => ({
              id: String(s?.id || ""),
              label: s?.label || null,
              status: s?.status || "todo",
              updatedAt: s?.updatedAt || null
            }))
          : []
      }
    : null;
  return {
    id: String(lead.id),
    createdAt: lead.createdAt || null,
    updatedAt: lead.updatedAt || null,
    status: lead.status || "new",
    name: lead.name || null,
    number: lead.number || null,
    email: lead.email || null,
    car: lead.car || null,
    services: Array.isArray(lead.services) ? lead.services : [],
    serviceDetails: lead.serviceDetails && typeof lead.serviceDetails === "object" ? lead.serviceDetails : null,
    quotedAt: lead.quotedAt || null,
    quoteBuiltAt: lead.quoteBuiltAt || null,
    vendorQuoteByServiceExVat: lead.vendorQuoteByServiceExVat || null,
    vendorQuoteTotalExVat: lead.vendorQuoteTotalExVat ?? null,
    vendorQuoteTotalIncVat: lead.vendorQuoteTotalIncVat ?? null,
    vendorVatRate: lead.vendorVatRate ?? null,
    clientQuoteByServiceExVat: lead.clientQuoteByServiceExVat || null,
    clientQuoteTotalExVat: lead.clientQuoteTotalExVat ?? null,
    invoiceCreatedAt: lead.invoiceCreatedAt || null,
    invoiceSentAt: lead.invoiceSentAt || null,
    invoiceStatus: lead.invoiceStatus || "due",
    invoicePaidAt: lead.invoicePaidAt || null,
    invoiceClientMarkedPaidAt: lead.invoiceClientMarkedPaidAt || null,
    consultation: lead.consultation || null,
    booking: lead.booking || null,
    execution: safeExecution
  };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const clientId = String(searchParams.get("c") || request.headers.get("x-portal-client") || "");
  const token = String(searchParams.get("t") || request.headers.get("x-portal-token") || "");

  const secret = portalSecret();
  if (!secret) return Response.json({ error: "Missing CLIENT_LINK_SECRET (or LEAD_LINK_SECRET fallback)." }, { status: 500 });
  if (!clientId || !token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const verdict = verifyExpiringToken({ secret, subject: `portal:${clientId}`, token });
  if (!verdict.ok) return Response.json({ error: "Invalid or expired link. Please request a new link." }, { status: 401 });

  const client = await getClient(clientId);
  if (!client) return Response.json({ error: "Client not found" }, { status: 404 });

  let leadIds = await listClientLeadIds({ clientId, limit: 120 });
  if (!leadIds.length) {
    // Backward-compat: older deployments may not have per-client indexes populated.
    const fallback = await listLeads({ limit: 200 });
    leadIds = fallback.filter((l) => String(l?.clientId || "") === String(clientId)).map((l) => String(l.id));
  }
  const leads = await Promise.all(leadIds.map((id) => getLead(id)));
  const cleanLeads = leads
    .map((l) => safeLead(l))
    .filter(Boolean)
    .sort((a, b) => Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0));

  const leadSecret = leadLinkSecret();
  const linkTokenByLeadId = {};
  if (leadSecret) {
    for (const l of cleanLeads) {
      linkTokenByLeadId[l.id] = hmacToken({ secret: leadSecret, leadId: l.id });
    }
  }

  const vehicles = Array.isArray(client?.vehicles) ? client.vehicles : [];
  const safeClient = {
    id: String(client.id),
    name: client.name || null,
    email: client.email || null,
    phone: client.phone || null,
    updatedAt: client.updatedAt || null,
    createdAt: client.createdAt || null,
    vehicles
  };

  return Response.json({ ok: true, client: safeClient, leads: cleanLeads, linkTokenByLeadId });
}
