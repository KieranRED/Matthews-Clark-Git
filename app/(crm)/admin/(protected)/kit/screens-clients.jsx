"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Icon } from "./icons";
import { EmptyState } from "./components";
import { initials, moneyZAR } from "./utils";

function uniqBy(arr, keyFn) {
  const out = [];
  const seen = new Set();
  for (const x of arr) {
    const k = keyFn(x);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(x);
  }
  return out;
}

export function ClientsScreen({ index, onNewLeadForClient }) {
  const router = useRouter();
  const [q, setQ] = useState("");

  const sorted = useMemo(() => {
    const list = (index?.CONTACTS || []).filter((c) => {
      if (c?.synthetic) return false;
      if (!q) return true;
      const hay = `${c?.name || ""} ${c?.partnerName || ""} ${c?.phone || ""}`.toLowerCase();
      return hay.includes(q.toLowerCase());
    });
    return [...list].sort((a, b) => (b?.vip ? 1 : 0) - (a?.vip ? 1 : 0) || String(a?.name || "").localeCompare(String(b?.name || "")));
  }, [index, q]);

  const totalClients = (index?.CONTACTS || []).filter((c) => !c?.synthetic).length;
  const vipCount = (index?.CONTACTS || []).filter((c) => !c?.synthetic && c?.vip).length;

  // LTV (rough): sum of delivered revenue.
  const delivered = (index?.JOBS || []).filter((j) => j.stage === "delivered");
  const ltvRevenue = delivered.reduce((s, j) => s + Number(j?.revenue || 0), 0);

  return (
    <div className="screen">
      <div className="search">
        <Icon.search />
        <input placeholder="Search clients, areas…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Icon.filter />
      </div>

      <div className="kpi-grid" style={{ padding: "14px 18px 0" }}>
        <div className="kpi">
          <div className="lbl">Total clients</div>
          <div className="val">{totalClients}</div>
          <div className="delta">{vipCount} VIP</div>
        </div>
        <div className="kpi kpi--accent">
          <div className="lbl">Revenue (delivered)</div>
          <div className="val">
            <span className="acc">R</span>
            {Math.round(ltvRevenue / 1000)}k
          </div>
          <div className="delta up">Approx</div>
        </div>
      </div>

      <div className="section-h" style={{ paddingBottom: 6 }}>
        <div className="eyebrow">DIRECTORY · {sorted.length} CONTACTS</div>
      </div>

      <div className="list">
        {sorted.length === 0 ? <EmptyState title="No clients found." /> : null}
        {sorted.map((c) => {
          const clientJobs = (index?.JOBS || []).filter((j) => String(j?.clientId || "") === String(c?.id || ""));
          const carLabels = uniqBy(
            clientJobs.map((j) => index?.vehicle(j.vehicleId)?.label).filter(Boolean),
            (x) => x
          );
          return (
            <div key={c.id} className="list-row" onClick={() => router.push(`/admin/clients/${encodeURIComponent(c.id)}`)}>
              <div className={"av " + (c.vip ? "vip" : "")}>{initials(c.name)}</div>
              <div className="who">
                <div className="name">
                  {c.name}
                  {c.vip ? <span style={{ color: "var(--mc-blue)", marginLeft: 6, fontSize: 11, letterSpacing: ".1em" }}>★</span> : null}
                </div>
                <div className="meta">
                  <span>{c.partnerName || "—"}</span>
                  <span className="sep">·</span>
                  <span>{carLabels.length} car{carLabels.length === 1 ? "" : "s"}</span>
                  <span className="sep">·</span>
                  <span>{clientJobs.length} job{clientJobs.length === 1 ? "" : "s"}</span>
                </div>
              </div>
              <div className="right">
                <span className="amount">{c.joined ? `since ${c.joined}` : ""}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ClientDetailScreen({ index, params, onRefresh, onNewLeadForClient }) {
  const router = useRouter();
  const clientId = params?.id || "";
  const c = index?.contact(clientId);
  const isIzimoto = String(index?.VIEWER?.role || "").startsWith("izimoto");
  const [deleting, setDeleting] = useState(false);
  if (!c) {
    return (
      <div className="screen">
        <EmptyState title="Client not found." />
      </div>
    );
  }

  const jobs = (index?.JOBS || []).filter((j) => String(j?.clientId || "") === String(c.id));
  const ltvRevenue = jobs.reduce((s, j) => s + Number(j?.revenue || 0), 0);
  const ltvProfit = jobs.reduce((s, j) => s + Number(j?.commission || 0), 0);

  const cars = uniqBy(
    jobs
      .map((j) => index?.vehicle(j.vehicleId))
      .filter(Boolean)
      .map((v) => ({ ...v, id: v.id || v.label })),
    (v) => v.label
  );

  const phone = c.phone || "—";

  return (
    <div className="screen">
      <div className="detail-hero" style={{ height: 170 }}>
        <span className="ph">[ portrait placeholder ]</span>
        {c.vip ? (
          <span className="stage-pill" style={{ background: "var(--mc-blue)", color: "#fff" }}>
            <span className="stage-dot" style={{ background: "#fff" }} />
            VIP
          </span>
        ) : null}
        <div className="who">
          <div className="ref">CLIENT · {c.joined ? `SINCE ${String(c.joined).toUpperCase()}` : "—"}</div>
          <div className="name">
            {String(c.name || "Client").split(" ")[0]} <span className="acc">{String(c.name || "").split(" ").slice(1).join(" ")}</span>
          </div>
        </div>
      </div>

      <div className="detail-meta">
        <div className="cell">
          <div className="lbl">Phone</div>
          <div className="val">{phone}</div>
        </div>
        <div className="cell">
          <div className="lbl">Email</div>
          <div className="val" style={{ fontSize: 12 }}>
            {c.email || "—"}
          </div>
        </div>
        <div className="cell">
          <div className="lbl">Partner</div>
          <div className="val">{c.partnerName || "—"}</div>
        </div>
        <div className="cell">
          <div className="lbl">LTV · revenue</div>
          <div className="val">{moneyZAR(ltvRevenue)}</div>
        </div>
        <div className="cell" style={{ gridColumn: "1 / -1" }}>
          <div className="lbl">LTV · profit (M&amp;C)</div>
          <div className="val" style={{ color: "var(--mc-blue)" }}>
            {moneyZAR(ltvProfit)}
          </div>
        </div>
      </div>

      <div className="detail-section">
        <h4>
          Garage · {cars.length} vehicle{cars.length === 1 ? "" : "s"}
        </h4>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {cars.map((v) => (
            <div key={v.id} className="card" style={{ padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                <div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 18, letterSpacing: ".02em", textTransform: "uppercase", lineHeight: 1 }}>
                    {v.label}
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".14em", color: "var(--fg-3)", textTransform: "uppercase", marginTop: 4 }}>
                    {v.year || "—"} · {v.colour || "—"} · {v.plate || "—"}
                  </div>
                </div>
                <Icon.car />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="detail-section">
        <h4>Job history</h4>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {jobs.length === 0 ? <EmptyState title="No jobs yet." /> : null}
          {jobs.map((j) => {
            const v = index?.vehicle(j.vehicleId);
            return (
              <div key={j.id} className="compact-row" onClick={() => router.push(`/admin/jobs/${encodeURIComponent(j.id)}`)}>
                <div className="lbl">
                  <div className="name">
                    {j.ref} · {index?.serviceLabels(j.services).join(" + ")}
                  </div>
                  <div className="meta">
                    {v?.label || "Vehicle"} · {j.start || "unscheduled"}
                  </div>
                </div>
                <div className="right">
                  <div className="acc">{index?.stage(j.stage)?.label || j.stage}</div>
                  <div>
                    {moneyZAR(j.revenue)} · <span style={{ color: "var(--mc-blue)" }}>+{moneyZAR(j.commission)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ padding: "8px 18px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
        {c.phone ? (
          <a className="bigbtn bigbtn--p" href={`tel:${c.phone}`}>
            <span>
              <Icon.phone /> &nbsp; Call client
            </span>
            <span className="arr">→</span>
          </a>
        ) : null}
        <button
          type="button"
          className="bigbtn bigbtn--g"
          onClick={() => onNewLeadForClient?.({ name: c.name || "", number: c.phone || "" })}
        >
          <span>
            <Icon.plus /> &nbsp; Start a new job
          </span>
          <span className="arr">→</span>
        </button>
        {!isIzimoto ? (
          <button
            type="button"
            className="bigbtn bigbtn--danger"
            disabled={deleting}
            onClick={async () => {
              if (deleting) return;
              const ok = window.confirm(`Delete ${c.name || "this client"}? This cannot be undone.`);
              if (!ok) return;
              setDeleting(true);
              try {
                const res = await fetch(`/api/admin/clients/${encodeURIComponent(clientId)}`, { method: "DELETE" });
                const json = await res.json().catch(() => null);
                if (!res.ok) throw new Error(json?.error || "Failed to delete client.");
                await onRefresh?.();
                router.push("/admin/clients");
              } catch (err) {
                window.alert(err instanceof Error ? err.message : "Failed to delete client.");
              } finally {
                setDeleting(false);
              }
            }}
          >
            <span>
              <Icon.trash /> &nbsp; {deleting ? "Deleting…" : "Delete client"}
            </span>
            <span className="arr">×</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
