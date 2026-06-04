"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "./icons";
import { initials, moneyZAR } from "./utils";

function moneyK(n) {
  if (!n || !Number.isFinite(n)) return "R 0";
  if (Math.abs(n) >= 1000) return `R ${(n / 1000).toFixed(0)}k`;
  return `R ${Math.round(n)}`;
}

export { moneyK };

export function DesktopSidebar({ route, index, onNewLead }) {
  const role = String(index?.VIEWER?.role || "");
  const isIzimoto = role.startsWith("izimoto");
  const viewer = index?.VIEWER;

  const activeMap = {
    dashboard: "dashboard", leads: "leads", job: "leads", quote: "leads",
    clients: "clients", client: "clients", calendar: "calendar",
    settings: "settings", pricing: "pricing", content: "content", "content-new": "content",
  };
  const active = activeMap[route.name] || "dashboard";

  const newLeads = (index?.JOBS || []).filter((j) => j.stage === "new").length;

  const mcNav = [
    { group: "Workspace" },
    { id: "dashboard", href: "/admin",          icon: <Icon.home />,    label: "Today" },
    { id: "leads",     href: "/admin/leads",     icon: <Icon.leads />,   label: "Pipeline", ct: newLeads || null },
    { id: "calendar",  href: "/admin/calendar",  icon: <Icon.cal />,     label: "Calendar" },
    { group: "People" },
    { id: "clients",   href: "/admin/clients",   icon: <Icon.clients />, label: "Clients" },
    { group: "Studio" },
    { id: "pricing",   href: "/admin/pricing",   icon: <Icon.spark />,   label: "Pricing" },
    { id: "content",   href: "/admin/content",   icon: <Icon.cam />,     label: "Content" },
    { id: "settings",  href: "/admin/settings",  icon: <Icon.set />,     label: "Settings" },
  ];

  const iziOwnerNav = [
    { group: "Workshop" },
    { id: "dashboard", href: "/admin",                        icon: <Icon.home />,    label: "Overview" },
    { id: "leads",     href: "/admin/leads/to-quote",         icon: <Icon.invoice />, label: "To Quote", ct: newLeads || null },
    { id: "calendar",  href: "/admin/calendar",               icon: <Icon.cal />,     label: "Availability" },
    { group: "Jobs" },
    { id: "leads-all", href: "/admin/leads",                  icon: <Icon.leads />,   label: "All Jobs" },
    { group: "Studio" },
    { id: "settings",  href: "/admin/settings",               icon: <Icon.set />,     label: "Settings" },
  ];

  const navItems = isIzimoto ? iziOwnerNav : mcNav;

  return (
    <aside className="ds-side">
      <div className="ds-brand">
        <span className="mk">
          {isIzimoto ? "IZI" : <>M<span className="sl">/</span>C</>}
        </span>
        <span className="tag">CRM</span>
      </div>

      <nav className="ds-nav">
        {navItems.map((item, i) =>
          item.group ? (
            <div key={`g${i}`} className="grp">{item.group}</div>
          ) : (
            <Link
              key={item.id}
              href={item.href}
              className={active === item.id ? "on" : ""}
            >
              <span className="ic">{item.icon}</span>
              <span>{item.label}</span>
              {item.ct ? <span className="ct">{item.ct}</span> : null}
            </Link>
          )
        )}
      </nav>

      <div className="spacer" />

      {!isIzimoto && (
        <div className="ds-studio">
          <div className="row">
            <span className="dot" />
            <span className="lbl">Workshop linked</span>
          </div>
          <div className="name">Izimoto · Montague Gardens</div>
          <div className="meta">{(index?.JOBS || []).filter((j) => j.stage === "in-bay").length} in bay today</div>
        </div>
      )}

      <div className="ds-user">
        <span className="av">{initials(viewer?.name || viewer?.username || "U")}</span>
        <div className="who">
          <span className="n">{viewer?.name || viewer?.username || "You"}</span>
          <span className="r">{viewer?.role?.replace("_", " ") || "Team"}</span>
        </div>
        <Link href="/admin/settings" className="cog"><Icon.set /></Link>
      </div>
    </aside>
  );
}

export function DesktopTopBar({ route, index, onNewLead, onSearch, onBell }) {
  const router = useRouter();
  const role = String(index?.VIEWER?.role || "");
  const isIzimoto = role.startsWith("izimoto");

  const LABELS = {
    dashboard:    { eyebrow: "OVERVIEW",      title: "Today" },
    leads:        { eyebrow: "JOBS · LEADS",  title: "Pipeline" },
    job:          { eyebrow: "JOB DETAIL",    title: null },
    quote:        { eyebrow: "QUOTE BUILDER", title: null },
    clients:      { eyebrow: "DIRECTORY",     title: "Clients" },
    client:       { eyebrow: "CLIENT",        title: null },
    calendar:     { eyebrow: "BAY SCHEDULE",  title: "Calendar" },
    settings:     { eyebrow: "STUDIO",        title: "Settings" },
    pricing:      { eyebrow: "ANALYTICS",     title: "Pricing" },
    content:      { eyebrow: "SOCIAL",        title: "Content" },
    "content-new":{ eyebrow: "SOCIAL",        title: "New Post" },
    "new-lead":   { eyebrow: "ADD MANUALLY",  title: "New Lead" },
  };

  let { eyebrow, title } = LABELS[route.name] || { eyebrow: "CRM", title: "Dashboard" };
  if (route.name === "job") {
    const j = index?.job?.(route.params?.id);
    title = j?.ref || "Job";
  }
  if (route.name === "quote") {
    const j = index?.job?.(route.params?.id);
    title = j?.ref || "Quote";
  }
  if (route.name === "client") {
    const c = index?.contact?.(route.params?.id);
    title = c?.name || "Client";
  }

  return (
    <header className="ds-top">
      <div className="titles">
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
      </div>

      <div className="search" onClick={onSearch} style={{ cursor: "pointer" }}>
        <Icon.search />
        <input readOnly placeholder="Search jobs, clients, plates…" onClick={onSearch} style={{ cursor: "pointer" }} />
        <span className="kbd">⌘K</span>
      </div>

      <button className="iconbtn" onClick={onBell} aria-label="Activity">
        <Icon.bell />
        <span className="badge" />
      </button>

      {!isIzimoto && (
        <button className="btn-new" onClick={onNewLead}>
          <Icon.plus /> New lead
        </button>
      )}
    </header>
  );
}
