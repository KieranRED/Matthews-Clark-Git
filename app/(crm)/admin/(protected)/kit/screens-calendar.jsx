"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Icon } from "./icons";
import { EmptyState } from "./components";
import { moneyZAR, shortDay, shortTime } from "./utils";

function startOfWeekMonday(d) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // Mon=0 ... Sun=6
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function isoFromLocal(dateStr, timeStr) {
  const d = String(dateStr || "").trim();
  const t = String(timeStr || "").trim();
  if (!d) return null;
  const val = `${d}T${t || "09:00"}`;
  const dt = new Date(val);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString();
}

function BlockBayModal({ onClose, onCreate }) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("09:00");
  const [title, setTitle] = useState("Bay block");
  const [status, setStatus] = useState({ state: "idle", message: "" });

  async function submit() {
    setStatus({ state: "loading", message: "Saving…" });
    try {
      const dueAt = isoFromLocal(date, time);
      const res = await fetch("/api/admin/tasks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: `🗓️ ${title}`, dueAt })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to save.");
      setStatus({ state: "success", message: "Saved." });
      onCreate?.();
      onClose?.();
    } catch (err) {
      setStatus({ state: "error", message: err instanceof Error ? err.message : "Failed to save." });
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 230,
        background: "rgba(0,0,0,.62)",
        backdropFilter: "blur(6px)",
        display: "grid",
        placeItems: "center",
        padding: 14
      }}
    >
      <div className="card" style={{ width: "min(520px, calc(100vw - 28px))", overflow: "hidden" }}>
        <div style={{ padding: 14, borderBottom: "1px solid var(--bd-1)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div>
            <div className="eyebrow">CALENDAR</div>
            <div style={{ fontFamily: "var(--font-display)", textTransform: "uppercase", letterSpacing: ".02em", marginTop: 2 }}>Block bay time</div>
          </div>
          <button onClick={onClose} className="icon-btn" aria-label="Close" title="Close">
            <Icon.back />
          </button>
        </div>
        <div style={{ padding: 14, display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <div className="eyebrow">Date</div>
              <input value={date} onChange={(e) => setDate(e.target.value)} type="date" className="card" style={{ padding: "12px 12px", borderRadius: 12, border: "1px solid var(--bd-1)", background: "var(--bg-2)", color: "#fff", outline: "none" }} />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <div className="eyebrow">Time</div>
              <input value={time} onChange={(e) => setTime(e.target.value)} type="time" className="card" style={{ padding: "12px 12px", borderRadius: 12, border: "1px solid var(--bd-1)", background: "var(--bg-2)", color: "#fff", outline: "none" }} />
            </label>
          </div>
          <label style={{ display: "grid", gap: 6 }}>
            <div className="eyebrow">Title</div>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="card" style={{ padding: "12px 12px", borderRadius: 12, border: "1px solid var(--bd-1)", background: "var(--bg-2)", color: "#fff", outline: "none" }} />
          </label>
          <button className="bigbtn bigbtn--p" onClick={submit} disabled={status.state === "loading"}>
            <span>
              <Icon.check /> &nbsp; Save block
            </span>
            <span className="arr">→</span>
          </button>
          {status.state !== "idle" ? (
            <div style={{ fontSize: 12, color: status.state === "error" ? "rgba(255,110,110,.95)" : "var(--fg-2)" }}>{status.message}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function CalendarScreen({ index, onRefresh }) {
  const router = useRouter();
  const [active, setActive] = useState(0);
  const [blockOpen, setBlockOpen] = useState(false);

  const weekStart = useMemo(() => startOfWeekMonday(new Date()), []);
  const week = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

  const days = useMemo(
    () =>
      week.map((_, i) => {
        const d = addDays(weekStart, i);
        const iso = d.toISOString().slice(0, 10);
        return { i, date: d, iso, num: d.getDate() };
      }),
    [weekStart]
  );

  const schedule = useMemo(() => {
    const map = new Map();
    for (const day of days) map.set(day.iso, []);

    const jobs = index?.JOBS || [];
    for (const j of jobs) {
      if (!j?.start) continue;
      if (!map.has(j.start)) continue;
      map.get(j.start).push({ type: "job", when: "All day", jobId: j.id, kind: index?.stage(j.stage)?.label || "Job" });
    }

    const tasks = index?.TASKS || [];
    for (const t of tasks) {
      if (!t?.dueAt) continue;
      const dayIso = shortDay(t.dueAt);
      if (!dayIso || !map.has(dayIso)) continue;
      map.get(dayIso).push({ type: "task", when: shortTime(t.dueAt) || "", taskId: t.id, jobId: t.leadId || null, kind: t.title || "Task" });
    }

    for (const items of map.values()) {
      items.sort((a, b) => String(a.when).localeCompare(String(b.when)));
    }
    return map;
  }, [index, days]);

  const activeDay = days[active] || days[0];
  const items = schedule.get(activeDay?.iso) || [];

  return (
    <div className="screen">
      <div className="section-h" style={{ paddingBottom: 6 }}>
        <div>
          <div className="eyebrow">THIS WEEK</div>
          <div className="section-title">
            Bay <span className="acc">schedule.</span>
          </div>
        </div>
        <button type="button" className="more" onClick={() => setBlockOpen(true)}>
          Block →
        </button>
      </div>

      <div className="cal-week">
        {days.map((d) => (
          <button key={d.iso} className={"cal-day " + (d.i === active ? "on" : "")} onClick={() => setActive(d.i)}>
            <span className="dow">{week[d.i]}</span>
            <span className="num">{d.num}</span>
            {(schedule.get(d.iso) || []).length > 0 ? <span className="dot" /> : null}
          </button>
        ))}
      </div>

      <div className="section-h">
        <div>
          <div className="eyebrow">
            {week[active]} · {activeDay.iso}
          </div>
          <div className="section-title">
            {items.length} block{items.length === 1 ? "" : "s"} <span className="acc">scheduled.</span>
          </div>
        </div>
      </div>

      <div className="bay-day">
        {items.length === 0 ? (
          <EmptyState title="Day open. Bay free." />
        ) : (
          items.map((it, k) => {
            const j = it.jobId ? index?.job(it.jobId) : null;
            const v = j ? index?.vehicle(j.vehicleId) : null;
            const c = j ? index?.vehicleContact(j.vehicleId) : null;
            const canOpenJob = Boolean(j?.id);
            return (
              <div
                key={k}
                className="bay-block"
                onClick={() => (canOpenJob ? router.push(`/admin/jobs/${encodeURIComponent(j.id)}`) : null)}
                style={{ cursor: canOpenJob ? "pointer" : "default" }}
              >
                <div className="row">
                  <span className="when">{it.when || ""}</span>
                  {j ? <span className="when" style={{ color: "var(--mc-blue)" }}>{j.ref}</span> : null}
                </div>
                <h4>{v?.label || it.kind}</h4>
                <div className="who">{it.kind} · {c?.name || ""}</div>
                {j ? (
                  <div className="row" style={{ marginTop: 6 }}>
                    <span className="when">{index?.serviceLabels(j.services).join(" + ")}</span>
                    <span className="when">{moneyZAR(j.value || 0)}</span>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      <div style={{ padding: "4px 18px 24px" }}>
        <button className="bigbtn bigbtn--g" onClick={() => setBlockOpen(true)}>
          <span>
            <Icon.plus /> &nbsp; Block bay time
          </span>
          <span className="arr">→</span>
        </button>
      </div>

      {blockOpen ? <BlockBayModal onClose={() => setBlockOpen(false)} onCreate={onRefresh} /> : null}
    </div>
  );
}
