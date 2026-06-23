"use client";

import { useMemo, useState } from "react";

import { Icon } from "./icons";
import PushSubscribeRow from "./push-subscribe";

function statLine(member) {
  const s = member?.stats || {};
  if (String(member?.role || "").startsWith("izimoto")) {
    return `Quotes: ${Number(s.vendorQuotes || 0)} · Called: ${Number(s.called || 0)}`;
  }
  return `Called: ${Number(s.called || 0)} · Booked: ${Number(s.booked || 0)} · Delivered: ${Number(s.delivered || 0)}`;
}

export default function SettingsScreen({ index, onEditTeam }) {
  const team = useMemo(() => (index?.TEAM || []).slice().sort((a, b) => String(a?.role || "").localeCompare(String(b?.role || ""))), [index]);
  const [tgBusy, setTgBusy] = useState(false);
  // teamMemberId for push subscriptions: prefer wa_id (viewer.waId), fall back to username.
  const teamMemberId = index?.VIEWER?.waId || index?.VIEWER?.username || null;

  async function handleLogout() {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } finally {
      window.location.href = "/admin/login";
    }
  }

  async function handleReconnectTelegram() {
    if (tgBusy) return;
    setTgBusy(true);
    try {
      const res = await fetch("/api/admin/telegram/setup", { method: "POST" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        const msg = json?.error || json?.message || "Failed to reconnect Telegram.";
        alert(msg);
        return;
      }
      const statusRes = await fetch("/api/admin/telegram/status", { cache: "no-store" });
      const status = await statusRes.json().catch(() => null);
      const iziUrl = status?.bots?.izi?.webhook?.url || status?.bots?.izi?.webhook?.result?.url || null;
      const mcUrl = status?.bots?.mc?.webhook?.url || status?.bots?.mc?.webhook?.result?.url || null;
      alert(
        [
          "Telegram connected.",
          mcUrl ? `M&C webhook: ${mcUrl}` : "M&C webhook: (unknown)",
          iziUrl ? `Izimoto webhook: ${iziUrl}` : "Izimoto webhook: (unknown)",
          "",
          "If /chatid still doesn't reply in a group, disable bot privacy in BotFather (/setprivacy) and use /chatid@BotUser."
        ].join("\\n")
      );
    } catch (e) {
      alert(e?.message || "Failed to reconnect Telegram.");
    } finally {
      setTgBusy(false);
    }
  }

  const sections = [
    {
      title: "TEAM",
      rows: [
        ...team.map((m) => ({
          kind: "member",
          key: m.id,
          accent: m.accent || "#1F4FFF",
          ic: <Icon.user />,
          name: m.name || m.username,
          meta: `${m.roleLabel || m.role || "Team"} · ${statLine(m)}`,
          onClick: () => onEditTeam?.({ mode: "edit", member: m })
        })),
        {
          kind: "add",
          key: "add",
          accent: "#1F4FFF",
          ic: <Icon.plus />,
          name: "Add teammate",
          meta: "OWNER / TEAM / IZIMOTO",
          onClick: () => onEditTeam?.({ mode: "create", member: null })
        }
      ]
    },
    {
      title: "WORKSHOP",
      rows: [
        { ic: <Icon.bay />, name: "Izimoto", meta: "PRIMARY BAY · LINKED FLOW" },
        { ic: <Icon.shieldCheck />, name: "Aftercare schedule", meta: "PLANNED · 3 / 6 / 12 MONTH" },
        { ic: <Icon.tag />, name: "Service catalog & pricing", meta: "CONFIGURABLE" }
      ]
    },
    {
      title: "INTEGRATIONS",
      rows: [
        {
          ic: <Icon.send />,
          name: tgBusy ? "Telegram (reconnecting…)" : "Telegram",
          meta: tgBusy ? "PLEASE WAIT" : "NEW LEADS + QUOTES · Tap to reconnect",
          onClick: handleReconnectTelegram
        },
        { ic: <Icon.invoice />, name: "Invoices", meta: "GENERATED IN-APP" }
      ]
    },
    {
      title: "ACCOUNT",
      rows: [
        { ic: <Icon.doc />, name: "Export data", meta: "CSV" },
        { ic: <Icon.shield />, name: "Privacy & data", meta: "POPIA · ZA" },
        { ic: <Icon.back />, name: "Log out", meta: "Sign out of CRM", accent: "#FF4D4D", onClick: handleLogout }
      ]
    }
  ];

  return (
    <div className="screen">
      <div className="greeting">
        <div className="hi">
          <span className="dot" />
          CRM · v1
        </div>
        <h1>Settings.</h1>
      </div>

      {sections.map((s, i) => (
        <div key={i}>
          <div className="section-h" style={{ paddingBottom: 4 }}>
            <div className="eyebrow">{s.title}</div>
          </div>
          <div className="set-list">
            {s.rows.map((r, k) => {
              const Tag = r.onClick ? "button" : "div";
              return (
                <Tag
                  key={r.key || k}
                  type={r.onClick ? "button" : undefined}
                  className="set-row"
                  onClick={r.onClick}
                  style={{
                    textAlign: "left",
                    width: "100%",
                    borderLeft: r.accent ? `3px solid ${r.accent}` : undefined,
                    cursor: r.onClick ? "pointer" : "default",
                    opacity: r.onClick ? 1 : 0.9
                  }}
                >
                  <div
                    className="ic"
                    style={r.accent ? { color: r.accent, background: `${r.accent}14`, borderColor: `${r.accent}2a` } : undefined}
                  >
                    {r.ic}
                  </div>
                  <div className="lbl">
                    <div className="name">{r.name}</div>
                    <div className="meta">{r.meta}</div>
                  </div>
                  <Icon.chev />
                </Tag>
              );
            })}
            {s.title === "INTEGRATIONS" ? (
              <PushSubscribeRow teamMemberId={teamMemberId} />
            ) : null}
          </div>
        </div>
      ))}

      <div
        style={{
          padding: "18px 18px 24px",
          textAlign: "center",
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: ".18em",
          color: "var(--fg-mute)",
          textTransform: "uppercase"
        }}
      >
        Matthews &amp; Clark · CRM · v1
      </div>
    </div>
  );
}
