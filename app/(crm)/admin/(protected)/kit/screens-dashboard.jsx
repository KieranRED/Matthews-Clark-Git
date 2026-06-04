"use client";

import Link from "next/link";

import { Icon } from "./icons";
import { StagePill } from "./components";
import { initials, moneyZAR, shortTime } from "./utils";

function todayLabel() {
  try {
    return new Date().toLocaleDateString("en-ZA", { weekday: "long", day: "2-digit", month: "short" });
  } catch {
    return "Today";
  }
}

function fmtWho(index, vehicleId) {
  const c = index?.vehicleContact(vehicleId);
  const v = index?.vehicle(vehicleId);
  const parts = [c?.name || "Client", v?.label || "Vehicle"].filter(Boolean);
  return parts.join(" · ");
}

export default function DashboardScreen({ index, onNewLead }) {
  const isIzimoto = String(index?.VIEWER?.role || "").startsWith("izimoto");
  const jobs = index?.JOBS || [];
  const inBay = jobs.filter((j) => j.stage === "in-bay" || j.stage === "reveal").slice(0, 10);
  const quoted = jobs.filter((j) => j.stage === "quoted");
  const aftercareDue = jobs.filter((j) => j.stage === "aftercare").slice(0, 6);

  const toQuote = jobs.filter((j) => j.stage === "new").slice(0, 10);
  const iziTotal = jobs.reduce((s, j) => s + (Number(j.izimotoCost || 0) || 0), 0);
  const mcProfitTotal = jobs.reduce((s, j) => s + (Number(j.commission || 0) || 0), 0);

  const pipelineRevenue = Number(index?.KPIS?.pipelineRevenue || 0);
  const pipelineProfit = Number(index?.KPIS?.pipelineProfit || 0);
  const collectedRevenue = Number(index?.KPIS?.collectedRevenue || 0);
  const collectedProfit = Number(index?.KPIS?.collectedProfit || 0);
  const stageCounts = Array.isArray(index?.KPIS?.stageCounts) ? index.KPIS.stageCounts : [];

  const sources = Array.isArray(index?.SOURCES) ? index.SOURCES : [];
  const maxSrc = Math.max(...sources.map((s) => Number(s?.n || 0)), 1);
  const maxN = Math.max(...stageCounts.map((s) => Number(s?.n || 0)), 1);
  const stageCountsForView = isIzimoto
    ? stageCounts.filter((s) => ["new", "quoted", "booked", "in-bay", "reveal", "delivered", "lost"].includes(String(s.id)))
    : stageCounts;

  return (
    <div className="screen">
      <div className="greeting">
        <div className="hi">
          <span className="dot" />
          {todayLabel()} · South Africa
        </div>
        <h1>
          {isIzimoto ? "Izimoto" : "CRM"}
          <br />
          <span className="acc">overview.</span>
        </h1>
        <div className="sub">
          {isIzimoto
            ? `${jobs.filter((j) => j.stage === "new").length} leads to quote · ${quoted.length} quoted · ${Number(index?.KPIS?.taskOpenCount || 0)} open tasks`
            : `${inBay.length} in the bay · ${quoted.length} open quote${quoted.length === 1 ? "" : "s"} · ${Number(index?.KPIS?.taskOpenCount || 0)} open task${
                Number(index?.KPIS?.taskOpenCount || 0) === 1 ? "" : "s"
              }`}
        </div>
      </div>

      <div className="kpi-grid" style={{ paddingTop: 14 }}>
        {isIzimoto ? (
          <>
            <div className="kpi kpi--accent">
              <div className="lbl">Quotes to do</div>
              <div className="val">{jobs.filter((j) => j.stage === "new").length}</div>
              <div className="delta">Needs pricing</div>
            </div>
            <div className="kpi">
              <div className="lbl">Quotes submitted</div>
              <div className="val">{quoted.length}</div>
              <div className="delta">Sent to M&amp;C</div>
            </div>
            <div className="kpi">
              <div className="lbl">Izimoto total</div>
              <div className="val">
                <span className="acc">R</span>
                {Math.round(iziTotal / 1000)}k
              </div>
              <div className="delta">All leads</div>
            </div>
            <div className="kpi">
              <div className="lbl">M&amp;C profit</div>
              <div className="val">
                <span className="acc">R</span>
                {Math.round(mcProfitTotal / 1000)}k
              </div>
              <div className="delta">Estimated</div>
            </div>
          </>
        ) : (
          <>
            <div className="kpi kpi--accent">
              <div className="lbl">Pipeline revenue</div>
              <div className="val">
                <span className="acc">R</span>
                {Math.round(pipelineRevenue / 1000)}k
              </div>
              <div className="delta up">Profit · R{Math.round(pipelineProfit / 1000)}k</div>
            </div>
            <div className="kpi">
              <div className="lbl">Open quotes</div>
              <div className="val">{quoted.length}</div>
              <div className="delta">Waiting for client</div>
            </div>
            <div className="kpi">
              <div className="lbl">New leads</div>
              <div className="val">{jobs.filter((j) => j.stage === "new").length}</div>
              <div className="delta">Needs first contact</div>
            </div>
            <div className="kpi kpi--green">
              <div className="lbl">Collected revenue</div>
              <div className="val">
                <span className="acc">R</span>
                {Math.round(collectedRevenue / 1000)}k
              </div>
              <div className="delta up">Profit · R{Math.round(collectedProfit / 1000)}k</div>
            </div>
          </>
        )}
      </div>

      <div className="quick">
        {isIzimoto ? (
          <>
            <Link href="/admin/leads/to-quote">
              <span className="ic">
                <Icon.invoice />
              </span>
              <span>To quote</span>
            </Link>
            <Link href="/admin/leads/quoted">
              <span className="ic">
                <Icon.check />
              </span>
              <span>Quoted</span>
            </Link>
            <Link href="/admin/clients">
              <span className="ic">
                <Icon.clients />
              </span>
              <span>Clients</span>
            </Link>
            <Link href="/admin/calendar">
              <span className="ic">
                <Icon.cal />
              </span>
              <span>Schedule</span>
            </Link>
          </>
        ) : (
          <>
            <button type="button" onClick={onNewLead}>
              <span className="ic">
                <Icon.plus />
              </span>
              <span>New leads</span>
            </button>
            <Link href="/admin/leads/in-bay">
              <span className="ic">
                <Icon.bay />
              </span>
              <span>Bay board</span>
            </Link>
            <Link href="/admin/leads/quoted">
              <span className="ic">
                <Icon.invoice />
              </span>
              <span>Quotes</span>
            </Link>
            <Link href="/admin/calendar">
              <span className="ic">
                <Icon.cal />
              </span>
              <span>Schedule</span>
            </Link>
          </>
        )}
      </div>

      {isIzimoto ? (
        <>
          <div className="section-h">
            <div>
              <div className="eyebrow">
                <span className="num">04</span> · QUOTES
              </div>
              <div className="section-title">
                Leads to <span className="acc">quote.</span>
              </div>
            </div>
            <Link className="more" href="/admin/leads/to-quote">
              All →
            </Link>
          </div>
          <div className="feed">
            {toQuote.length === 0 ? (
              <div className="compact-row" style={{ opacity: 0.8 }}>
                <div className="lbl">
                  <div className="name">Nothing to quote right now</div>
                  <div className="meta">You’re up to date.</div>
                </div>
              </div>
            ) : null}
            {toQuote.slice(0, 6).map((j) => (
              <Link key={j.id} className="compact-row" href={`/admin/jobs/${encodeURIComponent(j.id)}`}>
                <div className="lbl">
                  <div className="name">{fmtWho(index, j.vehicleId)}</div>
                  <div className="meta">
                    {j.ref} · {index?.serviceLabels(j.services).join(" + ")}
                  </div>
                </div>
                <div className="right">
                  <div className="acc">QUOTE</div>
                  <div>needed</div>
                </div>
              </Link>
            ))}
          </div>
        </>
      ) : null}

      <div className="section-h">
        <div>
          <div className="eyebrow">
            <span className="num">04</span> · IN THE BAY
          </div>
          <div className="section-title">
            Today&apos;s <span className="acc">work.</span>
          </div>
        </div>
        <Link className="more" href="/admin/leads/in-bay">
          All →
        </Link>
      </div>

      <div className="bay-rail">
        {inBay.map((j) => {
          const v = index?.vehicle(j.vehicleId);
          const c = index?.vehicleContact(j.vehicleId);
          const photoUrl = j.raw?.photos?.[0]?.url || v?.photoUrl || null;
          return (
            <Link key={j.id} className="bay-card" href={`/admin/jobs/${encodeURIComponent(j.id)}`}>
              <div className="img">
                {photoUrl && (
                  <img src={photoUrl} alt={v?.label || "Vehicle"} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 0 }} />
                )}
                <StagePill stageId={j.stage} index={index} />
                {!photoUrl && <span className="ph">[ {v?.colour ? `${v.colour}` : "no photo yet"} ]</span>}
              </div>
              <div className="body">
                <div className="ref">
                  {j.ref} · {index?.serviceLabels(j.services).join(" + ")}
                </div>
                <h3>{v?.label || "Vehicle"}</h3>
                <div className="who">{c?.name || "Client"}</div>
                <div className="row">
                  <span>
                    {j.start ? (
                      <>
                        Start <b>{j.start}</b>
                      </>
                    ) : (
                      <>
                        Start <b>unscheduled</b>
                      </>
                    )}
                  </span>
                  <span>
                    Rev {moneyZAR(j.revenue)} · <b style={{ color: "var(--mc-blue)" }}>+{moneyZAR(j.commission)}</b>
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="section-h">
        <div>
          <div className="eyebrow">
            <span className="num">05</span> · PIPELINE
          </div>
          <div className="section-title">
            Where the work <span className="acc">sits.</span>
          </div>
        </div>
      </div>
      <div className="pipeline-wrap">
        <div className="pipeline">
          {stageCountsForView
            .filter((s) => (isIzimoto ? true : s.id !== "aftercare"))
            .map((s) => (
              <Link key={s.id} className="pipe-row" href={`/admin/leads/${encodeURIComponent(s.id)}`}>
                <div className="top">
                  <div className="l">
                    <span className="stage-dot" style={{ background: s.color }} />
                    {s.label}
                  </div>
                  <div className="n">{s.n}</div>
                </div>
                <div className="bar">
                  <i style={{ width: `${(Number(s.n || 0) / maxN) * 100}%`, background: s.color }} />
                </div>
              </Link>
            ))}
        </div>
      </div>

      <div className="section-h">
        <div>
          <div className="eyebrow">
            <span className="num">06</span> · ACTIVITY
          </div>
          <div className="section-title">
            Latest <span className="acc">moves.</span>
          </div>
        </div>
        <Link className="more" href="/admin/leads">
          All →
        </Link>
      </div>
      <div className="feed">
        {(index?.ACTIVITY || []).slice(0, 6).map((a) => {
          const ic = a.type === "stage" ? <Icon.arrow /> : a.type === "lead" ? <Icon.plus /> : <Icon.edit />;
          const cls = a.type === "stage" ? "" : a.type === "lead" ? "amber" : "grey";
          return (
            <div key={a.id} className="feed-row">
              <div className={"feed-ic " + cls}>{ic}</div>
              <div className="feed-meta">
                <div className="feed-who">
                  {a.who || "Team"} · {String(a.type || "note").toUpperCase()}
                </div>
                <div className="feed-text">{a.text}</div>
              </div>
              <div className="feed-time">{shortTime(a.at) || ""}</div>
            </div>
          );
        })}
      </div>

      {!isIzimoto && aftercareDue.length ? (
        <>
          <div className="section-h">
            <div>
              <div className="eyebrow">
                <span className="num">07</span> · AFTERCARE
              </div>
              <div className="section-title">
                Coming <span className="acc">due.</span>
              </div>
            </div>
          </div>
          <div className="feed">
            {aftercareDue.map((j) => (
              <Link key={j.id} className="compact-row" href={`/admin/jobs/${encodeURIComponent(j.id)}`}>
                <div className="lbl">
                  <div className="name">{fmtWho(index, j.vehicleId)}</div>
                  <div className="meta">
                    {j.ref} · {index?.serviceLabels(j.services).join(" + ")}
                  </div>
                </div>
                <div className="right">
                  <div className="acc">DUE</div>
                  <div>soon</div>
                </div>
              </Link>
            ))}
          </div>
        </>
      ) : null}

      {!isIzimoto ? (
        <>
          <div className="section-h">
            <div>
              <div className="eyebrow">
                <span className="num">08</span> · LEAD SOURCES · 30D
              </div>
              <div className="section-title">
                Where they <span className="acc">find us.</span>
              </div>
            </div>
          </div>
          <div className="source-bars" style={{ paddingBottom: 24 }}>
            {sources.map((s) => (
              <div key={s.id} className="source-row">
                <span>{s.label}</span>
                <span className="source-bar">
                  <i style={{ width: `${(Number(s.n || 0) / maxSrc) * 100}%` }} />
                </span>
                <span className="v">{s.n}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={{ paddingBottom: 24 }} />
      )}
    </div>
  );
}
