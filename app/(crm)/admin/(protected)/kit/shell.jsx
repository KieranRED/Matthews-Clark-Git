"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { Icon } from "./icons";

function parsePath(pathname) {
  const path = String(pathname || "/admin").replace(/\/+$/, "");
  const parts = path.split("/").filter(Boolean);
  const slug = parts[0] === "admin" ? parts.slice(1) : parts;

  if (slug.length === 0) return { name: "dashboard", params: {} };
  if (slug[0] === "leads") return { name: "leads", params: { stage: slug[1] } };
  if (slug[0] === "jobs" && slug[1]) return { name: "job", params: { id: slug[1] } };
  if (slug[0] === "quote" && slug[1]) return { name: "quote", params: { id: slug[1] } };
  if (slug[0] === "jobs") return { name: "leads", params: {} };
  if (slug[0] === "clients" && slug[1]) return { name: "client", params: { id: slug[1] } };
  if (slug[0] === "clients") return { name: "clients", params: {} };
  if (slug[0] === "calendar") return { name: "calendar", params: {} };
  if (slug[0] === "settings") return { name: "settings", params: {} };
  if (slug[0] === "content" && slug[1] === "new") return { name: "content-new", params: {} };
  if (slug[0] === "content") return { name: "content", params: {} };
  if (slug[0] === "pricing") return { name: "pricing", params: {} };
  return { name: "dashboard", params: {} };
}

export function useCrmRoute() {
  const pathname = usePathname();
  return useMemo(() => parsePath(pathname), [pathname]);
}

export function TopBar({ route, index, onSearch, onBell, onSettings }) {
  const router = useRouter();
  const isIzimoto = String(index?.VIEWER?.role || "").startsWith("izimoto");

  const isRoot = ["dashboard", "leads", "clients", "calendar", "settings", "pricing", "content"].includes(route.name);
  let title = "";
  let crumbs = "";

  if (route.name === "dashboard") {
    title = "";
    crumbs = "";
  }
  if (route.name === "leads") {
    title = "Pipeline";
    crumbs = "JOBS · LEADS";
  }
  if (route.name === "clients") {
    title = "Clients";
    crumbs = "DIRECTORY";
  }
  if (route.name === "calendar") {
    title = "Calendar";
    crumbs = "BAY SCHEDULE";
  }
  if (route.name === "settings") {
    title = "Settings";
    crumbs = "STUDIO";
  }
  if (route.name === "job") {
    const j = index?.job(route.params.id);
    title = j?.ref || "Job";
    crumbs = "JOB DETAIL";
  }
  if (route.name === "quote") {
    const j = index?.job(route.params.id);
    title = j?.ref || "Quote";
    crumbs = "QUOTE BUILDER";
  }
  if (route.name === "client") {
    const c = index?.contact(route.params.id);
    title = c?.name || "Client";
    crumbs = "CLIENT";
  }
  if (route.name === "pricing") {
    title = "Pricing Guide";
    crumbs = "ANALYTICS";
  }
  if (route.name === "content") {
    title = "Content";
    crumbs = "SOCIAL · QUEUE";
  }
  if (route.name === "content-new") {
    title = "New Post";
    crumbs = "SOCIAL · NEW POST";
  }

  return (
    <div className="crm-top">
      <div className="left">
        {isRoot && route.name === "dashboard" ? (
          <span className="mark">{isIzimoto ? "IZI" : <>M<span className="a">&amp;</span>C</>}</span>
        ) : isRoot ? (
          <>
            <Link href="/admin" className="mark" style={{ cursor: "pointer" }}>
              {isIzimoto ? "IZI" : <>M<span className="a">&amp;</span>C</>}
            </Link>
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.05, minWidth: 0 }}>
              <span className="crumbs">{crumbs}</span>
              <span className="title">{title}</span>
            </div>
          </>
        ) : (
          <>
            <button className="back-btn" onClick={() => router.back()}>
              <Icon.back /> Back
            </button>
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.05, minWidth: 0 }}>
              <span className="crumbs">{crumbs}</span>
              <span className="title">{title}</span>
            </div>
          </>
        )}
      </div>
      <div className="right">
        <button className="icon-btn" title="Search" aria-label="Search" onClick={onSearch}>
          <Icon.search />
        </button>
        <button className="icon-btn" title="Activity" aria-label="Activity" onClick={onBell}>
          <Icon.bell />
          <span className="badge" />
        </button>
        <button className="icon-btn" title="Settings" aria-label="Open settings" onClick={onSettings}>
          <Icon.set />
        </button>
      </div>
    </div>
  );
}

export function BottomNav({ route, index }) {
  const isIzimoto = String(index?.VIEWER?.role || "").startsWith("izimoto");
  const items = isIzimoto
    ? [
        { id: "dashboard", label: "Overview", href: "/admin", ic: <Icon.home /> },
        { id: "leads", label: "Quotes", href: "/admin/leads/to-quote", ic: <Icon.invoice /> },
        { id: "clients", label: "Clients", href: "/admin/clients", ic: <Icon.clients /> },
        { id: "calendar", label: "Calendar", href: "/admin/calendar", ic: <Icon.cal /> },
        { id: "settings", label: "Settings", href: "/admin/settings", ic: <Icon.set /> }
      ]
    : [
        { id: "dashboard", label: "Today", href: "/admin", ic: <Icon.home /> },
        { id: "leads", label: "Pipeline", href: "/admin/leads", ic: <Icon.leads /> },
        { id: "clients", label: "Clients", href: "/admin/clients", ic: <Icon.clients /> },
        { id: "pricing", label: "Pricing", href: "/admin/pricing", ic: <Icon.spark /> },
        { id: "content", label: "Content", href: "/admin/content", ic: <Icon.cam /> }
      ];
  const activeMap = {
    dashboard: "dashboard",
    leads: "leads",
    job: "leads",
    quote: "leads",
    clients: "clients",
    client: "clients",
    calendar: "calendar",
    pricing: "pricing",
    settings: "settings",
    content: "content",
    "content-new": "content"
  };
  const active = activeMap[route.name] || "dashboard";

  return (
    <nav className="crm-nav">
      {items.map((it) => (
        <Link key={it.id} className={active === it.id ? "on" : ""} href={it.href}>
          {it.ic}
          <span className="lbl">{it.label}</span>
        </Link>
      ))}
    </nav>
  );
}
