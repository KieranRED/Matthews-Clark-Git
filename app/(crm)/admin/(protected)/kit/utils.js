export function initials(name) {
  const n = String(name || "").trim();
  if (!n) return "—";
  return n
    .split(/\s+/g)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function moneyZAR(v) {
  const n = typeof v === "number" ? v : Number(v);
  const safe = Number.isFinite(n) ? n : 0;
  return "R" + safe.toLocaleString("en-ZA");
}

export function shortTime(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function shortDay(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

