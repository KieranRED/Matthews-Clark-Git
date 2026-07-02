"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

import { Icon } from "./icons";
import { StagePill, EmptyState } from "./components";
import { moneyZAR, shortDay, shortTime } from "./utils";

const STAGE_ORDER = ["new", "quoted", "booked", "in-bay", "reveal", "delivered", "aftercare", "lost"];

const SERVICE_LABELS = {
  ppf: "PPF",
  wrap: "Wrap",
  tint: "Tint",
  ceramic: "Ceramic",
  correct: "Paint correction",
  pc_street_gloss: "Paint correction - Street Gloss",
  pc_bronze: "Paint correction - Bronze",
  pc_silver: "Paint correction - Silver",
  pc_gold: "Paint correction - Gold",
  pc_diamond: "Paint correction - Diamond",
  detail: "Detail",
  wheel: "Wheels (Powder / Refurb)",
  kit: "Bodykit"
};

function safeNum(v) {
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : typeof v === "number" ? v : null;
  return Number.isFinite(n) ? n : null;
}

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function serviceLabel(id) {
  const key = String(id || "");
  return SERVICE_LABELS[key] || key;
}

function isLegacyCustomServiceLine(line) {
  if (!line || typeof line !== "object") return false;
  return (
    line.kind === "custom_service" ||
    line.billingMode === "replacement" ||
    line.source === "mcp" ||
    line.source === "mcp_custom_service"
  );
}

function serviceSummary(lead, sid) {
  const d = lead?.serviceDetails?.[sid] || null;
  if (!d || typeof d !== "object") return "";
  if (sid === "ppf") return [d.coverage, d.film, d.doorJambs ? "door jambs" : null].filter(Boolean).join(" · ");
  if (sid === "wrap") return [d.scope, Array.isArray(d.parts) ? d.parts.join(", ") : null, d.colour].filter(Boolean).join(" · ");
  if (sid === "wheel") return [d.service, d.finish, d.colour].filter(Boolean).join(" · ");
  if (sid === "tint") return [d.windows, d.shade ? `${d.shade}%` : null].filter(Boolean).join(" · ");
  if (sid === "ceramic") return [d.package, d.wheels ? "wheels" : null, d.glass ? "glass" : null, d.trim ? "trim" : null].filter(Boolean).join(" · ");
  if (sid === "correct") return d.stage || "";
  if (String(sid).startsWith("pc_")) return [d.packageName, d.protection, d.durationDays ? `${d.durationDays}d` : null].filter(Boolean).join(" · ");
  if (sid === "detail") return d.kind || "";
  return d.notes ? String(d.notes).slice(0, 120) : "";
}

function cleanTel(input) {
  const digits = String(input || "").replace(/[^\d+]/g, "");
  if (!digits) return null;
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("0") && digits.length === 10) return `+27${digits.slice(1)}`;
  if (digits.startsWith("27")) return `+${digits}`;
  return digits.startsWith("+") ? digits : `+${digits}`;
}

function isoToLocalInput(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}

function localInputToIso(value) {
  const v = String(value || "").trim();
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export default function JobDetailScreen({ index, params, onRefresh }) {
  const router = useRouter();
  const jobId = params?.id || "";
  const j = index?.job(jobId);
  const v = j ? index?.vehicle(j.vehicleId) : null;
  const c = j ? index?.vehicleContact(j.vehicleId) : null;
  const stage = j ? index?.stage(j.stage) : null;
  const idx = j ? STAGE_ORDER.indexOf(j.stage) : -1;
  const isIzimoto = String(index?.VIEWER?.role || "").startsWith("izimoto");
  const quoteStep = j?.quoteStep || null;

  const lead = j?.raw || null;
  const phone = cleanTel(lead?.number || c?.phone || "");
  const vendorPricingDeferred = Boolean(lead?.vendorPricingDeferred);
  const vendorByService =
    lead?.vendorQuoteByServiceExVat && typeof lead.vendorQuoteByServiceExVat === "object" ? lead.vendorQuoteByServiceExVat : null;
  const vendorVatRate = safeNum(lead?.vendorVatRate) ?? 0.15;
  const commissionByService = lead?.commissionByServicePercent && typeof lead.commissionByServicePercent === "object" ? lead.commissionByServicePercent : {};
  const commissionModeByService = lead?.commissionByServiceMode && typeof lead.commissionByServiceMode === "object" ? lead.commissionByServiceMode : {};
  const commissionFixedByService = lead?.commissionByServiceFixedZar && typeof lead.commissionByServiceFixedZar === "object" ? lead.commissionByServiceFixedZar : {};
  const commissionTotalByService =
    lead?.commissionByServiceTotalExVat && typeof lead.commissionByServiceTotalExVat === "object" ? lead.commissionByServiceTotalExVat : {};
  const servicesForQuote = useMemo(() => {
    const base = Array.isArray(lead?.services) ? lead.services.filter((s) => s && s !== "unsure") : [];
    const fromVendor = vendorByService ? Object.keys(vendorByService) : [];
    const all = new Set([...base, ...fromVendor]);
    return Array.from(all);
  }, [lead?.services, vendorByService]);

  const execution = lead?.execution && typeof lead.execution === "object" ? lead.execution : null;
  const execSteps = Array.isArray(execution?.steps) ? execution.steps : [];
  const execProgress = useMemo(() => {
    const steps = Array.isArray(execSteps) ? execSteps : [];
    const total = steps.length || 0;
    const done = steps.filter((s) => String(s?.status || "") === "done").length;
    const doing = steps.filter((s) => String(s?.status || "") === "doing").length;
    const blocked = steps.filter((s) => String(s?.status || "") === "blocked").length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    return { total, done, doing, blocked, pct };
  }, [execSteps]);

  const [execNoteDraft, setExecNoteDraft] = useState("");

  async function execUpdate(payload) {
    if (!jobId) return;
    setActionStatus({ state: "loading", message: "Updating progress…" });
    try {
      const res = await fetch(`/api/admin/leads/${encodeURIComponent(jobId)}/execution`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to update execution.");
      setActionStatus({ state: "success", message: "Progress updated." });
      setExecNoteDraft("");
      onRefresh?.();
    } catch (err) {
      setActionStatus({ state: "error", message: err instanceof Error ? err.message : "Failed to update execution." });
    }
  }

  async function execInit() {
    await execUpdate({ action: "init" });
  }

  async function execSetStep(stepId, status) {
    await execUpdate({ action: "step", stepId, status });
  }

  async function execAddNote() {
    const text = String(execNoteDraft || "").trim();
    if (!text) return;
    await execUpdate({ action: "note", text });
  }

  const quoteLines = useMemo(() => {
    if (!vendorByService) return [];
    return servicesForQuote
      .map((sid) => {
        const vendorEx = safeNum(vendorByService?.[sid]) ?? null;
        if (vendorEx == null) return null;
        const vendorInc = round2(vendorEx * (1 + vendorVatRate));
        const mode = String(commissionModeByService?.[sid] || "percent");
        if (mode === "total") {
          const total = safeNum(commissionTotalByService?.[sid]) ?? vendorInc;
          const clientEx = round2(Math.max(vendorInc, total));
          return { sid, vendorEx, vendorInc, mode: "total", value: total, clientEx };
        }
        if (mode === "fixed") {
          const fixed = safeNum(commissionFixedByService?.[sid]) ?? 0;
          const clientEx = round2(vendorInc + Math.max(0, fixed));
          return { sid, vendorEx, vendorInc, mode: "fixed", value: fixed, clientEx };
        }
        const pct = safeNum(commissionByService?.[sid]) ?? safeNum(lead?.commissionPercent) ?? 0;
        const clientEx = round2(vendorInc * (1 + pct / 100));
        return { sid, vendorEx, vendorInc, mode: "percent", value: pct, clientEx };
      })
      .filter(Boolean);
  }, [
    vendorByService,
    servicesForQuote,
    vendorVatRate,
    commissionByService,
    commissionModeByService,
    commissionFixedByService,
    commissionTotalByService,
    lead?.commissionPercent
  ]);

  const [commissionModeDraft, setCommissionModeDraft] = useState(() => ({ ...(commissionModeByService || {}) }));
  const [commissionValueDraft, setCommissionValueDraft] = useState(() => {
    const out = {};
    for (const ln of quoteLines) {
      out[ln.sid] = String(ln.value ?? "");
      if (!(ln.sid in out) || out[ln.sid] === "undefined") out[ln.sid] = "";
    }
    return out;
  });
  const [vendorDraft, setVendorDraft] = useState(() => {
    const out = {};
    for (const sid of servicesForQuote) {
      const vv = vendorByService?.[sid];
      out[sid] = vv == null ? "" : String(vv);
    }
    return out;
  });
  const [invoiceRefDraft, setInvoiceRefDraft] = useState("");
  const [clientAddressDraft, setClientAddressDraft] = useState("");

  useEffect(() => {
    setCommissionModeDraft({ ...(commissionModeByService || {}) });
    const valOut = {};
    for (const ln of quoteLines) valOut[ln.sid] = String(ln.value ?? "");
    setCommissionValueDraft(valOut);
    const out = {};
    const base = Array.isArray(lead?.services) ? lead.services.filter((s) => s && s !== "unsure") : [];
    const fromVendor = vendorByService ? Object.keys(vendorByService) : [];
    const all = new Set([...base, ...fromVendor]);
    for (const sid of Array.from(all)) {
      const vv = vendorByService?.[sid];
      out[sid] = vv == null ? "" : String(vv);
    }
    setVendorDraft(out);
    setInvoiceRefDraft(String(lead?.invoiceReference || ""));
    setClientAddressDraft(String(lead?.clientAddress || ""));
  }, [jobId]);

  const [quoteLink, setQuoteLink] = useState("");
  const [invoiceLink, setInvoiceLink] = useState("");
  const [consultLink, setConsultLink] = useState("");
  const [bookingLink, setBookingLink] = useState("");
  const [portalLink, setPortalLink] = useState("");
  const [bookingSlotsDraft, setBookingSlotsDraft] = useState({ a: "", b: "", c: "" });
  const [actionStatus, setActionStatus] = useState({ state: "idle", message: "" });
  const [openSection, setOpenSection] = useState(null);
  const [partnerPickerOpen, setPartnerPickerOpen] = useState(false);

  // Vendor pricing override (M&C admin)
  const [vendorOverrideDraft, setVendorOverrideDraft] = useState({});
  const [vendorOverrideDeferred, setVendorOverrideDeferred] = useState(false);
  const [vendorOverrideOpen, setVendorOverrideOpen] = useState(false);

  // Upsell queue — items staged to send to Izimoto
  const [upsellQueue, setUpsellQueue] = useState([]); // [{ service, label, details, notes }]
  const [upsellModal, setUpsellModal] = useState(null); // { service, label } | null
  const [upsellDetailDraft, setUpsellDetailDraft] = useState({});
  const [upsellNotesDraft, setUpsellNotesDraft] = useState("");
  const [upsellCustomLabelDraft, setUpsellCustomLabelDraft] = useState("");
  // Confirmed custom service/package and upsell line items on the invoice
  const rawUpsells = Array.isArray(lead?.upsells) ? lead.upsells : [];
  const customServices = [
    ...(Array.isArray(lead?.customServices) ? lead.customServices : []),
    ...rawUpsells.filter(isLegacyCustomServiceLine)
  ];
  const upsells = rawUpsells.filter((item) => !isLegacyCustomServiceLine(item));
  // Upsell requests (pending/priced)
  const upsellRequests = Array.isArray(lead?.upsellRequests) ? lead.upsellRequests : [];
  // Markup state for priced requests: { [requestId]: amountStr }
  const [upsellConfirmAmounts, setUpsellConfirmAmounts] = useState({});
  // Manual Izimoto vendor cost entry for upsell requests: { [requestId]: amountStr }
  const [upsellVendorAmounts, setUpsellVendorAmounts] = useState({});
  const UPSELL_OPTIONS = [
    ...Object.entries(SERVICE_LABELS).map(([id, label]) => ({ id, label })),
    { id: "custom", label: "Custom" }
  ];

  // ── Check-in photos ──────────────────────────────────────────────────────
  const [photos, setPhotos] = useState(Array.isArray(lead?.photos) ? lead.photos : []);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoDropActive, setPhotoDropActive] = useState(false);
  const photoFileRef = useRef(null);

  // Keep photos in sync with lead data changes
  useEffect(() => {
    setPhotos(Array.isArray(lead?.photos) ? lead.photos : []);
  }, [lead?.photos]);

  async function uploadPhotos(files) {
    if (!files?.length || !jobId) return;
    setPhotoUploading(true);
    try {
      const form = new FormData();
      Array.from(files).forEach((f) => form.append("files", f));
      const res = await fetch(`/api/admin/leads/${encodeURIComponent(jobId)}/photos`, { method: "POST", body: form });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Upload failed.");
      setPhotos((p) => [...p, ...json.uploaded]);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("[photos] upload error", err);
      alert(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setPhotoUploading(false);
    }
  }

  async function deletePhoto(photoId) {
    if (!window.confirm("Remove this photo?")) return;
    try {
      const res = await fetch(`/api/admin/leads/${encodeURIComponent(jobId)}/photos`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ photoId })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Delete failed.");
      setPhotos((p) => p.filter((x) => String(x?.id || "") !== photoId));
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed.");
    }
  }

  function handlePhotoFiles(e) {
    uploadPhotos(e.target.files);
    e.target.value = "";
  }

  function handleDrop(e) {
    e.preventDefault();
    setPhotoDropActive(false);
    uploadPhotos(e.dataTransfer.files);
  }

  const acts = useMemo(() => (index?.ACTIVITY || []).filter((a) => String(a.jobId) === String(jobId)), [index, jobId]);

  const nextStage = useMemo(() => {
    const MAP = {
      new: { label: "Quoted", status: "quoted" },
      quoted: { label: "Booked", status: "booked" },
      booked: { label: "In Bay", status: "in_progress" },
      "in-bay": { label: "Delivered", status: "completed" },
      reveal: { label: "Delivered", status: "completed" },
    };
    return j?.stage ? MAP[j.stage] || null : null;
  }, [j?.stage]);

  const timelineSteps = useMemo(() => {
    const steps = [];
    const quotedIdx = STAGE_ORDER.indexOf("quoted");
    const stageIdx = idx;

    const consult = lead?.consultation && typeof lead.consultation === "object" ? lead.consultation : null;
    const consultRequired = Boolean(consult?.required);
    const consultStatus = String(consult?.status || (consultRequired ? "needed" : "none"));

    const invoiceReady = Boolean(lead?.invoiceCreatedAt || lead?.quoteBuiltAt);
    const invoiceSent = Boolean(lead?.invoiceSentAt);
    const invoiceStatus = String(lead?.invoiceStatus || "due");
    const invoicePaid = invoiceStatus === "paid";
    const invoiceDepositPaid = invoiceStatus === "deposit_paid" || Boolean(lead?.invoiceDepositPaidAt);

    const booking = lead?.booking && typeof lead.booking === "object" ? lead.booking : null;
    const bookingStatus = String(booking?.status || "none");
    const bookingScheduled = bookingStatus === "scheduled" || Boolean(booking?.scheduledAt);

    for (const sid of STAGE_ORDER) {
      steps.push({ kind: "stage", id: sid, label: index?.stage(sid)?.label || sid });

      if (sid === "quoted") {
        const beforeQuoted = stageIdx < quotedIdx;
        const afterQuoted = stageIdx > quotedIdx;
        const cur =
          quoteStep === "waiting_izimoto"
            ? "waiting_izimoto"
            : quoteStep === "waiting_mc"
              ? "waiting_mc"
              : quoteStep === "completed"
                ? "completed"
                : null;

        const stateFor = (key) => {
          if (afterQuoted) return "done";
          if (beforeQuoted) return "";
          if (cur === "waiting_izimoto") return key === "waiting_izimoto" ? "curr" : "";
          if (cur === "waiting_mc") return key === "waiting_izimoto" ? "done" : key === "waiting_mc" ? "curr" : "";
          if (cur === "completed") return key === "completed" ? "done" : "done";
          return "";
        };

        steps.push({ kind: "sub", id: "q_waiting_izimoto", label: "Waiting Izimoto", state: stateFor("waiting_izimoto") });
        steps.push({ kind: "sub", id: "q_waiting_mc", label: "Waiting M&C", state: stateFor("waiting_mc") });
        steps.push({ kind: "sub", id: "q_completed", label: "Quoted complete", state: stateFor("completed") });

        if (!isIzimoto && consultRequired) {
          const state =
            consultStatus === "scheduled" || consultStatus === "done" || consultStatus === "completed"
              ? "done"
              : beforeQuoted
                ? ""
                : afterQuoted
                  ? "done"
                  : "curr";
          steps.push({ kind: "sub", id: "consult", label: "Consultation", state });
        }

        if (!isIzimoto) {
          const invState = invoiceReady ? (invoiceSent ? "done" : beforeQuoted ? "" : "curr") : "";
          steps.push({ kind: "sub", id: "invoice_sent", label: "Invoice emailed", state: invState });

          const depState = invoicePaid || invoiceDepositPaid ? "done" : invoiceReady && invoiceSent ? "curr" : "";
          steps.push({ kind: "sub", id: "invoice_deposit", label: "Deposit paid", state: depState });

          const paidState = invoicePaid ? "done" : invoiceDepositPaid ? "curr" : invoiceReady && invoiceSent ? "" : "";
          steps.push({ kind: "sub", id: "invoice_paid", label: "Paid in full", state: paidState });

          const bookState = bookingScheduled ? "done" : invoicePaid ? "curr" : "";
          steps.push({ kind: "sub", id: "booking", label: "Booking scheduled", state: bookState });
        }
      }
    }
    return steps;
  }, [
    index,
    idx,
    quoteStep,
    lead?.consultation,
    lead?.invoiceCreatedAt,
    lead?.quoteBuiltAt,
    lead?.invoiceSentAt,
    lead?.invoiceStatus,
    lead?.invoiceDepositPaidAt,
    lead?.booking,
    isIzimoto
  ]);

  useEffect(() => {
    setQuoteLink("");
    setInvoiceLink("");
    setConsultLink("");
    setBookingLink("");
    setPortalLink("");
    const proposed = Array.isArray(lead?.booking?.proposedSlots) ? lead.booking.proposedSlots : [];
    setBookingSlotsDraft({
      a: isoToLocalInput(proposed?.[0] || ""),
      b: isoToLocalInput(proposed?.[1] || ""),
      c: isoToLocalInput(proposed?.[2] || "")
    });
    setActionStatus({ state: "idle", message: "" });
    const invStatus = String(lead?.invoiceStatus || "due");
    const depPaid = invStatus === "deposit_paid" || Boolean(lead?.invoiceDepositPaidAt);
    const execExists = !!(lead?.execution && typeof lead.execution === "object");
    const curStage = j?.stage;
    let section = "quoting";
    if (curStage === "in-bay" || curStage === "reveal" || execExists) section = "execution";
    else if ((depPaid || invStatus === "paid") && !["in-bay", "reveal", "delivered", "aftercare"].includes(curStage)) section = "booking";
    else if (!isIzimoto && vendorByService) section = "invoice";
    setOpenSection(section);
  }, [jobId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const proposed = Array.isArray(lead?.booking?.proposedSlots) ? lead.booking.proposedSlots : [];
    setBookingSlotsDraft({
      a: isoToLocalInput(proposed?.[0] || ""),
      b: isoToLocalInput(proposed?.[1] || ""),
      c: isoToLocalInput(proposed?.[2] || "")
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Array.isArray(lead?.booking?.proposedSlots) ? lead.booking.proposedSlots.join("|") : ""]);

  useEffect(() => {
    if (isIzimoto) return;
    if (!lead?.id) return;
    const ready = Boolean(lead?.invoiceCreatedAt || lead?.quoteBuiltAt);
    if (!ready) return;
    if (invoiceLink) return;
    loadInvoiceLink({ silent: true });
  }, [jobId, isIzimoto, lead?.invoiceCreatedAt, lead?.quoteBuiltAt, invoiceLink]);

  if (!j) {
    return (
      <div className="screen">
        <EmptyState title="Job not found." subtitle="This lead may have been deleted." />
      </div>
    );
  }

  async function copyToClipboard(text) {
    const t = String(text || "");
    if (!t) return false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(t);
        return true;
      }
    } catch {
      // fallback below
    }
    try {
      const el = document.createElement("textarea");
      el.value = t;
      el.style.position = "fixed";
      el.style.left = "-9999px";
      document.body.appendChild(el);
      el.focus();
      el.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(el);
      return ok;
    } catch {
      return false;
    }
  }

  async function setLeadStatus(status) {
    setActionStatus({ state: "loading", message: "Updating…" });
    try {
      const res = await fetch(`/api/admin/leads/${encodeURIComponent(jobId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to update lead.");
      setActionStatus({ state: "success", message: "Updated." });
      onRefresh?.();
    } catch (err) {
      setActionStatus({ state: "error", message: err instanceof Error ? err.message : "Failed to update lead." });
    }
  }

  async function setPartner(name) {
    setPartnerPickerOpen(false);
    try {
      await fetch(`/api/admin/leads/${encodeURIComponent(jobId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ partnerName: name })
      });
      onRefresh?.();
    } catch (_) {
      // silent — non-critical
    }
  }

  async function loadQuoteLink() {
    setActionStatus({ state: "loading", message: "Generating quote link…" });
    try {
      const res = await fetch(`/api/admin/leads/${encodeURIComponent(jobId)}/quote-link`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to generate link.");
      const url = String(json?.url || "");
      setQuoteLink(url);
      const copied = await copyToClipboard(url);
      setActionStatus({ state: "success", message: copied ? "Quote link copied." : "Quote link generated." });
    } catch (err) {
      setActionStatus({ state: "error", message: err instanceof Error ? err.message : "Failed to generate link." });
    }
  }

  async function loadConsultLink() {
    setActionStatus({ state: "loading", message: "Generating consultation link…" });
    try {
      const res = await fetch(`/api/admin/leads/${encodeURIComponent(jobId)}/consult-link`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to generate link.");
      const url = String(json?.url || "");
      setConsultLink(url);
      const copied = await copyToClipboard(url);
      setActionStatus({ state: "success", message: copied ? "Consultation link copied." : "Consultation link generated." });
    } catch (err) {
      setActionStatus({ state: "error", message: err instanceof Error ? err.message : "Failed to generate link." });
    }
  }

  async function loadInvoiceLink({ silent = false } = {}) {
    if (!silent) setActionStatus({ state: "loading", message: "Generating invoice link…" });
    try {
      const res = await fetch(`/api/admin/leads/${encodeURIComponent(jobId)}/invoice-link`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to generate link.");
      setInvoiceLink(String(json?.url || ""));
      if (!silent) setActionStatus({ state: "success", message: "Invoice link generated." });
      return String(json?.url || "");
    } catch (err) {
      if (!silent) setActionStatus({ state: "error", message: err instanceof Error ? err.message : "Failed to generate link." });
      return "";
    }
  }

  async function loadBookingLink() {
    setActionStatus({ state: "loading", message: "Generating booking link…" });
    try {
      const res = await fetch(`/api/admin/leads/${encodeURIComponent(jobId)}/booking-link`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to generate link.");
      const url = String(json?.url || "");
      setBookingLink(url);
      const copied = await copyToClipboard(url);
      setActionStatus({ state: "success", message: copied ? "Booking link copied." : "Booking link generated." });
    } catch (err) {
      setActionStatus({ state: "error", message: err instanceof Error ? err.message : "Failed to generate link." });
    }
  }

  async function loadPortalLink() {
    const clientId = lead?.clientId ? String(lead.clientId) : "";
    const email = lead?.email ? String(lead.email) : "";
    if (!clientId && !email) return;
    setActionStatus({ state: "loading", message: "Generating portal link…" });
    try {
      const qs = clientId ? `clientId=${encodeURIComponent(clientId)}` : `email=${encodeURIComponent(email)}`;
      const res = await fetch(`/api/admin/portal-link?${qs}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to generate portal link.");
      const url = String(json?.url || "");
      setPortalLink(url);
      setActionStatus({ state: "success", message: "Portal link ready." });
      try {
        window.open(url, "_blank", "noopener,noreferrer");
      } catch {
        // ignore
      }
    } catch (err) {
      setActionStatus({ state: "error", message: err instanceof Error ? err.message : "Failed to generate portal link." });
    }
  }

  async function markConsultNeeded() {
    if (!lead?.id) return;
    setActionStatus({ state: "loading", message: "Marking consultation…" });
    try {
      const res = await fetch(`/api/admin/leads/${encodeURIComponent(lead.id)}/consult-needed`, { method: "POST" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to mark consultation.");
      setActionStatus({ state: "success", message: "Marked: consultation needed." });
      onRefresh?.();
    } catch (err) {
      setActionStatus({ state: "error", message: err instanceof Error ? err.message : "Failed to mark consultation." });
    }
  }

  async function markConsultDone() {
    if (!lead?.id) return;
    setActionStatus({ state: "loading", message: "Completing consultation…" });
    try {
      const res = await fetch(`/api/admin/leads/${encodeURIComponent(lead.id)}/consult-complete`, { method: "POST" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to complete consultation.");
      setActionStatus({ state: "success", message: "Consultation completed." });
      onRefresh?.();
    } catch (err) {
      setActionStatus({ state: "error", message: err instanceof Error ? err.message : "Failed to complete consultation." });
    }
  }

  async function saveQuoteBuilder() {
    if (!lead?.id) return;
    setActionStatus({ state: "loading", message: "Saving quote…" });
    try {
      const percent = {};
      const fixed = {};
      const total = {};
      const mode = {};
      for (const sid of servicesForQuote) {
        const m = String(commissionModeDraft?.[sid] || "percent");
        const vv = safeNum(commissionValueDraft?.[sid]);
        mode[sid] = m === "fixed" ? "fixed" : m === "total" ? "total" : "percent";
        if (mode[sid] === "fixed") {
          if (vv != null) fixed[sid] = vv;
        } else if (mode[sid] === "total") {
          if (vv != null) total[sid] = vv;
        } else {
          if (vv != null) percent[sid] = vv;
        }
      }
      const res = await fetch(`/api/admin/leads/${encodeURIComponent(lead.id)}/quote-builder`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ commissionByServiceMode: mode, commissionByServicePercent: percent, commissionByServiceFixedZar: fixed, commissionByServiceTotalExVat: total })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to save quote.");
      const url = await loadInvoiceLink({ silent: true });
      setActionStatus({ state: "success", message: url ? "Quote saved. Invoice ready." : "Quote saved." });
      onRefresh?.();
    } catch (err) {
      setActionStatus({ state: "error", message: err instanceof Error ? err.message : "Failed to save quote." });
    }
  }

  async function saveInvoiceMeta() {
    if (!lead?.id) return;
    setActionStatus({ state: "loading", message: "Saving invoice details…" });
    try {
      const payload = {
        invoiceReference: invoiceRefDraft.trim() ? invoiceRefDraft.trim() : null,
        clientAddress: clientAddressDraft.trim() ? clientAddressDraft.trim() : null
      };
      const res = await fetch(`/api/admin/leads/${encodeURIComponent(lead.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to save invoice details.");
      setActionStatus({ state: "success", message: "Invoice details saved." });
      onRefresh?.();
    } catch (err) {
      setActionStatus({ state: "error", message: err instanceof Error ? err.message : "Failed to save invoice details." });
    }
  }

  async function saveVendorQuote() {
    if (!lead?.id) return;
    setActionStatus({ state: "loading", message: "Submitting vendor quote…" });
    try {
      const payload = {};
      for (const [sid, val] of Object.entries(vendorDraft || {})) {
        const n = safeNum(val);
        if (n != null) payload[sid] = n;
      }
      const res = await fetch(`/api/admin/leads/${encodeURIComponent(lead.id)}/vendor-quote`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ amountsByServiceExVat: payload, allowZero: true })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to submit vendor quote.");
      setActionStatus({ state: "success", message: "Quote submitted to M&C." });
      onRefresh?.();
    } catch (err) {
      setActionStatus({ state: "error", message: err instanceof Error ? err.message : "Failed to submit vendor quote." });
    }
  }

  async function saveVendorOverride() {
    if (!lead?.id) return;
    setActionStatus({ state: "loading", message: "Saving vendor pricing…" });
    try {
      const amounts = {};
      if (!vendorOverrideDeferred) {
        for (const sid of servicesForQuote) {
          const raw = String(vendorOverrideDraft?.[sid] ?? "").trim();
          const n = safeNum(raw);
          amounts[sid] = n ?? 0;
        }
      }
      const res = await fetch(`/api/admin/leads/${encodeURIComponent(lead.id)}/vendor-quote`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ amountsByServiceExVat: amounts, allowZero: true, deferred: vendorOverrideDeferred })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to save vendor pricing.");
      setActionStatus({ state: "success", message: vendorOverrideDeferred ? "Pricing deferred — invoice unlocked." : "Vendor pricing set." });
      setVendorOverrideOpen(false);
      onRefresh?.();
    } catch (err) {
      setActionStatus({ state: "error", message: err instanceof Error ? err.message : "Failed to save vendor pricing." });
    }
  }

  function formatUpsellDetails(service, details) {
    if (!details || typeof details !== "object") return null;
    const parts = [];
    if (service === "ppf") {
      const covMap = { "full-front": "Full front", "track-pack": "Track pack", full: "Full car", custom: "Custom panels" };
      const filmMap = { clear: "Clear PPF", stealth: "Stealth (matte)", colour: "Colour PPF", carbon: "Carbon / forged" };
      if (details.coverage) parts.push(`Coverage: ${covMap[details.coverage] || details.coverage}`);
      if (details.film) parts.push(`Film: ${filmMap[details.film] || details.film}`);
      if (details.doorJambs) parts.push("Door jambs: yes");
      if (Array.isArray(details.panels) && details.panels.length) parts.push(`Panels: ${details.panels.join(", ")}`);
    } else if (service === "wrap") {
      const scopeMap = { full: "Full wrap", partial: "Partial / accents", custom: "Custom panels" };
      const finishMap = { gloss: "Gloss", satin: "Satin", matte: "Matte" };
      if (details.scope) parts.push(`Scope: ${scopeMap[details.scope] || details.scope}`);
      if (details.finish) parts.push(`Finish: ${finishMap[details.finish] || details.finish}`);
      if (details.colour) parts.push(`Colour: ${details.colour}`);
      if (details.doorJambs) parts.push("Door jambs: yes");
    } else if (service === "tint") {
      const winMap = { "front-only": "Front 2 windows", all: "All windows", "all+windscreen": "All + windscreen" };
      if (details.windows) parts.push(`Windows: ${winMap[details.windows] || details.windows}`);
      if (details.shade) parts.push(`Shade: ${details.shade}% VLT`);
    } else if (service === "ceramic") {
      const pkgMap = { "2y": "2 Year", "5y": "5 Year", "10y": "10 Year" };
      if (details.package) parts.push(`Package: ${pkgMap[details.package] || details.package}`);
      const extras = [details.wheels && "Wheels", details.glass && "Glass", details.trim && "Trim"].filter(Boolean);
      if (extras.length) parts.push(`Add-ons: ${extras.join(", ")}`);
    } else if (service === "correct") {
      const stageMap = { stage1: "Stage 1", stage2: "Stage 2", stage3: "Stage 3" };
      if (details.stage) parts.push(`Stage: ${stageMap[details.stage] || details.stage}`);
    } else if (service === "detail") {
      const kindMap = { interior: "Interior only", exterior: "Exterior only", full: "Full detail" };
      if (details.kind) parts.push(`Type: ${kindMap[details.kind] || details.kind}`);
    } else if (service === "wheel") {
      const svcMap = { powder: "Powder coating", refurb: "Refurbishment" };
      if (details.service) parts.push(`Service: ${svcMap[details.service] || details.service}`);
      if (details.finish) parts.push(`Finish: ${details.finish}`);
      if (details.colour) parts.push(`Colour: ${details.colour}`);
    }
    return parts.length ? parts.join(" · ") : null;
  }

  function openUpsellModal(service, label) {
    setUpsellDetailDraft({});
    setUpsellNotesDraft("");
    setUpsellCustomLabelDraft("");
    setUpsellModal({ service, label });
  }

  function addUpsellToQueue() {
    if (!upsellModal) return;
    const { service } = upsellModal;
    const label = service === "custom" ? upsellCustomLabelDraft.trim() : (SERVICE_LABELS[service] || service);
    if (!label) return;
    setUpsellQueue((prev) => [...prev, { service, label, details: { ...upsellDetailDraft }, notes: upsellNotesDraft.trim() }]);
    setUpsellModal(null);
  }

  async function requestUpsell() {
    if (!lead?.id || upsellQueue.length === 0) return;
    setActionStatus({ state: "loading", message: "Sending to Izimoto…" });
    try {
      await Promise.all(upsellQueue.map((item) => {
        const detailStr = formatUpsellDetails(item.service, item.details);
        const notes = [detailStr, item.notes].filter(Boolean).join("\n") || undefined;
        return fetch(`/api/admin/leads/${encodeURIComponent(lead.id)}/upsell-request`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ service: item.service, label: item.label, notes })
        }).then((r) => r.json());
      }));
      setUpsellQueue([]);
      setActionStatus({ state: "success", message: `${upsellQueue.length} quote request${upsellQueue.length > 1 ? "s" : ""} sent to Izimoto.` });
      onRefresh?.();
    } catch (err) {
      setActionStatus({ state: "error", message: err instanceof Error ? err.message : "Failed to send request." });
    }
  }

  async function confirmUpsell(req) {
    const amount = safeNum(upsellConfirmAmounts[req.id]);
    const label = req.label || (SERVICE_LABELS[req.service] || req.service);
    if (!amount || amount <= 0 || !lead?.id) return;
    setActionStatus({ state: "loading", message: "Adding to invoice…" });
    try {
      const res = await fetch(`/api/admin/leads/${encodeURIComponent(lead.id)}/upsell`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ label, amountExVat: amount, requestId: req.id })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to add to invoice.");
      setUpsellConfirmAmounts((p) => { const n = { ...p }; delete n[req.id]; return n; });
      setActionStatus({ state: "success", message: "Added to invoice — resend when ready." });
      onRefresh?.();
    } catch (err) {
      setActionStatus({ state: "error", message: err instanceof Error ? err.message : "Failed to add to invoice." });
    }
  }

  async function saveUpsellVendorCost(req) {
    const vendorExVat = safeNum(upsellVendorAmounts[req.id]);
    if (!vendorExVat || vendorExVat <= 0 || !lead?.id) return;
    setActionStatus({ state: "loading", message: "Saving Izimoto cost…" });
    try {
      // PATCH the upsell request directly via the upsell-request endpoint
      const res = await fetch(`/api/admin/leads/${encodeURIComponent(lead.id)}/upsell-request`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: req.id, vendorExVat, status: "priced" })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to save cost.");
      setUpsellVendorAmounts((p) => ({ ...p, [req.id]: "" }));
      setActionStatus({ state: "success", message: "Izimoto cost saved." });
      onRefresh?.();
    } catch (err) {
      setActionStatus({ state: "error", message: err instanceof Error ? err.message : "Failed to save cost." });
    }
  }

  async function removeUpsellRequest(id) {
    if (!lead?.id) return;
    setActionStatus({ state: "loading", message: "Removing request…" });
    try {
      const res = await fetch(`/api/admin/leads/${encodeURIComponent(lead.id)}/upsell-request?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to remove request.");
      setActionStatus({ state: "success", message: "Request removed." });
      onRefresh?.();
    } catch (err) {
      setActionStatus({ state: "error", message: err instanceof Error ? err.message : "Failed to remove request." });
    }
  }

  async function removeUpsell(id) {
    if (!lead?.id) return;
    setActionStatus({ state: "loading", message: "Removing upsell…" });
    try {
      const res = await fetch(`/api/admin/leads/${encodeURIComponent(lead.id)}/upsell?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to remove upsell.");
      setActionStatus({ state: "success", message: "Upsell removed." });
      onRefresh?.();
    } catch (err) {
      setActionStatus({ state: "error", message: err instanceof Error ? err.message : "Failed to remove upsell." });
    }
  }

  async function deleteLeadForever() {
    const id = String(jobId || "");
    if (!id) return;
    const confirm = window.prompt(`Delete this lead forever?\n\nThis cannot be undone.\n\nType DELETE to confirm:`);
    if (confirm !== "DELETE") return;
    setActionStatus({ state: "loading", message: "Deleting…" });
    try {
      const res = await fetch(`/api/admin/leads/${encodeURIComponent(id)}`, { method: "DELETE" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to delete lead.");
      setActionStatus({ state: "success", message: "Lead deleted." });
      onRefresh?.();
      router.push("/admin/leads");
    } catch (err) {
      setActionStatus({ state: "error", message: err instanceof Error ? err.message : "Failed to delete lead." });
    }
  }

  async function emailInvoice() {
    if (!lead?.id) return;
    setActionStatus({ state: "loading", message: "Emailing invoice…" });
    try {
      const res = await fetch(`/api/admin/leads/${encodeURIComponent(lead.id)}/email-invoice`, { method: "POST" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to email invoice.");
      setActionStatus({ state: "success", message: `Invoice emailed to ${json?.to || "client"}.` });
      onRefresh?.();
    } catch (err) {
      setActionStatus({ state: "error", message: err instanceof Error ? err.message : "Failed to email invoice." });
    }
  }

  async function markInvoicePaid() {
    if (!lead?.id) return;
    setActionStatus({ state: "loading", message: "Marking as paid…" });
    try {
      const res = await fetch(`/api/admin/leads/${encodeURIComponent(lead.id)}/mark-paid`, { method: "POST" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to mark paid.");
      setActionStatus({ state: "success", message: "Invoice marked as paid." });
      onRefresh?.();
    } catch (err) {
      setActionStatus({ state: "error", message: err instanceof Error ? err.message : "Failed to mark paid." });
    }
  }

  async function markDepositPaid() {
    if (!lead?.id) return;
    setActionStatus({ state: "loading", message: "Marking deposit as paid…" });
    try {
      const res = await fetch(`/api/admin/leads/${encodeURIComponent(lead.id)}/mark-deposit-paid`, { method: "POST" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to mark deposit paid.");
      setActionStatus({ state: "success", message: "Deposit marked as paid." });
      onRefresh?.();
    } catch (err) {
      setActionStatus({ state: "error", message: err instanceof Error ? err.message : "Failed to mark deposit paid." });
    }
  }

  async function saveBookingProposals() {
    if (!lead?.id) return;
    setActionStatus({ state: "loading", message: "Saving booking options…" });
    try {
      const slots = [localInputToIso(bookingSlotsDraft.a), localInputToIso(bookingSlotsDraft.b), localInputToIso(bookingSlotsDraft.c)].filter(Boolean);
      if (!slots.length) throw new Error("Add at least one proposed slot.");
      const res = await fetch(`/api/admin/leads/${encodeURIComponent(lead.id)}/propose-booking`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slots })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to save booking options.");
      setActionStatus({ state: "success", message: "Booking options saved." });
      onRefresh?.();
    } catch (err) {
      setActionStatus({ state: "error", message: err instanceof Error ? err.message : "Failed to save booking options." });
    }
  }

  async function emailBooking() {
    if (!lead?.id) return;
    setActionStatus({ state: "loading", message: "Emailing booking link…" });
    try {
      const res = await fetch(`/api/admin/leads/${encodeURIComponent(lead.id)}/email-booking`, { method: "POST" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to email booking link.");
      setActionStatus({ state: "success", message: `Booking link emailed to ${json?.to || "client"}.` });
      onRefresh?.();
    } catch (err) {
      setActionStatus({ state: "error", message: err instanceof Error ? err.message : "Failed to email booking link." });
    }
  }

  function toggleSection(key) {
    setOpenSection((p) => (p === key ? null : key));
  }

  // Derived payment state for rendering
  const invStatus = String(lead?.invoiceStatus || "due");
  const depositPaid = invStatus === "deposit_paid" || Boolean(lead?.invoiceDepositPaidAt);
  const invoicePaid = invStatus === "paid";
  const invoiceReady = Boolean(lead?.invoiceCreatedAt || lead?.quoteBuiltAt);
  const invoiceExpiresAt = lead?.invoiceExpiresAt || null;
  const invoiceOverdue = invoiceExpiresAt && !depositPaid && !invoicePaid && Date.parse(invoiceExpiresAt) < Date.now();

  // Shared section header button
  function SecHdr({ skey, icon, label, badge }) {
    return (
      <button
        type="button"
        onClick={() => toggleSection(skey)}
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "14px 14px", background: "none", border: "none", color: "#fff", cursor: "pointer", gap: 12 }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {icon}
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase" }}>{label}</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {badge}
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-3)" }}>{openSection === skey ? "↑" : "↓"}</span>
        </div>
      </button>
    );
  }

  function StatusBadge({ label, color, bg, border }) {
    return (
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: ".14em", textTransform: "uppercase", color, padding: "3px 8px", borderRadius: 6, border: `1px solid ${border}`, background: bg }}>
        {label}
      </span>
    );
  }

  const inputStyle = { padding: "10px 10px", borderRadius: 10, border: "1px solid var(--bd-1)", background: "rgba(255,255,255,.03)", color: "#fff", outline: "none", width: "100%", boxSizing: "border-box" };
  const rowCard = { border: "1px solid var(--bd-1)", background: "var(--bg-2)", borderRadius: 10, padding: 12 };

  return (
    <div className="screen">

      {/* ── Hero ─────────────────────────────────────────── */}
      <div className="detail-hero" style={{ position: "relative" }}>
        {(() => {
          const heroUrl = photos[0]?.url || v?.photoUrl || null;
          return heroUrl ? (
            <img src={heroUrl} alt={v?.label || "Vehicle"} className="detail-hero-img" style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }} />
          ) : (
            <span className="ph">[ no photo yet · {v?.label || "Vehicle"} ]</span>
          );
        })()}
        <span className="stage-pill">
          <span className="stage-dot" style={{ background: stage?.color || "var(--mc-blue)" }} />
          {stage?.label || "Stage"}
        </span>
        <div className="who">
          <div className="ref">{j.ref} · WORKFLOW</div>
          <div className="name">
            {(v?.label || "Vehicle").split(" ")[0]} <span className="acc">{(v?.label || "").split(" ").slice(1).join(" ")}</span>
          </div>
        </div>
      </div>

      {/* ── Meta grid ────────────────────────────────────── */}
      <div className="detail-meta">
        <div className="cell">
          <div className="lbl">Client</div>
          <div className="val">{c?.name || lead?.name || "Client"}</div>
        </div>
        <div className="cell">
          <div className="lbl">Phone</div>
          <div className="val" style={{ fontSize: 12 }}>{phone || lead?.number || c?.phone || "—"}</div>
        </div>
        <div className="cell">
          <div className="lbl">Car</div>
          <div className="val">{v?.label || lead?.car || "—"}</div>
        </div>
        <div className="cell">
          <div className="lbl">Timing</div>
          <div className="val">{lead?.timeframe || "—"}</div>
        </div>
      </div>

      {/* ── Contact actions (top of page) ────────────────── */}
      {phone ? (
        <div style={{ padding: "16px 18px 0" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <a
              className="bigbtn bigbtn--p"
              href={`tel:${phone}`}
              style={{ flex: 1 }}
              onClick={() => {
                if (index?.VIEWER?.name) setPartner(index.VIEWER.name);
              }}
            >
              <span><Icon.phone /> &nbsp; Call client</span>
              <span className="arr">→</span>
            </a>
            {!isIzimoto ? (
              <button type="button" className="bigbtn bigbtn--g" onClick={() => setLeadStatus("called")} disabled={actionStatus.state === "loading"} style={{ flex: 1 }}>
                <span><Icon.check /> &nbsp; Mark called</span>
                <span className="arr">→</span>
              </button>
            ) : null}
          </div>

          {/* Partner assignment row */}
          {!isIzimoto && (() => {
            const currentPartner = lead?.partnerName || null;
            const mcMembers = (index?.TEAM || []).filter((m) => !String(m.role || "").startsWith("izimoto"));
            return (
              <div style={{ marginBottom: 14, position: "relative" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--fg-3)" }}>
                    Partner
                  </span>
                  <button
                    type="button"
                    onClick={() => setPartnerPickerOpen((v) => !v)}
                    style={{
                      background: "var(--bg-3)",
                      border: "1px solid var(--bd-2)",
                      borderRadius: 8,
                      padding: "5px 10px",
                      color: currentPartner ? "#fff" : "var(--fg-3)",
                      fontFamily: "var(--font-body)",
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    {currentPartner || "Unassigned"}
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--fg-3)" }}>▾</span>
                  </button>
                </div>
                {partnerPickerOpen && mcMembers.length > 0 && (
                  <div style={{
                    position: "absolute",
                    top: "calc(100% + 6px)",
                    left: 0,
                    zIndex: 99,
                    background: "var(--bg-2)",
                    border: "1px solid var(--bd-2)",
                    borderRadius: 10,
                    overflow: "hidden",
                    minWidth: 160,
                    boxShadow: "0 8px 24px rgba(0,0,0,.5)",
                  }}>
                    {mcMembers.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPartner(m.name)}
                        style={{
                          display: "block",
                          width: "100%",
                          padding: "10px 14px",
                          background: m.name === currentPartner ? "rgba(31,79,255,.18)" : "transparent",
                          border: "none",
                          color: m.name === currentPartner ? "#fff" : "var(--fg-2)",
                          fontFamily: "var(--font-body)",
                          fontWeight: m.name === currentPartner ? 700 : 500,
                          fontSize: 13,
                          textAlign: "left",
                          cursor: "pointer",
                        }}
                      >
                        {m.name}
                        {m.name === currentPartner && <span style={{ marginLeft: 6, color: "var(--mc-blue)", fontSize: 10 }}>✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      ) : null}

      {/* ── Finance ──────────────────────────────────────── */}
      <div className="detail-section">
        <h4>Finance</h4>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1, background: "var(--bd-1)", border: "1px solid var(--bd-1)", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ background: "var(--bg-2)", padding: 12, display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: ".16em", color: "var(--fg-3)", textTransform: "uppercase" }}>Revenue</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 20, letterSpacing: "-.01em", lineHeight: 1 }}>{moneyZAR(j.revenue || 0)}</div>
          </div>
          <div style={{ background: "var(--bg-2)", padding: 12, display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: ".16em", color: j.vendorCostMissing ? "#F59E0B" : "var(--fg-3)", textTransform: "uppercase" }}>
              Izimoto cost{j.vendorCostMissing ? " ⚠" : ""}
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 20, letterSpacing: "-.01em", lineHeight: 1, color: j.vendorCostMissing ? "#F59E0B" : "var(--fg-2)" }}>
              {j.vendorCostMissing ? "Not set" : moneyZAR(j.izimotoCost || 0)}
            </div>
          </div>
          <div style={{ background: "var(--bg-2)", padding: 12, display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: ".16em", color: j.vendorCostMissing ? "#F59E0B" : "var(--fg-3)", textTransform: "uppercase" }}>
              Profit · M&amp;C{j.vendorCostMissing ? " ⚠" : ""}
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 20, letterSpacing: "-.01em", lineHeight: 1, color: j.vendorCostMissing ? "#F59E0B" : "var(--mc-blue)" }}>
              {j.vendorCostMissing ? "Overstated" : moneyZAR(j.commission || 0)}
            </div>
          </div>
        </div>
        {j.vendorCostMissing && (
          <div style={{ marginTop: 8, padding: "10px 12px", borderRadius: 8, background: "rgba(245,158,11,.08)", border: "1px solid rgba(245,158,11,.3)", fontSize: 11, color: "rgba(245,158,11,.9)", lineHeight: 1.5 }}>
            ⚠ Izimoto's cost hasn't been entered for this job — open the <b>Awaiting Izimoto quote</b> section and use "Set vendor pricing manually" to fix the profit figure.
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".14em", color: "var(--fg-3)", textTransform: "uppercase" }}>
          <span>{depositPaid ? "✓ Deposit paid" : `Deposit · ${moneyZAR(j.deposit || 0)}`}</span>
          <span style={{ color: invoicePaid ? "#27AE60" : j.balance > 0 ? "#F2C94C" : "var(--fg-3)" }}>
            {invoicePaid ? "✓ Paid in full" : `Balance on collection · ${moneyZAR(j.balance || 0)}`}
          </span>
        </div>
        {invoiceOverdue ? (
          <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 8, background: "rgba(255,77,77,.08)", border: "1px solid rgba(255,77,77,.3)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: ".16em", color: "rgba(255,140,140,.95)", textTransform: "uppercase" }}>
              ⚠ DEPOSIT OVERDUE — invoice expired {new Date(invoiceExpiresAt).toLocaleDateString("en-ZA", { day: "2-digit", month: "short" })}
            </span>
            <button
              type="button"
              className="bigbtn bigbtn--g"
              onClick={() => setLeadStatus("lost")}
              disabled={actionStatus.state === "loading"}
              style={{ padding: "6px 12px", fontSize: 9, borderColor: "rgba(255,77,77,.4)", color: "rgba(255,140,140,.9)" }}
            >
              Mark lost
            </button>
          </div>
        ) : null}
      </div>

      {/* ── Status toast ─────────────────────────────────── */}
      {actionStatus.state !== "idle" ? (
        <div style={{ margin: "0 18px 12px", padding: "12px 14px", borderRadius: 10, background: actionStatus.state === "error" ? "rgba(255,77,77,.1)" : "rgba(31,79,255,.08)", border: `1px solid ${actionStatus.state === "error" ? "rgba(255,77,77,.35)" : "rgba(31,79,255,.3)"}`, fontSize: 12, color: actionStatus.state === "error" ? "rgba(255,110,110,.95)" : "var(--fg-1)" }}>
          {actionStatus.message}
        </div>
      ) : null}

      {/* ── Accordion sections ───────────────────────────── */}
      <div style={{ padding: "0 18px", display: "grid", gap: 8 }}>

        {/* QUOTING: shown to Izimoto (submit prices) or M&C when no vendor quote yet / empty */}
        {(isIzimoto || !vendorByService || Object.keys(vendorByService).length === 0) ? (
          <div className="card" style={{ overflow: "hidden" }}>
            <SecHdr skey="quoting" icon={<Icon.invoice />} label={isIzimoto ? "Submit pricing" : "Awaiting Izimoto quote"} />
            {openSection === "quoting" ? (
              <div style={{ padding: "0 14px 14px", display: "grid", gap: 12 }}>
                {isIzimoto ? (
                  <>
                    <div className="eyebrow">ENTER PRICING (EX VAT)</div>
                    <div style={{ fontSize: 12, color: "var(--fg-2)", lineHeight: 1.45 }}>
                      Add an ex VAT price per requested service. Submitting sends the quote to M&amp;C.
                    </div>
                    <div style={{ display: "grid", gap: 8 }}>
                      {servicesForQuote.map((sid) => {
                        const sum = serviceSummary(lead, sid);
                        return (
                          <div key={sid} style={rowCard}>
                            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: sum ? 6 : 8 }}>
                              <div style={{ fontFamily: "var(--font-display)", textTransform: "uppercase", letterSpacing: ".02em" }}>{serviceLabel(sid)}</div>
                              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".12em", color: "var(--fg-3)", textTransform: "uppercase" }}>Ex VAT</div>
                            </div>
                            {sum ? <div style={{ fontSize: 12, color: "var(--fg-2)", lineHeight: 1.35, marginBottom: 8 }}>{sum}</div> : null}
                            <input inputMode="decimal" placeholder="0.00" value={String(vendorDraft?.[sid] ?? "")} onChange={(e) => setVendorDraft((prev) => ({ ...(prev || {}), [sid]: e.target.value }))} style={inputStyle} />
                          </div>
                        );
                      })}
                    </div>
                    <button type="button" className="bigbtn bigbtn--p" onClick={saveVendorQuote} disabled={actionStatus.state === "loading"}>
                      <span><Icon.invoice /> &nbsp; Submit quote to M&amp;C</span>
                      <span className="arr">→</span>
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 12, color: "var(--fg-2)", lineHeight: 1.5 }}>
                      No Izimoto quote received yet. Share the quote link with Izimoto so they can submit pricing.
                    </div>
                    <button type="button" className="bigbtn bigbtn--g" onClick={loadQuoteLink} disabled={actionStatus.state === "loading"}>
                      <span><Icon.invoice /> &nbsp; Copy Izimoto quote link</span>
                      <span className="arr">→</span>
                    </button>
                    {quoteLink ? (
                      <div style={{ padding: 10, background: "var(--bg-1)", borderRadius: 8, fontSize: 11, color: "var(--fg-2)", wordBreak: "break-all" }}>{quoteLink}</div>
                    ) : null}

                    {/* Admin vendor pricing override */}
                    <div style={{ borderTop: "1px solid var(--bd-1)", paddingTop: 12 }}>
                      <button
                        type="button"
                        onClick={() => setVendorOverrideOpen((v) => !v)}
                        style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", color: "var(--fg-2)", cursor: "pointer", padding: 0, fontSize: 12, fontFamily: "var(--font-mono)", letterSpacing: ".12em", textTransform: "uppercase" }}
                      >
                        <span style={{ fontSize: 10 }}>{vendorOverrideOpen ? "▾" : "▸"}</span>
                        Set vendor pricing manually
                      </button>
                      {vendorOverrideOpen && (
                        <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
                          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={vendorOverrideDeferred}
                              onChange={(e) => setVendorOverrideDeferred(e.target.checked)}
                            />
                            <div>
                              <div style={{ fontSize: 12, color: "var(--fg-1)", fontWeight: 600 }}>Defer Izimoto pricing</div>
                              <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 2 }}>Unlock the invoice now — fill in Izimoto's cut after the job.</div>
                            </div>
                          </label>
                          {!vendorOverrideDeferred && (
                            <div style={{ display: "grid", gap: 8 }}>
                              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: ".16em", color: "var(--fg-3)", textTransform: "uppercase" }}>
                                Vendor cost per service (ex VAT) — enter 0 for no cut
                              </div>
                              {servicesForQuote.map((sid) => (
                                <div key={sid} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                  <div style={{ fontFamily: "var(--font-display)", textTransform: "uppercase", letterSpacing: ".02em", fontSize: 13, minWidth: 90 }}>{serviceLabel(sid)}</div>
                                  <input
                                    inputMode="decimal"
                                    placeholder="0.00"
                                    value={String(vendorOverrideDraft?.[sid] ?? "")}
                                    onChange={(e) => setVendorOverrideDraft((prev) => ({ ...prev, [sid]: e.target.value }))}
                                    style={{ ...inputStyle, flex: 1 }}
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                          <button type="button" className="bigbtn bigbtn--p" onClick={saveVendorOverride} disabled={actionStatus.state === "loading"}>
                            <span><Icon.check /> &nbsp; {vendorOverrideDeferred ? "Defer pricing — unlock invoice" : "Set vendor pricing"}</span>
                            <span className="arr">→</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* INVOICE: M&C only, when vendor quote exists (even if empty — still show so cost can be corrected) */}
        {!isIzimoto && vendorByService != null ? (
          <div className="card" style={{ overflow: "hidden" }}>
            <SecHdr
              skey="invoice"
              icon={<Icon.doc />}
              label="Invoice"
              badge={
                invoicePaid ? <StatusBadge label="Paid" color="#27AE60" bg="rgba(39,174,96,.12)" border="rgba(39,174,96,.4)" /> :
                depositPaid ? <StatusBadge label="Deposit" color="#F2C94C" bg="rgba(242,201,76,.1)" border="rgba(242,201,76,.4)" /> :
                lead?.invoiceSentAt ? <StatusBadge label="Sent" color="var(--mc-blue)" bg="rgba(31,79,255,.12)" border="rgba(31,79,255,.4)" /> : null
              }
            />
            {openSection === "invoice" ? (
              <div style={{ padding: "0 14px 14px", display: "grid", gap: 16 }}>

                {/* Quote builder */}
                <div>
                  <div className="eyebrow" style={{ marginBottom: 8 }}>M&amp;C COMMISSION</div>
                  {vendorPricingDeferred && quoteLines.length === 0 && (
                    <div style={{ padding: "10px 12px", marginBottom: 10, borderRadius: 10, background: "rgba(242,201,76,.08)", border: "1px solid rgba(242,201,76,.3)", fontSize: 12, color: "rgba(242,201,76,.9)", lineHeight: 1.5 }}>
                      ⏳ Izimoto pricing deferred — enter the client total per service below. Vendor cost can be filled in later.
                    </div>
                  )}
                  {vendorPricingDeferred && quoteLines.length === 0 && (
                    <div style={{ display: "grid", gap: 8 }}>
                      {servicesForQuote.map((sid) => {
                        const sum = serviceSummary(lead, sid);
                        return (
                          <div key={sid} style={rowCard}>
                            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: sum ? 6 : 8 }}>
                              <div style={{ fontFamily: "var(--font-display)", textTransform: "uppercase", letterSpacing: ".02em" }}>{serviceLabel(sid)}</div>
                              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".12em", color: "var(--fg-3)", textTransform: "uppercase" }}>Client total ex VAT</div>
                            </div>
                            {sum ? <div style={{ fontSize: 12, color: "var(--fg-2)", lineHeight: 1.35, marginBottom: 8 }}>{sum}</div> : null}
                            <input
                              inputMode="decimal"
                              placeholder="0.00"
                              value={String(commissionValueDraft?.[sid] ?? "")}
                              onChange={(e) => {
                                setCommissionModeDraft((prev) => ({ ...(prev || {}), [sid]: "total" }));
                                setCommissionValueDraft((prev) => ({ ...(prev || {}), [sid]: e.target.value }));
                              }}
                              style={inputStyle}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div style={{ display: "grid", gap: 8 }}>
                    {quoteLines.map((ln) => {
                      const sid = ln.sid;
                      const sum = serviceSummary(lead, sid);
                      const mode = String(commissionModeDraft?.[sid] || ln.mode || "percent");
                      const val = safeNum(commissionValueDraft?.[sid]) ?? safeNum(ln.value) ?? 0;
                      const vendorInc = round2(Number(ln.vendorEx) * (1 + vendorVatRate));
                      const clientEx =
                        mode === "total" ? round2(val) :
                        mode === "fixed" ? round2(vendorInc + Math.max(0, val)) :
                        round2(vendorInc * (1 + Math.max(0, val) / 100));
                      const invalidTotal = mode === "total" && (val == null || !(val > 0) || val < vendorInc);
                      return (
                        <div key={sid} style={rowCard}>
                          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
                            <div style={{ fontFamily: "var(--font-display)", textTransform: "uppercase", letterSpacing: ".02em" }}>{serviceLabel(sid)}</div>
                            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".12em", color: "var(--fg-3)", textTransform: "uppercase" }}>Iz: {moneyZAR(ln.vendorEx)} ex</div>
                          </div>
                          {sum ? <div style={{ fontSize: 12, color: "var(--fg-2)", lineHeight: 1.35, marginBottom: 8 }}>{sum}</div> : null}
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, alignItems: "end" }}>
                            <div>
                              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: ".16em", color: "var(--fg-3)", textTransform: "uppercase", marginBottom: 4 }}>Cost inc VAT</div>
                              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>{moneyZAR(vendorInc)}</div>
                            </div>
                            <div>
                              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: ".16em", color: "var(--fg-3)", textTransform: "uppercase", marginBottom: 4 }}>Commission</div>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                                <select value={mode === "fixed" ? "fixed" : mode === "total" ? "total" : "percent"} onChange={(e) => setCommissionModeDraft((prev) => ({ ...(prev || {}), [sid]: e.target.value }))} style={{ ...inputStyle, padding: "8px 6px" }}>
                                  <option value="percent">%</option>
                                  <option value="fixed">R</option>
                                  <option value="total">Total</option>
                                </select>
                                <input inputMode="decimal" value={String(commissionValueDraft?.[sid] ?? "")} onChange={(e) => setCommissionValueDraft((prev) => ({ ...(prev || {}), [sid]: e.target.value }))} placeholder={mode === "percent" ? "%" : "R"} style={{ ...inputStyle, padding: "8px 6px" }} />
                              </div>
                              {invalidTotal ? <div style={{ fontSize: 11, color: "rgba(255,110,110,.95)", marginTop: 4 }}>Must be ≥ {moneyZAR(vendorInc)}</div> : null}
                            </div>
                            <div>
                              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: ".16em", color: "var(--fg-3)", textTransform: "uppercase", marginBottom: 4 }}>Client ex VAT</div>
                              <div style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--mc-blue)" }}>{moneyZAR(clientEx)}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".14em", color: "var(--fg-3)", textTransform: "uppercase" }}>
                    <span>Total (ex VAT)</span>
                    <span style={{ color: "var(--fg-1)" }}>
                      {moneyZAR(quoteLines.reduce((s, ln) => {
                        const sid = ln.sid;
                        const mode = String(commissionModeDraft?.[sid] || ln.mode || "percent");
                        const val = safeNum(commissionValueDraft?.[sid]) ?? safeNum(ln.value) ?? 0;
                        const vendorInc = round2(Number(ln.vendorEx) * (1 + vendorVatRate));
                        const clientEx = mode === "total" ? round2(val) : mode === "fixed" ? round2(vendorInc + Math.max(0, val)) : round2(vendorInc * (1 + Math.max(0, val) / 100));
                        return s + clientEx;
                      }, 0))}
                    </span>
                  </div>
                  <button type="button" className="bigbtn bigbtn--p" onClick={saveQuoteBuilder} disabled={actionStatus.state === "loading"} style={{ marginTop: 10 }}>
                    <span><Icon.check /> &nbsp; Save quote</span>
                    <span className="arr">→</span>
                  </button>
                </div>

                {/* Upsells */}
                <div style={{ paddingTop: 16, borderTop: "1px solid var(--bd-1)" }}>
                  {customServices.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <div className="eyebrow" style={{ marginBottom: 8 }}>CUSTOM SERVICES</div>
                      <div style={{ display: "grid", gap: 6 }}>
                        {customServices.map((u) => (
                          <div key={u.id} style={{ padding: "10px 12px", background: "var(--bg-2)", borderRadius: 10, border: "1px solid var(--bd-1)" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-1)" }}>{u.label}</div>
                                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-3)", marginTop: 2 }}>
                                  {moneyZAR(u.amountExVat)} ex VAT · {u.billingMode === "replacement" ? "replaces base package" : "additive"}
                                </div>
                              </div>
                            </div>
                            {u.notes && <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 6, whiteSpace: "pre-wrap" }}>{u.notes}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="eyebrow" style={{ marginBottom: 8 }}>UPSELLS</div>

                  {/* Confirmed upsell line items */}
                  {upsells.length > 0 && (
                    <div style={{ display: "grid", gap: 6, marginBottom: 10 }}>
                      {upsells.map((u) => (
                        <div key={u.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "var(--bg-2)", borderRadius: 10, border: "1px solid var(--bd-1)" }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-1)" }}>{u.label}</div>
                            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-3)", marginTop: 2 }}>{moneyZAR(u.amountExVat)} ex VAT</div>
                          </div>
                          <button type="button" onClick={() => removeUpsell(u.id)} disabled={actionStatus.state === "loading"} style={{ background: "none", border: "none", color: "var(--fg-3)", cursor: "pointer", padding: "4px 8px", fontSize: 16, lineHeight: 1 }} title="Remove">×</button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Pending / priced upsell requests */}
                  {upsellRequests.length > 0 && (
                    <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
                      {upsellRequests.map((req) => {
                        const label = req.label || (SERVICE_LABELS[req.service] || req.service);
                        const isPriced = req.status === "priced";
                        const vendorIncVat = isPriced && req.vendorExVat ? Math.round(req.vendorExVat * 1.15 * 100) / 100 : null;
                        const confirmAmt = upsellConfirmAmounts[req.id] ?? (vendorIncVat != null ? String(vendorIncVat) : "");
                        return (
                          <div key={req.id} style={{ padding: "12px 14px", background: isPriced ? "rgba(39,174,96,.08)" : "var(--bg-2)", borderRadius: 12, border: `1px solid ${isPriced ? "rgba(39,174,96,.3)" : "var(--bd-1)"}` }}>
                            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-1)" }}>{label}</div>
                                {req.notes && <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 2 }}>{req.notes}</div>}
                                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, marginTop: 4, color: isPriced ? "rgba(39,174,96,.9)" : "var(--fg-3)" }}>
                                  {isPriced ? `Izimoto: ${moneyZAR(req.vendorExVat)} ex VAT (${moneyZAR(vendorIncVat)} inc VAT)` : "⏳ Awaiting Izimoto quote"}
                                </div>
                              </div>
                              <button type="button" onClick={() => removeUpsellRequest(req.id)} disabled={actionStatus.state === "loading"} style={{ background: "none", border: "none", color: "var(--fg-3)", cursor: "pointer", padding: "2px 6px", fontSize: 16, lineHeight: 1, flexShrink: 0 }} title="Delete request">×</button>
                            </div>
                            {/* Manually enter Izimoto's cost if not yet priced via form */}
                            {!isPriced && (
                              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, marginBottom: 8 }}>
                                <input
                                  inputMode="decimal"
                                  value={upsellVendorAmounts[req.id] ?? ""}
                                  onChange={(e) => setUpsellVendorAmounts((p) => ({ ...p, [req.id]: e.target.value }))}
                                  placeholder="Izimoto cost ex VAT (optional)"
                                  style={{ ...inputStyle, fontSize: 12 }}
                                />
                                <button type="button" onClick={() => saveUpsellVendorCost(req)} disabled={!safeNum(upsellVendorAmounts[req.id]) || actionStatus.state === "loading"} style={{ ...inputStyle, background: "rgba(39,174,96,.12)", border: "1px solid rgba(39,174,96,.35)", color: "#27AE60", cursor: "pointer", whiteSpace: "nowrap", padding: "0 14px" }}>
                                  Save cost
                                </button>
                              </div>
                            )}
                            <div style={{ display: "grid", gap: 8 }}>
                              <input
                                inputMode="decimal"
                                value={confirmAmt}
                                onChange={(e) => setUpsellConfirmAmounts((p) => ({ ...p, [req.id]: e.target.value }))}
                                placeholder="Our client price ex VAT"
                                style={inputStyle}
                              />
                              <button type="button" className="bigbtn bigbtn--g" onClick={() => confirmUpsell(req)} disabled={!safeNum(confirmAmt) || actionStatus.state === "loading"}>
                                <span>Add to invoice</span>
                                <span className="arr">→</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Upsell queue */}
                  {upsellQueue.length > 0 && (
                    <div style={{ display: "grid", gap: 6, marginBottom: 10 }}>
                      {upsellQueue.map((item, idx) => (
                        <div key={idx} style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, padding: "10px 12px", background: "rgba(31,79,255,.08)", borderRadius: 10, border: "1px solid rgba(31,79,255,.25)" }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-1)" }}>{item.label}</div>
                            {item.notes && <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 2, whiteSpace: "pre-wrap" }}>{item.notes}</div>}
                          </div>
                          <button type="button" onClick={() => setUpsellQueue((prev) => prev.filter((_, i) => i !== idx))} style={{ background: "none", border: "none", color: "var(--fg-3)", cursor: "pointer", padding: "2px 6px", fontSize: 16, lineHeight: 1, flexShrink: 0 }}>×</button>
                        </div>
                      ))}
                      <button type="button" className="bigbtn bigbtn--p" onClick={requestUpsell} disabled={actionStatus.state === "loading"}>
                        <span>Send {upsellQueue.length} request{upsellQueue.length > 1 ? "s" : ""} to Izimoto</span>
                        <span className="arr">→</span>
                      </button>
                    </div>
                  )}

                  {/* Service pills — each opens detail modal */}
                  <div style={{ fontSize: 11, color: "var(--fg-3)", marginBottom: 8 }}>Tap a service to add details and queue a quote request:</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {UPSELL_OPTIONS.map((opt) => (
                      <button key={opt.id} type="button" className="pill" onClick={() => openUpsellModal(opt.id, opt.label)}>
                        <span className="dot" />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Invoice details */}
                <div style={{ paddingTop: 16, borderTop: "1px solid var(--bd-1)" }}>
                  <div className="eyebrow" style={{ marginBottom: 8 }}>INVOICE DETAILS</div>
                  <div style={{ display: "grid", gap: 8 }}>
                    <input value={invoiceRefDraft} onChange={(e) => setInvoiceRefDraft(e.target.value)} placeholder="Reference (e.g. MC_01234)" style={inputStyle} />
                    <textarea value={clientAddressDraft} onChange={(e) => setClientAddressDraft(e.target.value)} placeholder={"Client address\nStreet\nSuburb\nCity"} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
                    <button type="button" className="bigbtn bigbtn--g" onClick={saveInvoiceMeta} disabled={actionStatus.state === "loading"}>
                      <span>Save details</span>
                      <span className="arr">→</span>
                    </button>
                  </div>
                </div>

                {/* Send & payment — only once quote is built */}
                {invoiceReady ? (
                  <div style={{ paddingTop: 16, borderTop: "1px solid var(--bd-1)", display: "grid", gap: 8 }}>
                    <div className="eyebrow" style={{ marginBottom: 4 }}>SEND &amp; PAYMENT</div>
                    {invoiceLink ? (
                      <div style={{ display: "flex", gap: 8 }}>
                        <a className="bigbtn bigbtn--g" href={invoiceLink} target="_blank" rel="noreferrer" style={{ flex: 1 }}>
                          <span><Icon.doc /> &nbsp; Open invoice</span>
                          <span className="arr">→</span>
                        </a>
                        <button type="button" className="bigbtn bigbtn--g" onClick={() => copyToClipboard(invoiceLink)} style={{ flex: 1 }}>
                          <span><Icon.send /> &nbsp; Copy link</span>
                          <span className="arr">→</span>
                        </button>
                      </div>
                    ) : null}
                    <button type="button" className="bigbtn bigbtn--g" onClick={emailInvoice} disabled={actionStatus.state === "loading"}>
                      <span><Icon.send /> &nbsp; Email invoice to client</span>
                      <span className="arr">→</span>
                    </button>
                    {!invoicePaid ? (
                      <>
                        <button type="button" className="bigbtn bigbtn--g" onClick={markDepositPaid} disabled={actionStatus.state === "loading"}>
                          <span><Icon.check /> &nbsp; Mark deposit paid</span>
                          <span className="arr">→</span>
                        </button>
                        <button type="button" className="bigbtn bigbtn--g" onClick={markInvoicePaid} disabled={actionStatus.state === "loading"}>
                          <span><Icon.check /> &nbsp; Mark paid in full</span>
                          <span className="arr">→</span>
                        </button>
                      </>
                    ) : null}
                  </div>
                ) : null}

                {/* Consultation */}
                <div style={{ paddingTop: 16, borderTop: "1px solid var(--bd-1)" }}>
                  <div className="eyebrow" style={{ marginBottom: 6 }}>CONSULTATION (OPTIONAL)</div>
                  <div style={{ fontSize: 12, color: "var(--fg-2)", lineHeight: 1.45, marginBottom: 10 }}>
                    Some jobs need a consult before sending the invoice.
                  </div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <button type="button" className="bigbtn bigbtn--g" onClick={markConsultNeeded} disabled={actionStatus.state === "loading"} style={{ flex: 1 }}>
                      <span>Needed</span>
                      <span className="arr">→</span>
                    </button>
                    <button type="button" className="bigbtn bigbtn--g" onClick={markConsultDone} disabled={actionStatus.state === "loading"} style={{ flex: 1 }}>
                      <span>Done</span>
                      <span className="arr">→</span>
                    </button>
                  </div>
                  <button type="button" className="bigbtn bigbtn--g" onClick={loadConsultLink} disabled={actionStatus.state === "loading"}>
                    <span><Icon.cal /> &nbsp; Copy consultation link</span>
                    <span className="arr">→</span>
                  </button>
                  {consultLink ? (
                    <div style={{ marginTop: 8, padding: 10, background: "var(--bg-1)", borderRadius: 8, fontSize: 11, color: "var(--fg-2)", wordBreak: "break-all" }}>{consultLink}</div>
                  ) : null}
                </div>

              </div>
            ) : null}
          </div>
        ) : null}

        {/* BOOKING: M&C only, unlocked after deposit */}
        {!isIzimoto && (depositPaid || invoicePaid) ? (
          <div className="card" style={{ overflow: "hidden" }}>
            <SecHdr
              skey="booking"
              icon={<Icon.cal />}
              label="Booking"
              badge={
                (lead?.booking?.status === "scheduled" || lead?.booking?.scheduledAt)
                  ? <StatusBadge label="Scheduled" color="#27AE60" bg="rgba(39,174,96,.12)" border="rgba(39,174,96,.4)" />
                  : null
              }
            />
            {openSection === "booking" ? (
              <div style={{ padding: "0 14px 14px", display: "grid", gap: 10 }}>
                <div style={{ fontSize: 12, color: "var(--fg-2)", lineHeight: 1.45 }}>
                  Propose up to 3 dates. Client confirms on a no-login page.
                </div>
                {["a", "b", "c"].map((slot) => (
                  <input key={slot} type="datetime-local" value={bookingSlotsDraft[slot]} onChange={(e) => setBookingSlotsDraft((p) => ({ ...(p || {}), [slot]: e.target.value }))} style={inputStyle} />
                ))}
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" className="bigbtn bigbtn--g" onClick={saveBookingProposals} disabled={actionStatus.state === "loading"} style={{ flex: 1 }}>
                    <span>Save dates</span>
                    <span className="arr">→</span>
                  </button>
                  <button type="button" className="bigbtn bigbtn--g" onClick={emailBooking} disabled={actionStatus.state === "loading"} style={{ flex: 1 }}>
                    <span>Email link</span>
                    <span className="arr">→</span>
                  </button>
                </div>
                <button type="button" className="bigbtn bigbtn--g" onClick={loadBookingLink} disabled={actionStatus.state === "loading"}>
                  <span><Icon.cal /> &nbsp; Copy booking link</span>
                  <span className="arr">→</span>
                </button>
                {bookingLink ? (
                  <div style={{ padding: 10, background: "var(--bg-1)", borderRadius: 8, fontSize: 11, color: "var(--fg-2)", wordBreak: "break-all" }}>{bookingLink}</div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* EXECUTION: shown when in-bay or checklist exists */}
        {(!isIzimoto || execution) ? (
          <div className="card" style={{ overflow: "hidden" }}>
            <SecHdr
              skey="execution"
              icon={<Icon.check />}
              label="In-Bay Execution"
              badge={execution ? <StatusBadge label={`${execProgress.pct}%`} color={execProgress.pct === 100 ? "#27AE60" : "var(--mc-blue)"} bg={execProgress.pct === 100 ? "rgba(39,174,96,.12)" : "rgba(31,79,255,.1)"} border={execProgress.pct === 100 ? "rgba(39,174,96,.4)" : "rgba(31,79,255,.35)"} /> : null}
            />
            {openSection === "execution" ? (
              <div style={{ padding: "0 14px 14px" }}>
                {!execution ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    <div style={{ fontSize: 12, color: "var(--fg-2)", lineHeight: 1.45 }}>No execution checklist yet.</div>
                    <button type="button" className="bigbtn bigbtn--g" onClick={execInit} disabled={actionStatus.state === "loading"}>
                      <span>Initialize checklist</span>
                      <span className="arr">→</span>
                    </button>
                  </div>
                ) : (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 8 }}>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--fg-3)" }}>
                        {execProgress.done}/{execProgress.total} done · {execProgress.doing} doing · {execProgress.blocked} blocked
                      </div>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--mc-blue)" }}>{execProgress.pct}%</div>
                    </div>
                    <div style={{ height: 6, borderRadius: 999, background: "rgba(255,255,255,.08)", overflow: "hidden", marginBottom: 12 }}>
                      <div style={{ height: "100%", width: `${execProgress.pct}%`, background: "var(--mc-blue)", transition: "width .3s" }} />
                    </div>
                    <div style={{ display: "grid", gap: 8 }}>
                      {execSteps.map((s) => {
                        const st = String(s?.status || "todo");
                        const color = st === "done" ? "rgba(60,200,120,.95)" : st === "doing" ? "var(--mc-blue)" : st === "blocked" ? "rgba(255,110,110,.95)" : "rgba(255,255,255,.45)";
                        return (
                          <div key={String(s?.id || "")} style={rowCard}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                              <div style={{ fontFamily: "var(--font-display)", textTransform: "uppercase", letterSpacing: ".02em" }}>{String(s?.label || s?.id || "Step")}</div>
                              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color }}>{st}</div>
                            </div>
                            {!isIzimoto ? (
                              <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                                {[["todo", "To do"], ["doing", "Doing"], ["done", "Done"], ["blocked", "Blocked"]].map(([k, lbl]) => (
                                  <button key={k} type="button" onClick={() => execSetStep(String(s?.id || ""), k)} disabled={actionStatus.state === "loading"} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--bd-1)", background: st === k ? "rgba(31,79,255,.16)" : "rgba(255,255,255,.03)", color: "#fff", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", cursor: "pointer" }}>
                                    {lbl}
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                    {!isIzimoto ? (
                      <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                        <textarea value={execNoteDraft} onChange={(e) => setExecNoteDraft(e.target.value)} placeholder="Add an internal note…" rows={2} style={{ ...inputStyle, resize: "vertical" }} />
                        <button type="button" className="bigbtn bigbtn--g" onClick={execAddNote} disabled={actionStatus.state === "loading" || !String(execNoteDraft || "").trim()}>
                          <span>Add note</span>
                          <span className="arr">→</span>
                        </button>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* STAGE */}
        <div className="card" style={{ overflow: "hidden" }}>
          <SecHdr
            skey="stage"
            icon={<Icon.arrow />}
            label="Stage"
            badge={<StatusBadge label={stage?.label || j.stage} color="var(--fg-1)" bg="transparent" border="var(--bd-1)" />}
          />
          {openSection === "stage" ? (
            <div style={{ padding: "0 14px 14px", display: "grid", gap: 8 }}>
              {nextStage ? (
                <button type="button" className="bigbtn bigbtn--p" onClick={() => setLeadStatus(nextStage.status)} disabled={actionStatus.state === "loading"}>
                  <span>Move to {nextStage.label}</span>
                  <span className="arr">→</span>
                </button>
              ) : null}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[["new", "New"], ["quoted", "Quoted"], ["booked", "Booked"], ["in_progress", "In bay"], ["completed", "Delivered"], ["lost", "Lost"]].map(([status, label]) => (
                  <button key={status} type="button" className="bigbtn bigbtn--g" onClick={() => setLeadStatus(status)} disabled={actionStatus.state === "loading"}>
                    <span>{label}</span>
                    <span className="arr">→</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* CLIENT PORTAL (M&C only) */}
        {!isIzimoto ? (
          <button className="bigbtn bigbtn--g" onClick={loadPortalLink} disabled={actionStatus.state === "loading"}>
            <span><Icon.user /> &nbsp; Open client portal</span>
            <span className="arr">→</span>
          </button>
        ) : null}
        {portalLink ? (
          <div style={{ padding: 10, background: "var(--bg-2)", borderRadius: 8, border: "1px solid var(--bd-1)", fontSize: 11, color: "var(--fg-2)", wordBreak: "break-all" }}>{portalLink}</div>
        ) : null}

      </div>

      {/* ── Lifecycle ─────────────────────────────────────── */}
      <div className="detail-section">
        <h4>Lifecycle</h4>
        <div className="timeline">
          {timelineSteps.map((step, i) => {
            const isLast = i === timelineSteps.length - 1;
            const stageIndex = step.kind === "stage" ? STAGE_ORDER.indexOf(step.id) : -1;
            const state =
              step.kind === "sub"
                ? step.state || ""
                : stageIndex >= 0
                  ? stageIndex < idx ? "done" : stageIndex === idx ? "curr" : ""
                  : "";
            const when =
              step.kind === "sub"
                ? state === "done" ? "completed" : state === "curr" ? "current" : "pending"
                : stageIndex < idx ? "completed" : stageIndex === idx ? "current" : "pending";
            return (
              <div key={step.id} className={"tl-step " + state} style={step.kind === "sub" ? { paddingLeft: 14, opacity: 0.95 } : undefined}>
                <div className="tl-col">
                  <div className="tl-dot" style={step.kind === "sub" ? { width: 8, height: 8, marginTop: 4 } : undefined} />
                  {!isLast ? <div className="tl-line" /> : null}
                </div>
                <div className="tl-meta">
                  <div className="name">{step.label}</div>
                  <div className="when">{when}</div>
                </div>
                <div className="tl-time">{state === "curr" ? shortDay(lead?.updatedAt || lead?.createdAt) : ""}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Services ─────────────────────────────────────── */}
      <div className="detail-section">
        <h4>Services</h4>
        <div className="detail-services">
          {index?.serviceLabels(j.services).map((s) => (
            <span key={s} className="pill">
              <span className="dot" style={{ background: "var(--mc-blue)" }} />
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* ── Brief ────────────────────────────────────────── */}
      {j.notes ? (
        <div className="detail-section">
          <h4>Brief</h4>
          <div style={{ padding: 14, background: "var(--bg-2)", border: "1px solid var(--bd-1)", borderRadius: 10, fontSize: 13, lineHeight: 1.55, color: "var(--fg-1)" }}>
            {j.notes}
          </div>
        </div>
      ) : null}

      {/* ── Activity ─────────────────────────────────────── */}
      {acts.length ? (
        <div className="detail-section">
          <h4>Activity</h4>
          <div className="feed">
            {acts.slice(0, 12).map((a) => (
              <div key={a.id} className="feed-row">
                <div className="feed-ic grey">
                  {a.type === "stage" ? <Icon.arrow /> : a.type === "lead" ? <Icon.plus /> : <Icon.edit />}
                </div>
                <div className="feed-meta">
                  <div className="feed-who">{a.who || "Team"} · {String(a.type || "note").toUpperCase()}</div>
                  <div className="feed-text">{a.text}</div>
                </div>
                <div className="feed-time">{shortTime(a.at) || ""}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* ── Check-in Photos ──────────────────────────────── */}
      <div className="detail-section">
        <h4>Check-in Photos</h4>

        {/* Hidden file input */}
        <input
          ref={photoFileRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: "none" }}
          onChange={handlePhotoFiles}
        />

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setPhotoDropActive(true); }}
          onDragLeave={() => setPhotoDropActive(false)}
          onDrop={handleDrop}
          onClick={() => !photoUploading && photoFileRef.current?.click()}
          style={{
            border: `2px dashed ${photoDropActive ? "var(--mc-blue)" : "var(--bd-2)"}`,
            borderRadius: 12,
            padding: "22px 14px",
            textAlign: "center",
            cursor: photoUploading ? "default" : "pointer",
            background: photoDropActive ? "rgba(31,79,255,.06)" : "transparent",
            transition: "border-color .2s, background .2s",
            marginBottom: photos.length ? 14 : 0,
          }}
        >
          {photoUploading ? (
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".18em", color: "var(--fg-3)", textTransform: "uppercase" }}>
              UPLOADING…
            </div>
          ) : (
            <>
              <div style={{ fontSize: 22, marginBottom: 8 }}>📷</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".18em", color: "var(--mc-blue)", textTransform: "uppercase" }}>
                Drop photos here
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: ".14em", color: "var(--fg-3)", textTransform: "uppercase", marginTop: 4 }}>
                or click to browse — JPEG, PNG, WebP, HEIC · max 30 MB each
              </div>
            </>
          )}
        </div>

        {/* Photo grid */}
        {photos.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8 }}>
            {photos.map((p) => (
              <div
                key={p.id}
                style={{ position: "relative", borderRadius: 10, overflow: "hidden", aspectRatio: "4/3", background: "var(--bg-2)", border: "1px solid var(--bd-1)" }}
              >
                <a href={p.url} target="_blank" rel="noreferrer" style={{ display: "block", height: "100%" }}>
                  <img
                    src={p.url}
                    alt={p.filename || "Check-in photo"}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    loading="lazy"
                  />
                </a>
                {/* Delete button */}
                <button
                  type="button"
                  onClick={() => deletePhoto(String(p.id))}
                  style={{
                    position: "absolute", top: 4, right: 4,
                    width: 22, height: 22, borderRadius: 999,
                    background: "rgba(0,0,0,.65)", border: "1px solid rgba(255,255,255,.15)",
                    color: "#fff", fontSize: 11, display: "grid", placeItems: "center",
                    cursor: "pointer", lineHeight: 1,
                  }}
                  title="Remove photo"
                >
                  ✕
                </button>
                {p.angle ? (
                  <div style={{
                    position: "absolute", bottom: 0, left: 0, right: 0,
                    padding: "3px 6px",
                    background: "rgba(0,0,0,.6)",
                    fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: ".14em",
                    color: "rgba(255,255,255,.7)", textTransform: "uppercase",
                  }}>
                    {p.angle}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {photos.length === 0 && !photoUploading ? (
          <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 8 }}>
            No photos yet. Drop images above to document the vehicle on check-in.
          </div>
        ) : null}
      </div>

      {/* ── Danger zone ──────────────────────────────────── */}
      <div style={{ padding: "8px 18px 48px" }}>
        <div className="card" style={{ padding: 14, borderColor: "rgba(255,77,77,.35)", background: "rgba(255,77,77,.04)" }}>
          <div className="eyebrow" style={{ marginBottom: 6, color: "rgba(255,140,140,.95)" }}>DANGER ZONE</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.65)", lineHeight: 1.45 }}>
            Delete removes this lead and its linked tasks from the CRM.
          </div>
          <button type="button" className="bigbtn bigbtn--g" onClick={deleteLeadForever} disabled={actionStatus.state === "loading"} style={{ marginTop: 10, borderColor: "rgba(255,77,77,.6)", background: "rgba(255,77,77,.12)", color: "#fff" }}>
            <span><Icon.back /> &nbsp; Delete lead</span>
            <span className="arr">→</span>
          </button>
        </div>
      </div>

      {/* ── Upsell detail modal — portalled to body so no containing-block issues ── */}
      {upsellModal && typeof document !== "undefined" && createPortal(
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setUpsellModal(null); }}
          style={{
            position: "fixed", inset: 0, zIndex: 9000,
            background: "rgba(0,0,0,.72)", backdropFilter: "blur(8px)",
            display: "flex", alignItems: "flex-end", justifyContent: "center",
            padding: "0 0 env(safe-area-inset-bottom, 0px)",
          }}
        >
          <div style={{
            width: "min(480px, 100%)",
            background: "#0f0f0f",
            border: "1px solid rgba(255,255,255,.14)",
            borderRadius: "18px 18px 0 0",
            padding: "0 0 24px",
            maxHeight: "88svh",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            fontFamily: "'Inter Tight', system-ui, sans-serif",
            color: "#fff",
          }}>
            {/* Modal header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 18px 14px", borderBottom: "1px solid rgba(255,255,255,.1)", position: "sticky", top: 0, background: "#0f0f0f", zIndex: 1 }}>
              <div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: ".2em", color: "rgba(255,255,255,.45)", textTransform: "uppercase", marginBottom: 3 }}>Upsell Request</div>
                <div style={{ fontFamily: "'Anton', Impact, sans-serif", fontSize: 22, letterSpacing: ".03em", textTransform: "uppercase", color: "#fff" }}>{upsellModal.label}</div>
              </div>
              <button type="button" onClick={() => setUpsellModal(null)} style={{ background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.14)", borderRadius: 999, width: 32, height: 32, display: "grid", placeItems: "center", cursor: "pointer", color: "rgba(255,255,255,.7)", fontSize: 16, lineHeight: 1, flexShrink: 0 }}>×</button>
            </div>

            {/* Service-specific detail form */}
            <div style={{ padding: "18px 18px 0", display: "grid", gap: 16, flex: 1 }}>

              {/* PPF */}
              {upsellModal.service === "ppf" && (<>
                <UpsellSelect label="Coverage" field="coverage" draft={upsellDetailDraft} setDraft={setUpsellDetailDraft}
                  options={[{ v: "full-front", l: "Full Front" }, { v: "track-pack", l: "Track Pack" }, { v: "full", l: "Full Car" }, { v: "custom", l: "Custom Panels" }]} />
                <UpsellSelect label="Film Type" field="film" draft={upsellDetailDraft} setDraft={setUpsellDetailDraft}
                  options={[{ v: "clear", l: "Clear PPF" }, { v: "stealth", l: "Stealth (Matte)" }, { v: "colour", l: "Colour PPF" }, { v: "carbon", l: "Carbon / Forged" }]} />
                <UpsellToggle label="Include Door Jambs?" field="doorJambs" draft={upsellDetailDraft} setDraft={setUpsellDetailDraft} />
                <UpsellMulti label="Custom Panels" field="panels" draft={upsellDetailDraft} setDraft={setUpsellDetailDraft}
                  options={["bonnet", "roof", "front doors", "rear doors", "bumper", "mirrors", "boot"]} />
              </>)}

              {/* Wrap */}
              {upsellModal.service === "wrap" && (<>
                <UpsellSelect label="Scope" field="scope" draft={upsellDetailDraft} setDraft={setUpsellDetailDraft}
                  options={[{ v: "full", l: "Full Wrap" }, { v: "partial", l: "Partial / Accents" }, { v: "custom", l: "Custom Panels" }]} />
                <UpsellSelect label="Finish" field="finish" draft={upsellDetailDraft} setDraft={setUpsellDetailDraft}
                  options={[{ v: "gloss", l: "Gloss" }, { v: "satin", l: "Satin" }, { v: "matte", l: "Matte" }, { v: "chrome", l: "Chrome" }, { v: "colour-shift", l: "Colour Shift" }]} />
                <UpsellText label="Colour / Reference" field="colour" placeholder="e.g. Satin Black, Avery SW900…" draft={upsellDetailDraft} setDraft={setUpsellDetailDraft} />
                <UpsellToggle label="Include Door Jambs?" field="doorJambs" draft={upsellDetailDraft} setDraft={setUpsellDetailDraft} />
              </>)}

              {/* Tint */}
              {upsellModal.service === "tint" && (<>
                <UpsellSelect label="Windows" field="windows" draft={upsellDetailDraft} setDraft={setUpsellDetailDraft}
                  options={[{ v: "front-only", l: "Front 2 Windows" }, { v: "all", l: "All Windows" }, { v: "all+windscreen", l: "All + Windscreen" }]} />
                <UpsellText label="Shade % VLT" field="shade" placeholder="e.g. 35" draft={upsellDetailDraft} setDraft={setUpsellDetailDraft} />
              </>)}

              {/* Ceramic */}
              {upsellModal.service === "ceramic" && (<>
                <UpsellSelect label="Package" field="package" draft={upsellDetailDraft} setDraft={setUpsellDetailDraft}
                  options={[{ v: "2y", l: "2 Year" }, { v: "5y", l: "5 Year" }, { v: "10y", l: "10 Year" }]} />
                <div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: ".18em", color: "var(--fg-3)", textTransform: "uppercase", marginBottom: 8 }}>Add-ons</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {[["wheels", "Wheels"], ["glass", "Glass"], ["trim", "Trim"]].map(([k, lbl]) => (
                      <button key={k} type="button" className="pill" onClick={() => setUpsellDetailDraft((p) => ({ ...p, [k]: !p[k] }))}
                        style={{ borderColor: upsellDetailDraft[k] ? "rgba(31,79,255,.55)" : undefined, background: upsellDetailDraft[k] ? "rgba(31,79,255,.14)" : undefined, color: upsellDetailDraft[k] ? "#fff" : undefined }}>
                        <span className="dot" style={{ background: upsellDetailDraft[k] ? "var(--mc-blue)" : "var(--fg-3)" }} />
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>
              </>)}

              {/* Paint Correction */}
              {upsellModal.service === "correct" && (
                <UpsellSelect label="Stage" field="stage" draft={upsellDetailDraft} setDraft={setUpsellDetailDraft}
                  options={[{ v: "stage1", l: "Stage 1 — Light Polish" }, { v: "stage2", l: "Stage 2 — Cut & Polish" }, { v: "stage3", l: "Stage 3 — Full Correction" }]} />
              )}

              {/* Detailing */}
              {upsellModal.service === "detail" && (
                <UpsellSelect label="Type" field="kind" draft={upsellDetailDraft} setDraft={setUpsellDetailDraft}
                  options={[{ v: "interior", l: "Interior Only" }, { v: "exterior", l: "Exterior Only" }, { v: "full", l: "Full Detail" }]} />
              )}

              {/* Wheels */}
              {upsellModal.service === "wheel" && (<>
                <UpsellSelect label="Service Type" field="service" draft={upsellDetailDraft} setDraft={setUpsellDetailDraft}
                  options={[{ v: "powder", l: "Powder Coating" }, { v: "refurb", l: "Refurbishment" }, { v: "both", l: "Powder + Refurb" }]} />
                <UpsellText label="Finish" field="finish" placeholder="e.g. Gloss Black, Gunmetal" draft={upsellDetailDraft} setDraft={setUpsellDetailDraft} />
                <UpsellText label="Colour" field="colour" placeholder="e.g. RAL 9005" draft={upsellDetailDraft} setDraft={setUpsellDetailDraft} />
              </>)}

              {/* Custom service */}
              {upsellModal.service === "custom" && (
                <div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: ".18em", color: "var(--fg-3)", textTransform: "uppercase", marginBottom: 6 }}>Service Name</div>
                  <input value={upsellCustomLabelDraft} onChange={(e) => setUpsellCustomLabelDraft(e.target.value)} placeholder="e.g. Interior Restoration" style={inputStyle} />
                </div>
              )}

              {/* Notes — all services */}
              <div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: ".18em", color: "var(--fg-3)", textTransform: "uppercase", marginBottom: 6 }}>Notes for Izimoto (optional)</div>
                <textarea value={upsellNotesDraft} onChange={(e) => setUpsellNotesDraft(e.target.value)} placeholder="Any special requirements, references, or context…" rows={3} style={{ ...inputStyle, resize: "vertical" }} />
              </div>

              <button
                type="button"
                className="bigbtn bigbtn--p"
                onClick={addUpsellToQueue}
                disabled={upsellModal.service === "custom" && !upsellCustomLabelDraft.trim()}
                style={{ marginBottom: 4 }}
              >
                <span>Add to queue</span>
                <span className="arr">→</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}

/* ── Upsell modal helper sub-components ──────────────── */

function UpsellSelect({ label, field, options, draft, setDraft }) {
  return (
    <div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: ".18em", color: "var(--fg-3)", textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {options.map(({ v, l }) => {
          const active = draft[field] === v;
          return (
            <button key={v} type="button" className="pill" onClick={() => setDraft((p) => ({ ...p, [field]: active ? undefined : v }))}
              style={{ borderColor: active ? "rgba(31,79,255,.55)" : undefined, background: active ? "rgba(31,79,255,.14)" : undefined, color: active ? "#fff" : undefined }}>
              <span className="dot" style={{ background: active ? "var(--mc-blue)" : "var(--fg-3)" }} />
              {l}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function UpsellToggle({ label, field, draft, setDraft }) {
  const active = Boolean(draft[field]);
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "var(--bg-2)", borderRadius: 10, border: "1px solid var(--bd-1)" }}>
      <div style={{ fontSize: 13, color: "var(--fg-1)" }}>{label}</div>
      <button type="button" onClick={() => setDraft((p) => ({ ...p, [field]: !p[field] }))}
        style={{ width: 44, height: 26, borderRadius: 999, border: "none", cursor: "pointer", background: active ? "var(--mc-blue)" : "rgba(255,255,255,.12)", position: "relative", transition: "background .2s", flexShrink: 0 }}>
        <span style={{ position: "absolute", top: 3, left: active ? 21 : 3, width: 20, height: 20, borderRadius: 999, background: "#fff", transition: "left .2s", display: "block" }} />
      </button>
    </div>
  );
}

function UpsellText({ label, field, placeholder, draft, setDraft }) {
  return (
    <div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: ".18em", color: "var(--fg-3)", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      <input value={draft[field] || ""} onChange={(e) => setDraft((p) => ({ ...p, [field]: e.target.value }))} placeholder={placeholder}
        style={{ width: "100%", padding: "10px 12px", background: "var(--bg-2)", border: "1px solid var(--bd-2)", borderRadius: 10, color: "var(--fg-1)", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
    </div>
  );
}

function UpsellMulti({ label, field, options, draft, setDraft }) {
  const selected = Array.isArray(draft[field]) ? draft[field] : [];
  return (
    <div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: ".18em", color: "var(--fg-3)", textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {options.map((o) => {
          const active = selected.includes(o);
          return (
            <button key={o} type="button" className="pill" onClick={() => setDraft((p) => ({ ...p, [field]: active ? selected.filter((x) => x !== o) : [...selected, o] }))}
              style={{ borderColor: active ? "rgba(31,79,255,.55)" : undefined, background: active ? "rgba(31,79,255,.14)" : undefined, color: active ? "#fff" : undefined }}>
              <span className="dot" style={{ background: active ? "var(--mc-blue)" : "var(--fg-3)" }} />
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}
