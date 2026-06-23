"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Icon } from "./icons";
import { ErrorShell, LoadingShell } from "./components";
import { useCrmKitData } from "./useCrmKitData";
import { BottomNav, TopBar, useCrmRoute } from "./shell";
import { ActivityOverlay, SearchOverlay } from "./overlays";
import { NewLeadModal } from "./new-lead-modal";

import DashboardScreen from "./screens-dashboard";
import LeadsScreen from "./screens-leads";
import JobDetailScreen from "./screens-job";
import QuoteScreen from "./screens-quote";
import { ClientDetailScreen, ClientsScreen } from "./screens-clients";
import CalendarScreen from "./screens-calendar";
import SettingsScreen from "./screens-settings";
import { TeamModal } from "./team-modal";

export default function AdminCrmKitApp() {
  const router = useRouter();
  const route = useCrmRoute();
  const { loading, error, index, refresh } = useCrmKitData({ pollMs: 15_000, limit: 220 });
  const [overlay, setOverlay] = useState(null); // search | activity
  const [newLeadOpen, setNewLeadOpen] = useState(false);
  const [newLeadInitial, setNewLeadInitial] = useState(null);
  const [teamModal, setTeamModal] = useState(null); // { mode, member }
  const isIzimoto = String(index?.VIEWER?.role || "").startsWith("izimoto");

  const closeOverlay = () => setOverlay(null);

  // Register the service worker for Web Push notifications.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(console.error);
  }, []);

  // Relay SW navigate postMessages so notificationclick focus+navigate works.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onMsg = (e) => {
      if (e.data?.type === "navigate" && e.data.url) window.location.assign(e.data.url);
    };
    navigator.serviceWorker.addEventListener("message", onMsg);
    return () => navigator.serviceWorker.removeEventListener("message", onMsg);
  }, []);

  // If the logged-in user is an Izimoto role, swap the accent to purple.
  useEffect(() => {
    const accent = index?.VIEWER?.accent || null;
    if (!accent) return;
    const root = document.querySelector(".crm-root");
    if (!root) return;
    root.style.setProperty("--mc-blue", accent);
  }, [index?.VIEWER?.accent]);

  // Per-user accent: Izimoto users get purple.
  useEffect(() => {
    const accent = index?.VIEWER?.accent;
    if (!accent) return;
    const root = document.querySelector(".crm-root");
    if (!root) return;
    root.style.setProperty("--mc-blue", accent);
  }, [index?.VIEWER?.accent]);

  let body = null;
  if (route.name === "dashboard") body = <DashboardScreen index={index} onNewLead={() => setNewLeadOpen(true)} />;
  if (route.name === "leads") body = <LeadsScreen index={index} params={route.params} onNewLead={() => setNewLeadOpen(true)} />;
  if (route.name === "job") body = <JobDetailScreen index={index} params={route.params} onRefresh={refresh} />;
  if (route.name === "quote") body = <QuoteScreen index={index} params={route.params} onRefresh={refresh} />;
  if (route.name === "clients")
    body = <ClientsScreen index={index} onNewLeadForClient={(c) => (setNewLeadInitial(c), setNewLeadOpen(true))} />;
  if (route.name === "client")
    body = (
      <ClientDetailScreen
        index={index}
        params={route.params}
        onRefresh={refresh}
        onNewLeadForClient={(c) => (setNewLeadInitial(c), setNewLeadOpen(true))}
      />
    );
  if (route.name === "calendar") body = <CalendarScreen index={index} onRefresh={refresh} />;
  if (route.name === "settings") body = <SettingsScreen index={index} onRefresh={refresh} onEditTeam={(m) => setTeamModal(m)} />;

  const showFab = !isIzimoto && ["dashboard", "leads", "clients"].includes(route.name);

  return (
    <>
      <TopBar
        route={route}
        index={index}
        onSearch={() => setOverlay("search")}
        onBell={() => setOverlay("activity")}
      />
      {loading ? <LoadingShell /> : error ? <ErrorShell error={error} onRetry={refresh} /> : body}
      {showFab ? (
        <button
          className="fab"
          onClick={() => {
            setNewLeadInitial(null);
            setNewLeadOpen(true);
          }}
          title="New lead"
          aria-label="New lead"
        >
          <Icon.plus />
        </button>
      ) : null}
      <BottomNav route={route} index={index} />

      {overlay === "search" ? <SearchOverlay index={index} onClose={closeOverlay} /> : null}
      {overlay === "activity" ? <ActivityOverlay index={index} onClose={closeOverlay} /> : null}

      {newLeadOpen ? (
        <NewLeadModal
          index={index}
          initial={newLeadInitial}
          onClose={() => {
            setNewLeadOpen(false);
            setNewLeadInitial(null);
          }}
          onCreated={(leadId) => {
            refresh();
            if (leadId) router.push(`/admin/jobs/${encodeURIComponent(leadId)}`);
          }}
        />
      ) : null}

      {teamModal ? (
        <TeamModal
          mode={teamModal.mode}
          member={teamModal.member}
          onClose={() => setTeamModal(null)}
          onSaved={() => refresh()}
        />
      ) : null}
    </>
  );
}
