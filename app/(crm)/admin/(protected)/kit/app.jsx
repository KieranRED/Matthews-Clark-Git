"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Icon } from "./icons";
import { ErrorShell, LoadingShell } from "./components";
import { useCrmKitData } from "./useCrmKitData";
import { BottomNav, TopBar, useCrmRoute } from "./shell";
import { ActivityOverlay, SearchOverlay } from "./overlays";

import DashboardScreen from "./screens-dashboard";
import LeadsScreen from "./screens-leads";
import JobDetailScreen from "./screens-job";
import QuoteScreen from "./screens-quote";
import { ClientDetailScreen, ClientsScreen } from "./screens-clients";
import CalendarScreen from "./screens-calendar";
import SettingsScreen from "./screens-settings";
import PricingScreen from "./screens-pricing";
import ContentScreen from "./screens-content";
import ContentNewScreen from "./screens-content-new";
import NewLeadScreen from "./screens-new-lead";
import { TeamModal } from "./team-modal";
import IziDashboardScreen from "./screens-izi-dashboard";
import IziStaffScreen from "./screens-izi-staff";

export default function AdminCrmKitApp() {
  const router = useRouter();
  const route = useCrmRoute();
  const { loading, error, index, refresh } = useCrmKitData({ pollMs: 15_000, limit: 220 });
  const [overlay, setOverlay] = useState(null); // search | activity
  const [teamModal, setTeamModal] = useState(null); // { mode, member }

  function openNewLead(initial) {
    const params = new URLSearchParams();
    if (initial?.name) params.set("name", initial.name);
    if (initial?.number) params.set("number", initial.number);
    if (initial?.email) params.set("email", initial.email);
    const qs = params.toString();
    router.push(`/admin/new-lead${qs ? `?${qs}` : ""}`);
  }
  const role = String(index?.VIEWER?.role || "");
  const isIzimoto = role.startsWith("izimoto");
  const isIziOwner = role === "izimoto_owner" || role === "izimoto_admin";
  const isIziStaff = role === "izimoto_staff";

  const closeOverlay = () => setOverlay(null);

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
  if (route.name === "dashboard") {
    if (isIziStaff) body = <IziStaffScreen index={index} onRefresh={refresh} />;
    else if (isIziOwner) body = <IziDashboardScreen index={index} />;
    else body = <DashboardScreen index={index} onNewLead={() => openNewLead(null)} />;
  }
  if (route.name === "leads") body = <LeadsScreen index={index} params={route.params} onNewLead={() => openNewLead(null)} />;
  if (route.name === "job") body = <JobDetailScreen index={index} params={route.params} onRefresh={refresh} />;
  if (route.name === "quote") body = <QuoteScreen index={index} params={route.params} onRefresh={refresh} />;
  if (route.name === "clients")
    body = <ClientsScreen index={index} onNewLeadForClient={(c) => openNewLead(c)} />;
  if (route.name === "client")
    body = (
      <ClientDetailScreen
        index={index}
        params={route.params}
        onRefresh={refresh}
        onNewLeadForClient={(c) => openNewLead(c)}
      />
    );
  if (route.name === "new-lead") body = <NewLeadScreen index={index} onRefresh={refresh} />;
  if (route.name === "calendar") body = <CalendarScreen index={index} onRefresh={refresh} />;
  if (route.name === "settings") body = <SettingsScreen index={index} onRefresh={refresh} onEditTeam={(m) => setTeamModal(m)} />;
  if (route.name === "pricing") body = <PricingScreen index={index} />;
  if (route.name === "content") body = <ContentScreen />;
  if (route.name === "content-new") body = <ContentNewScreen onSaved={() => router.push("/admin/content")} />;

  const showFab = !isIzimoto && ["dashboard", "leads", "clients"].includes(route.name) && route.name !== "new-lead";

  return (
    <>
      <TopBar
        route={route}
        index={index}
        onSearch={() => setOverlay("search")}
        onBell={() => setOverlay("activity")}
        onSettings={() => router.push("/admin/settings")}
      />
      {loading ? <LoadingShell /> : error ? <ErrorShell error={error} onRetry={refresh} /> : body}
      {showFab ? (
        <button
          className="fab"
          onClick={() => openNewLead(null)}
          title="New lead"
          aria-label="New lead"
        >
          <Icon.plus />
        </button>
      ) : null}
      <BottomNav route={route} index={index} />

      {overlay === "search" ? <SearchOverlay index={index} onClose={closeOverlay} /> : null}
      {overlay === "activity" ? <ActivityOverlay index={index} onClose={closeOverlay} /> : null}

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
