"use client";

import { useEffect, useMemo, useState } from "react";

import styles from "./crm.module.css";

const STATUSES = ["new", "called", "quoted", "booked", "in_progress", "completed", "lost"];
const JOB_STATUSES = ["scheduled", "in_progress", "completed", "canceled"];

function fmtTime(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return "—";
  }
}

function statusLabel(status) {
  const s = String(status || "new");
  if (s === "called") return "Called";
  if (s === "quoted") return "Quoted";
  if (s === "booked") return "Booked";
  if (s === "in_progress") return "In progress";
  if (s === "completed") return "Completed";
  if (s === "lost") return "Lost";
  return "New";
}

function compact(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
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

export default function AdminCrm() {
  const [me, setMe] = useState(null);
  const [tab, setTab] = useState("dashboard"); // dashboard | leads | clients | jobs | tasks
  const [leads, setLeads] = useState([]);
  const [clients, setClients] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [filter, setFilter] = useState("all"); // all | new | called | quoted | ...
  const [q, setQ] = useState("");
  const [note, setNote] = useState("");
  const [followUpDraft, setFollowUpDraft] = useState("");
  const [quoteAmountDraft, setQuoteAmountDraft] = useState("");
  const [jobValueDraft, setJobValueDraft] = useState("");
  const [lostReasonDraft, setLostReasonDraft] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueDraft, setTaskDueDraft] = useState("");
  const [jobScheduledDraft, setJobScheduledDraft] = useState("");
  const [jobServicesDraft, setJobServicesDraft] = useState("");
  const [clientDetail, setClientDetail] = useState(null);
  const [clientLeads, setClientLeads] = useState([]);
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleYear, setVehicleYear] = useState("");
  const [vehicleReg, setVehicleReg] = useState("");
  const [vehicleColor, setVehicleColor] = useState("");
  const [clientNote, setClientNote] = useState("");

  async function loadMe() {
    const res = await fetch("/api/admin/me", { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json().catch(() => null);
    return json?.user || null;
  }

  async function loadLeads() {
    const res = await fetch(`/api/admin/leads?limit=120`, { cache: "no-store" });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.error || "Failed to load leads");
    return Array.isArray(json?.leads) ? json.leads : [];
  }

  async function loadClients() {
    const res = await fetch(`/api/admin/clients?limit=120`, { cache: "no-store" });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.error || "Failed to load clients");
    return Array.isArray(json?.clients) ? json.clients : [];
  }

  async function loadDashboard() {
    const res = await fetch(`/api/admin/dashboard`, { cache: "no-store" });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.error || "Failed to load dashboard");
    return json;
  }

  async function loadJobs() {
    const res = await fetch(`/api/admin/jobs?limit=120`, { cache: "no-store" });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.error || "Failed to load jobs");
    return Array.isArray(json?.jobs) ? json.jobs : [];
  }

  async function loadTasks() {
    const res = await fetch(`/api/admin/tasks?limit=120`, { cache: "no-store" });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.error || "Failed to load tasks");
    return Array.isArray(json?.tasks) ? json.tasks : [];
  }

  async function refresh() {
    setLoading(true);
    setErr("");
    try {
      const [user, list, dash] = await Promise.all([loadMe(), loadLeads(), loadDashboard()]);
      setMe(user);
      setLeads(list);
      setDashboard(dash);
      if (!selectedId && list[0]?.id) setSelectedId(list[0].id);
    } catch (e) {
      setErr(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    (async () => {
      try {
        const key = "mc_admin_backfill_clients_v1";
        if (typeof window === "undefined") return;
        if (window.localStorage.getItem(key) === "done") return;
        setErr("Updating clients…");
        const res = await fetch("/api/admin/maintenance/backfill-clients?leadLimit=2500&clientLimit=2500", { method: "POST" });
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.error || "Backfill failed");
        window.localStorage.setItem(key, "done");
        const leadPatched = json?.leads?.patched ?? 0;
        const leadReassigned = json?.leads?.reassigned ?? 0;
        const clientsUpdated = json?.clients?.updated ?? 0;
        setErr(`Updated clients: ${clientsUpdated}. Leads linked: ${leadPatched} (reassigned: ${leadReassigned}).`);
        setTimeout(() => setErr(""), 2400);
        await refresh();
      } catch {
        setErr("");
      }
    })();
    const id = setInterval(() => refresh(), 15_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = useMemo(() => leads.find((l) => l?.id === selectedId) || null, [leads, selectedId]);
  const selectedClient = useMemo(() => clients.find((c) => c?.id === selectedClientId) || null, [clients, selectedClientId]);

  async function loadClientDetail(clientId) {
    const res = await fetch(`/api/admin/clients/${encodeURIComponent(clientId)}`, { cache: "no-store" });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.error || "Failed to load client");
    return { client: json?.client || null, leads: Array.isArray(json?.leads) ? json.leads : [] };
  }

  useEffect(() => {
    if (tab !== "clients") return;
    if (!selectedClientId) return;
    (async () => {
      try {
        const d = await loadClientDetail(selectedClientId);
        setClientDetail(d.client);
        setClientLeads(d.leads);
      } catch (e) {
        setErr(e?.message || "Failed to load client");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClientId, tab]);

  useEffect(() => {
    if (!selected) return;
    setFollowUpDraft(isoToLocalInput(selected.followUpAt));
    setQuoteAmountDraft(selected.quoteAmount != null ? String(selected.quoteAmount) : "");
    setJobValueDraft(selected.jobValue != null ? String(selected.jobValue) : "");
    setLostReasonDraft(selected.lostReason != null ? String(selected.lostReason) : "");
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const query = compact(q).toLowerCase();
    return leads
      .filter((l) => {
        if (!l) return false;
        if (filter !== "all" && String(l.status || "new") !== filter) return false;
        if (!query) return true;
        const hay = `${l.name || ""} ${l.number || ""} ${l.car || ""} ${Array.isArray(l.services) ? l.services.join(" ") : ""}`.toLowerCase();
        return hay.includes(query);
      })
      .slice(0, 200);
  }, [leads, filter, q]);

  const filteredClients = useMemo(() => {
    const query = compact(q).toLowerCase();
    return clients
      .filter((c) => {
        if (!c) return false;
        if (!query) return true;
        const hay = `${c.name || ""} ${c.phone || ""} ${c.phoneNorm || ""}`.toLowerCase();
        return hay.includes(query);
      })
      .slice(0, 200);
  }, [clients, q]);

  async function patchLead(id, patch) {
    const res = await fetch(`/api/admin/leads/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch)
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.error || "Update failed");
    const next = json?.lead || null;
    if (next?.id) {
      setLeads((prev) => prev.map((l) => (l?.id === next.id ? next : l)));
    }
    return next;
  }

  async function onMarkCalled() {
    if (!selected?.id) return;
    try {
      await patchLead(selected.id, { status: "called" });
    } catch (e) {
      setErr(e?.message || "Failed to update lead");
    }
  }

  async function onSetStatus(status) {
    if (!selected?.id) return;
    try {
      await patchLead(selected.id, { status });
    } catch (e) {
      setErr(e?.message || "Failed to update lead");
    }
  }

  async function onSaveFollowUp() {
    if (!selected?.id) return;
    const iso = localInputToIso(followUpDraft);
    try {
      await patchLead(selected.id, { followUpAt: iso });
      setErr("Saved follow-up.");
      setTimeout(() => setErr(""), 1400);
    } catch (e) {
      setErr(e?.message || "Failed to save follow-up");
    }
  }

  async function onSaveCommercials() {
    if (!selected?.id) return;
    const quoteAmount = quoteAmountDraft.trim() ? Number(quoteAmountDraft) : null;
    const jobValue = jobValueDraft.trim() ? Number(jobValueDraft) : null;
    if (quoteAmountDraft.trim() && !Number.isFinite(quoteAmount)) {
      setErr("Quote amount must be a number.");
      return;
    }
    if (jobValueDraft.trim() && !Number.isFinite(jobValue)) {
      setErr("Job value must be a number.");
      return;
    }
    try {
      await patchLead(selected.id, { quoteAmount, jobValue });
      setErr("Saved amounts.");
      setTimeout(() => setErr(""), 1400);
    } catch (e) {
      setErr(e?.message || "Failed to save amounts");
    }
  }

  async function onSaveLost() {
    if (!selected?.id) return;
    try {
      await patchLead(selected.id, { status: "lost", lostReason: lostReasonDraft.trim() ? lostReasonDraft.trim() : null });
    } catch (e) {
      setErr(e?.message || "Failed to mark lost");
    }
  }

  async function onAddNote() {
    if (!selected?.id) return;
    if (!note.trim()) return;
    const text = note.trim();
    setNote("");
    try {
      await patchLead(selected.id, { note: text });
    } catch (e) {
      setErr(e?.message || "Failed to add note");
    }
  }

  async function onGetQuoteLink() {
    if (!selected?.id) return;
    try {
      const res = await fetch(`/api/admin/leads/${encodeURIComponent(selected.id)}/quote-link`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to get link");
      const url = json?.url;
      if (!url) throw new Error("Missing link");
      await navigator.clipboard.writeText(url);
      setErr("Copied quote link to clipboard.");
      setTimeout(() => setErr(""), 2500);
    } catch (e) {
      setErr(e?.message || "Failed to copy link");
    }
  }

  async function onCopy(text) {
    try {
      await navigator.clipboard.writeText(String(text || ""));
      setErr("Copied.");
      setTimeout(() => setErr(""), 1400);
    } catch {
      setErr("Could not copy.");
      setTimeout(() => setErr(""), 1400);
    }
  }

  async function onLogout() {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => null);
    window.location.href = "/admin/login";
  }

  async function onSeed() {
    setErr("");
    try {
      const res = await fetch("/api/admin/seed", { method: "POST" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Seed failed");
      await refresh();
      setErr("Seeded a test lead.");
      setTimeout(() => setErr(""), 2000);
    } catch (e) {
      setErr(e?.message || "Seed failed");
    }
  }

  async function onBackfill() {
    setErr("");
    try {
      const res = await fetch("/api/admin/maintenance/backfill-clients?leadLimit=2500&clientLimit=2500", { method: "POST" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Backfill failed");
      await refresh();
      const leadPatched = json?.leads?.patched ?? 0;
      const leadReassigned = json?.leads?.reassigned ?? 0;
      const clientsUpdated = json?.clients?.updated ?? 0;
      setErr(`Updated clients: ${clientsUpdated}. Leads linked: ${leadPatched} (reassigned: ${leadReassigned}).`);
      setTimeout(() => setErr(""), 2200);
    } catch (e) {
      setErr(e?.message || "Backfill failed");
    }
  }

  async function onOpenJobs() {
    setTab("jobs");
    setLoading(true);
    setErr("");
    try {
      const list = await loadJobs();
      setJobs(list);
    } catch (e) {
      setErr(e?.message || "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }

  async function onOpenTasks() {
    setTab("tasks");
    setLoading(true);
    setErr("");
    try {
      const list = await loadTasks();
      setTasks(list);
    } catch (e) {
      setErr(e?.message || "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }

  async function onCreateTask() {
    if (!taskTitle.trim()) return;
    setErr("");
    try {
      const res = await fetch("/api/admin/tasks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: taskTitle.trim(),
          dueAt: localInputToIso(taskDueDraft),
          leadId: selected?.id || null,
          clientId: selected?.clientId || null
        })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Task create failed");
      setTaskTitle("");
      setTaskDueDraft("");
      const list = await loadTasks();
      setTasks(list);
      setErr("Task created.");
      setTimeout(() => setErr(""), 1400);
    } catch (e) {
      setErr(e?.message || "Task create failed");
    }
  }

  async function onTaskDone(taskId) {
    setErr("");
    try {
      const res = await fetch(`/api/admin/tasks/${encodeURIComponent(taskId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "done" })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Task update failed");
      const list = await loadTasks();
      setTasks(list);
    } catch (e) {
      setErr(e?.message || "Task update failed");
    }
  }

  async function onCreateJobFromLead() {
    if (!selected?.clientId) {
      setErr("No client attached to this lead yet.");
      return;
    }
    setErr("");
    try {
      const services = jobServicesDraft
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await fetch("/api/admin/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clientId: selected.clientId,
          leadId: selected.id,
          scheduledAt: localInputToIso(jobScheduledDraft),
          services: services.length ? services : selected.services || []
        })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Job create failed");
      setJobScheduledDraft("");
      setJobServicesDraft("");
      setTab("jobs");
      const list = await loadJobs();
      setJobs(list);
      setErr("Job created.");
      setTimeout(() => setErr(""), 1400);
    } catch (e) {
      setErr(e?.message || "Job create failed");
    }
  }

  async function onOpenClients() {
    setTab("clients");
    setLoading(true);
    setErr("");
    try {
      const list = await loadClients();
      setClients(list);
      if (!selectedClientId && list[0]?.id) setSelectedClientId(list[0].id);
      const first = selectedClientId || list[0]?.id;
      if (first) {
        const d = await loadClientDetail(first);
        setClientDetail(d.client);
        setClientLeads(d.leads);
      }
    } catch (e) {
      setErr(e?.message || "Failed to load clients");
    } finally {
      setLoading(false);
    }
  }

  async function onAddVehicle() {
    if (!selectedClientId) return;
    if (!vehicleMake.trim() || !vehicleModel.trim()) {
      setErr("Vehicle make + model required.");
      return;
    }
    setErr("");
    try {
      const res = await fetch(`/api/admin/clients/${encodeURIComponent(selectedClientId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          vehicle: {
            make: vehicleMake.trim(),
            model: vehicleModel.trim(),
            year: vehicleYear.trim() || null,
            reg: vehicleReg.trim() || null,
            color: vehicleColor.trim() || null
          }
        })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Vehicle add failed");
      setVehicleMake("");
      setVehicleModel("");
      setVehicleYear("");
      setVehicleReg("");
      setVehicleColor("");
      const d = await loadClientDetail(selectedClientId);
      setClientDetail(d.client);
      setClientLeads(d.leads);
      setErr("Vehicle added.");
      setTimeout(() => setErr(""), 1400);
    } catch (e) {
      setErr(e?.message || "Vehicle add failed");
    }
  }

  async function onAddClientNote() {
    if (!selectedClientId) return;
    if (!clientNote.trim()) return;
    setErr("");
    try {
      const res = await fetch(`/api/admin/clients/${encodeURIComponent(selectedClientId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ note: clientNote.trim() })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Note add failed");
      setClientNote("");
      const d = await loadClientDetail(selectedClientId);
      setClientDetail(d.client);
      setClientLeads(d.leads);
      setErr("Note added.");
      setTimeout(() => setErr(""), 1400);
    } catch (e) {
      setErr(e?.message || "Note add failed");
    }
  }

  return (
    <main className={styles.wrap}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <div className={styles.logo}>
            M<span className={styles.acc}>/</span>C
          </div>
          <div className={styles.title}>CRM</div>
        </div>
        <nav className={styles.nav}>
          <button className={`${styles.navBtn} ${tab === "dashboard" ? styles.navBtnActive : ""}`} onClick={() => setTab("dashboard")}>
            Dashboard
          </button>
          <button className={`${styles.navBtn} ${tab === "leads" ? styles.navBtnActive : ""}`} onClick={() => setTab("leads")}>
            Leads
          </button>
          <button className={`${styles.navBtn} ${tab === "clients" ? styles.navBtnActive : ""}`} onClick={onOpenClients}>
            Clients
          </button>
          <button className={`${styles.navBtn} ${tab === "jobs" ? styles.navBtnActive : ""}`} onClick={onOpenJobs}>
            Jobs
          </button>
          <button className={`${styles.navBtn} ${tab === "tasks" ? styles.navBtnActive : ""}`} onClick={onOpenTasks}>
            Tasks
          </button>
        </nav>
        <div className={styles.topRight}>
          <div className={styles.user}>{me?.username || "admin"}</div>
          <button className={styles.ghost} onClick={onSeed}>
            Seed test lead
          </button>
          <button className={styles.ghost} onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>

      {tab !== "dashboard" ? (
        <section className={styles.controls}>
          <input className={styles.search} value={q} onChange={(e) => setQ(e.target.value)} placeholder={tab === "clients" ? "Search client…" : "Search name, number, car…"} />
          {tab === "leads" ? (
            <div className={styles.filters}>
              {["all", ...STATUSES].map((s) => (
                <button key={s} className={`${styles.pill} ${filter === s ? styles.pillActive : ""}`} onClick={() => setFilter(s)}>
                  {s === "all" ? "All" : statusLabel(s)}
                </button>
              ))}
            </div>
          ) : tab === "jobs" ? (
            <div className={styles.filters}>
              {["all", ...JOB_STATUSES].map((s) => (
                <button key={s} className={`${styles.pill} ${filter === s ? styles.pillActive : ""}`} onClick={() => setFilter(s)}>
                  {s === "all" ? "All" : s.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          ) : tab === "tasks" ? (
            <div className={styles.filters}>
              {["all", "open", "done"].map((s) => (
                <button key={s} className={`${styles.pill} ${filter === s ? styles.pillActive : ""}`} onClick={() => setFilter(s)}>
                  {s === "all" ? "All" : s}
                </button>
              ))}
            </div>
          ) : (
            <div />
          )}
          <button className={styles.ghost} onClick={refresh}>
            Refresh
          </button>
        </section>
      ) : null}

      {err ? <div className={styles.banner}>{err}</div> : null}

      {tab === "dashboard" ? (
        <section className={styles.dashboard}>
          <div className={styles.card}>
            <div className={styles.cardTitleRow}>
              <div className={styles.cardTitle}>Quick actions</div>
              <a className={styles.link} href="/api/admin/export/leads.csv" target="_blank" rel="noreferrer">
                Export leads CSV
              </a>
            </div>
            <div className={styles.emptySmall}>Use export for spreadsheets, reporting, or bookkeeping.</div>
          </div>

          <div className={styles.metrics}>
            <div className={styles.metric}>
              <div className={styles.metricK}>Leads</div>
              <div className={styles.metricV}>{dashboard?.totals?.leads ?? "—"}</div>
            </div>
            <div className={styles.metric}>
              <div className={styles.metricK}>Clients</div>
              <div className={styles.metricV}>{dashboard?.totals?.clients ?? "—"}</div>
            </div>
            <div className={styles.metric}>
              <div className={styles.metricK}>Repeat clients</div>
              <div className={styles.metricV}>{dashboard?.totals?.repeatClients ?? "—"}</div>
            </div>
            <div className={styles.metric}>
              <div className={styles.metricK}>Jobs</div>
              <div className={styles.metricV}>{dashboard?.totals?.jobs ?? "—"}</div>
            </div>
            <div className={styles.metric}>
              <div className={styles.metricK}>Open tasks</div>
              <div className={styles.metricV}>{dashboard?.totals?.openTasks ?? "—"}</div>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardTitleRow}>
              <div className={styles.cardTitle}>Pipeline</div>
              <button className={styles.ghost} onClick={onBackfill}>
                Update clients
              </button>
            </div>
            <div className={styles.pipeline}>
              {STATUSES.map((s) => (
                <div key={s} className={styles.pipeItem}>
                  <div className={styles.pipeK}>{statusLabel(s)}</div>
                  <div className={styles.pipeV}>{dashboard?.statusCounts?.[s] ?? 0}</div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardTitle}>Leads (last 14 days)</div>
            <div className={styles.bars}>
              {dashboard?.leadsByDay
                ? Object.entries(dashboard.leadsByDay).map(([day, n]) => (
                    <div key={day} className={styles.bar}>
                      <div className={styles.barFill} style={{ height: `${Math.min(100, (n || 0) * 14)}%` }} />
                      <div className={styles.barLbl}>{day.slice(5)}</div>
                    </div>
                  ))
                : null}
            </div>
          </div>
        </section>
      ) : null}

      {tab === "clients" ? (
        <div className={styles.grid}>
          <aside className={styles.list}>
            {loading ? <div className={styles.empty}>Loading…</div> : null}
            {!loading && filteredClients.length === 0 ? <div className={styles.empty}>No clients yet.</div> : null}
            {filteredClients.map((c) => (
              <button
                key={c.id}
                className={`${styles.item} ${selectedClientId === c.id ? styles.itemActive : ""}`}
                onClick={() => setSelectedClientId(c.id)}
              >
                <div className={styles.itemTop}>
                  <div className={styles.itemName}>{c.name || "—"}</div>
                  <div className={styles.badge}>{Number(c.leadCount || 0) > 1 ? `Repeat ×${c.leadCount}` : "Client"}</div>
                </div>
                <div className={styles.itemSub}>{c.phone || c.phoneNorm || "—"}</div>
                <div className={styles.itemMeta}>
                  <span>Last lead: {fmtTime(c.lastLeadAt)}</span>
                </div>
              </button>
            ))}
          </aside>

          <section className={styles.detail}>
            {!selectedClient ? (
              <div className={styles.empty}>Select a client.</div>
            ) : (
              <div className={styles.detailCard}>
                <div className={styles.detailHeader}>
                  <div>
                    <div className={styles.hName}>{clientDetail?.name || selectedClient.name || "—"}</div>
                    <div className={styles.hMeta}>
                      <span className={styles.hId}>
                        Client ID: <code>{selectedClient.id}</code>
                      </span>
                      <span className={styles.dot}>•</span>
                      <span>Leads: {selectedClient.leadCount || 0}</span>
                    </div>
                  </div>
                  <div className={styles.actions}>
                    <button className={styles.ghost} onClick={() => onCopy(selectedClient.phone || selectedClient.phoneNorm)}>
                      Copy phone
                    </button>
                  </div>
                </div>

                <div className={styles.kv}>
                  <div className={styles.k}>Phone</div>
                  <div className={styles.v}>{selectedClient.phone || selectedClient.phoneNorm || "—"}</div>
                  <div className={styles.k}>Last lead</div>
                  <div className={styles.v}>{fmtTime(selectedClient.lastLeadAt)}</div>
                  <div className={styles.k}>Created</div>
                  <div className={styles.v}>{fmtTime(selectedClient.createdAt)}</div>
                </div>

                <div className={styles.card}>
                  <div className={styles.cardTitle}>Vehicles</div>
                  <div className={styles.vehicleForm}>
                    <input className={styles.inputSmall} placeholder="Make" value={vehicleMake} onChange={(e) => setVehicleMake(e.target.value)} />
                    <input className={styles.inputSmall} placeholder="Model" value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} />
                    <input className={styles.inputSmall} placeholder="Year" value={vehicleYear} onChange={(e) => setVehicleYear(e.target.value)} />
                    <input className={styles.inputSmall} placeholder="Reg" value={vehicleReg} onChange={(e) => setVehicleReg(e.target.value)} />
                    <input className={styles.inputSmall} placeholder="Color" value={vehicleColor} onChange={(e) => setVehicleColor(e.target.value)} />
                    <button className={styles.primary} onClick={onAddVehicle}>
                      Add
                    </button>
                  </div>
                  <div className={styles.vehicleList}>
                    {Array.isArray(clientDetail?.vehicles) && clientDetail.vehicles.length ? (
                      clientDetail.vehicles.slice(0, 10).map((v) => (
                        <div key={v.id || `${v.make}-${v.model}-${v.reg}`} className={styles.vehicleRow}>
                          <div className={styles.vehicleTitle}>
                            {v.make} {v.model} {v.year ? `(${v.year})` : ""}
                          </div>
                          <div className={styles.itemMeta}>
                            <span>{v.reg || "—"}</span>
                            <span className={styles.dot}>•</span>
                            <span>{v.color || "—"}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className={styles.emptySmall}>No vehicles yet.</div>
                    )}
                  </div>
                </div>

                <div className={styles.card}>
                  <div className={styles.cardTitle}>Client notes</div>
                  <div className={styles.lostRow}>
                    <input className={styles.inputSmall} placeholder="Add a note…" value={clientNote} onChange={(e) => setClientNote(e.target.value)} />
                    <button className={styles.ghost} onClick={onAddClientNote} disabled={!clientNote.trim()}>
                      Add note
                    </button>
                  </div>
                  <div className={styles.noteList} style={{ marginTop: 10 }}>
                    {Array.isArray(clientDetail?.notes) && clientDetail.notes.length ? (
                      clientDetail.notes.slice(0, 10).map((n, i) => (
                        <div key={`${n.at || i}`} className={styles.note}>
                          <div className={styles.noteMeta}>
                            <span className={styles.noteBy}>{n.by || "—"}</span>
                            <span className={styles.dot}>•</span>
                            <span>{fmtTime(n.at)}</span>
                          </div>
                          <div className={styles.noteText}>{n.text || ""}</div>
                        </div>
                      ))
                    ) : (
                      <div className={styles.emptySmall}>No notes yet.</div>
                    )}
                  </div>
                </div>

                <div className={styles.card}>
                  <div className={styles.cardTitle}>Lead history</div>
                  {Array.isArray(clientLeads) && clientLeads.length ? (
                    clientLeads.slice(0, 10).map((l) => (
                      <button key={l.id} className={styles.item} onClick={() => { setTab("leads"); setSelectedId(l.id); }}>
                        <div className={styles.itemTop}>
                          <div className={styles.itemName}>{l.car || "—"}</div>
                          <div className={`${styles.badge} ${styles[`badge_${String(l.status || "new")}`] || ""}`}>{statusLabel(l.status)}</div>
                        </div>
                        <div className={styles.itemMeta}>
                          <span>{fmtTime(l.createdAt)}</span>
                          <span className={styles.dot}>•</span>
                          <span>{Array.isArray(l.services) ? l.services.join(" · ") : "—"}</span>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className={styles.emptySmall}>No leads yet.</div>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      ) : null}

      {tab === "leads" ? (
        <div className={styles.grid}>
          <aside className={styles.list}>
            {loading ? <div className={styles.empty}>Loading…</div> : null}
            {!loading && filtered.length === 0 ? <div className={styles.empty}>No leads yet.</div> : null}
            {filtered.map((l) => (
              <button key={l.id} className={`${styles.item} ${selectedId === l.id ? styles.itemActive : ""}`} onClick={() => setSelectedId(l.id)}>
                <div className={styles.itemTop}>
                  <div className={styles.itemName}>{l.name || "—"}</div>
                  <div className={`${styles.badge} ${styles[`badge_${String(l.status || "new")}`] || ""}`}>{statusLabel(l.status)}</div>
                </div>
                <div className={styles.itemSub}>{l.car || "—"}</div>
                <div className={styles.itemMeta}>
                  <span>{l.number || "—"}</span>
                  {Number(l.clientLeadCount || 0) > 1 ? (
                    <>
                      <span className={styles.dot}>•</span>
                      <span className={styles.repeat}>Repeat ×{l.clientLeadCount}</span>
                    </>
                  ) : null}
                  <span className={styles.dot}>•</span>
                  <span>{fmtTime(l.createdAt)}</span>
                </div>
              </button>
            ))}
          </aside>

          <section className={styles.detail}>
            {!selected ? (
              <div className={styles.empty}>Select a lead.</div>
            ) : (
              <div className={styles.detailCard}>
                <div className={styles.detailHeader}>
                  <div>
                    <div className={styles.hName}>{selected.name || "—"}</div>
                    <div className={styles.hMeta}>
                      <span className={styles.hId}>
                        Lead ID: <code>{selected.id}</code>
                      </span>
                      <span className={styles.dot}>•</span>
                      <span>Created: {fmtTime(selected.createdAt)}</span>
                      {selected.clientId ? (
                        <>
                          <span className={styles.dot}>•</span>
                          <span>
                            Client: <code>{String(selected.clientId).slice(0, 8)}</code>
                          </span>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <div className={styles.actions}>
                    <button className={styles.primary} onClick={onMarkCalled} disabled={String(selected.status) === "called"}>
                      Mark called
                    </button>
                    <button className={styles.ghost} onClick={onGetQuoteLink}>
                      Copy quote link
                    </button>
                  </div>
                </div>

              <div className={styles.kv}>
                  <div className={styles.k}>Phone</div>
                  <div className={styles.v}>
                    <span>{selected.number || "—"}</span>
                    {selected.number ? (
                      <button className={styles.kvAction} onClick={() => onCopy(selected.number)}>
                        Copy
                      </button>
                    ) : null}
                  </div>
                  <div className={styles.k}>Car</div>
                  <div className={styles.v}>{selected.car || "—"}</div>
                  <div className={styles.k}>Lane</div>
                  <div className={styles.v}>{selected.lane || "—"}</div>
                  <div className={styles.k}>Services</div>
                  <div className={styles.v}>{Array.isArray(selected.services) ? selected.services.join(" · ") : "—"}</div>
                  <div className={styles.k}>Timing</div>
                  <div className={styles.v}>{selected.timeframe || "—"}</div>

                  <div className={styles.k}>Lifecycle</div>
                  <div className={styles.v}>
                    <select className={styles.select} value={String(selected.status || "new")} onChange={(e) => onSetStatus(e.target.value)}>
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {statusLabel(s)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.k}>Follow-up</div>
                  <div className={styles.v}>
                    <input className={styles.inputSmall} type="datetime-local" value={followUpDraft} onChange={(e) => setFollowUpDraft(e.target.value)} />
                    <button className={styles.kvAction} onClick={onSaveFollowUp}>
                      Save
                    </button>
                  </div>

                  <div className={styles.k}>Quote</div>
                  <div className={styles.v}>
                    {selected.quoteUrl ? (
                      <>
                        <a className={styles.link} href={selected.quoteUrl} target="_blank" rel="noreferrer">
                          Open
                        </a>
                        <button className={styles.kvAction} onClick={() => onCopy(selected.quoteUrl)}>
                          Copy
                        </button>
                      </>
                    ) : (
                      "—"
                    )}
                  </div>

                  <div className={styles.k}>Amounts</div>
                  <div className={styles.v}>
                    <input className={styles.inputSmall} inputMode="decimal" placeholder="Quote" value={quoteAmountDraft} onChange={(e) => setQuoteAmountDraft(e.target.value)} />
                    <input className={styles.inputSmall} inputMode="decimal" placeholder="Job" value={jobValueDraft} onChange={(e) => setJobValueDraft(e.target.value)} />
                    <button className={styles.kvAction} onClick={onSaveCommercials}>
                      Save
                    </button>
                  </div>
                </div>

                <div className={styles.card}>
                  <div className={styles.cardTitle}>Actions</div>
                  <div className={styles.lostRow}>
                    <input
                      className={styles.inputSmall}
                      type="datetime-local"
                      value={jobScheduledDraft}
                      onChange={(e) => setJobScheduledDraft(e.target.value)}
                      placeholder="Schedule"
                    />
                    <input
                      className={styles.inputSmall}
                      value={jobServicesDraft}
                      onChange={(e) => setJobServicesDraft(e.target.value)}
                      placeholder="Services (comma separated)"
                    />
                    <button className={styles.primary} onClick={onCreateJobFromLead}>
                      Create job
                    </button>
                  </div>
                  <div className={styles.lostRow} style={{ marginTop: 10 }}>
                    <input className={styles.inputSmall} value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="New task title" />
                    <input className={styles.inputSmall} type="datetime-local" value={taskDueDraft} onChange={(e) => setTaskDueDraft(e.target.value)} />
                    <button className={styles.ghost} onClick={onCreateTask}>
                      Add task
                    </button>
                  </div>
                </div>

                {String(selected.status) !== "lost" ? (
                  <div className={styles.card}>
                    <div className={styles.cardTitle}>Mark lost</div>
                    <div className={styles.lostRow}>
                      <input className={styles.inputSmall} placeholder="Reason (optional)" value={lostReasonDraft} onChange={(e) => setLostReasonDraft(e.target.value)} />
                      <button className={styles.danger} onClick={onSaveLost}>
                        Lost
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className={styles.notes}>
                  <div className={styles.notesTitle}>Notes</div>
                  <div className={styles.noteComposer}>
                    <textarea className={styles.textarea} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note…" />
                    <button className={styles.primary} onClick={onAddNote} disabled={!note.trim()}>
                      Add note
                    </button>
                  </div>
                  <div className={styles.noteList}>
                    {Array.isArray(selected.notes) && selected.notes.length ? (
                      selected.notes.slice(0, 30).map((n, i) => (
                        <div key={`${n.at || i}`} className={styles.note}>
                          <div className={styles.noteMeta}>
                            <span className={styles.noteBy}>{n.by || "—"}</span>
                            <span className={styles.dot}>•</span>
                            <span>{fmtTime(n.at)}</span>
                          </div>
                          <div className={styles.noteText}>{n.text || ""}</div>
                        </div>
                      ))
                    ) : (
                      <div className={styles.emptySmall}>No notes yet.</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      ) : null}

      {tab === "jobs" ? (
        <section className={styles.card} style={{ marginTop: 12 }}>
          <div className={styles.cardTitle}>Jobs</div>
          {loading ? <div className={styles.empty}>Loading…</div> : null}
          {!loading && jobs.length === 0 ? <div className={styles.empty}>No jobs yet.</div> : null}
          <div className={styles.jobGrid}>
            {jobs
              .filter((j) => {
                if (!j) return false;
                if (filter !== "all" && String(j.status || "") !== filter) return false;
                const query = compact(q).toLowerCase();
                if (!query) return true;
                const hay = `${j.clientId || ""} ${(j.services || []).join(" ")}`.toLowerCase();
                return hay.includes(query);
              })
              .map((j) => (
                <div key={j.id} className={styles.jobCard}>
                  <div className={styles.jobTop}>
                    <div className={styles.jobTitle}>{(j.services || []).join(" · ") || "Job"}</div>
                    <div className={styles.badge}>{String(j.status || "scheduled").replace(/_/g, " ")}</div>
                  </div>
                  <div className={styles.itemMeta}>
                    <span>Client: <code>{String(j.clientId || "—").slice(0, 8)}</code></span>
                    <span className={styles.dot}>•</span>
                    <span>When: {j.scheduledAt ? fmtTime(j.scheduledAt) : "—"}</span>
                  </div>
                  <div className={styles.itemMeta}>
                    <span>Payment: {j.paymentStatus || "unpaid"}</span>
                    <span className={styles.dot}>•</span>
                    <span>Value: {j.jobValue ?? "—"}</span>
                  </div>
                </div>
              ))}
          </div>
        </section>
      ) : null}

      {tab === "tasks" ? (
        <section className={styles.card} style={{ marginTop: 12 }}>
          <div className={styles.cardTitle}>Tasks</div>
          {loading ? <div className={styles.empty}>Loading…</div> : null}
          {!loading && tasks.length === 0 ? <div className={styles.empty}>No tasks yet.</div> : null}
          <div className={styles.taskList}>
            {tasks
              .filter((t) => {
                if (!t) return false;
                if (filter !== "all" && String(t.status || "open") !== filter) return false;
                const query = compact(q).toLowerCase();
                if (!query) return true;
                const hay = `${t.title || ""} ${t.assignedTo || ""}`.toLowerCase();
                return hay.includes(query);
              })
              .map((t) => (
                <div key={t.id} className={styles.taskRow}>
                  <div>
                    <div className={styles.taskTitle}>{t.title}</div>
                    <div className={styles.itemMeta}>
                      <span>Due: {t.dueAt ? fmtTime(t.dueAt) : "—"}</span>
                      <span className={styles.dot}>•</span>
                      <span>Status: {t.status || "open"}</span>
                    </div>
                  </div>
                  <div className={styles.actions}>
                    {String(t.status || "open") === "open" ? (
                      <button className={styles.primary} onClick={() => onTaskDone(t.id)}>
                        Done
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
