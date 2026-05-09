import { hasKv, kvIncr } from "@/lib/kv";

function pad5(n) {
  const s = String(n == null ? "" : n).replace(/[^\d]/g, "");
  if (!s) return "00000";
  return s.slice(-5).padStart(5, "0");
}

export function invoiceDisplayFromDigits(digits) {
  return `MC_${pad5(digits)}`;
}

export async function allocateInvoiceDigits() {
  if (!hasKv()) return null;
  const next = await kvIncr("invoices:seq");
  return pad5(next);
}

