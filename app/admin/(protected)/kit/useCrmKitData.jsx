"use client";

import { useEffect, useMemo, useRef, useState } from "react";

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

function buildIndex(data) {
  const stages = safeArray(data?.stages);
  const sources = safeArray(data?.sources);
  const services = safeArray(data?.services);
  const contacts = safeArray(data?.contacts);
  const vehicles = safeArray(data?.vehicles);
  const jobs = safeArray(data?.jobs);
  const activity = safeArray(data?.activity);
  const tasks = safeArray(data?.tasks);
  const team = safeArray(data?.team);
  const viewer = data?.viewer || null;
  const kpis = data?.kpis || {};

  const stageById = new Map(stages.map((s) => [String(s.id), s]));
  const sourceById = new Map(sources.map((s) => [String(s.id), s]));
  const serviceById = new Map(services.map((s) => [String(s.id), s]));
  const contactById = new Map(contacts.map((c) => [String(c.id), c]));
  const vehicleById = new Map(vehicles.map((v) => [String(v.id), v]));
  const jobById = new Map(jobs.map((j) => [String(j.id), j]));
  const taskById = new Map(tasks.map((t) => [String(t.id), t]));
  const teamById = new Map(team.map((m) => [String(m.id), m]));

  return {
    STAGES: stages,
    SOURCES: sources,
    SERVICES: services,
    CONTACTS: contacts,
    VEHICLES: vehicles,
    JOBS: jobs,
    TASKS: tasks,
    TEAM: team,
    VIEWER: viewer,
    ACTIVITY: activity,
    KPIS: kpis,
    stage: (id) => stageById.get(String(id)) || null,
    source: (id) => sourceById.get(String(id)) || null,
    serviceLabels: (ids) =>
      safeArray(ids)
        .map((i) => serviceById.get(String(i))?.label)
        .filter(Boolean),
    contact: (id) => contactById.get(String(id)) || null,
    vehicle: (id) => vehicleById.get(String(id)) || null,
    job: (id) => jobById.get(String(id)) || null,
    task: (id) => taskById.get(String(id)) || null,
    teamMember: (id) => teamById.get(String(id)) || null,
    vehicleContact: (vehicleId) => {
      const v = vehicleById.get(String(vehicleId));
      if (!v?.contactId) return null;
      return contactById.get(String(v.contactId)) || null;
    }
  };
}

export function useCrmKitData({ pollMs = 15_000, limit = 200 } = {}) {
  const [state, setState] = useState({ loading: true, error: "", data: null });
  const inflight = useRef(false);

  const refresh = async () => {
    if (inflight.current) return;
    inflight.current = true;
    try {
      const res = await fetch(`/api/admin/crm-kit?limit=${encodeURIComponent(limit)}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to load CRM data.");
      setState({ loading: false, error: "", data: json?.data || null });
    } catch (err) {
      setState((prev) => ({ loading: false, error: err instanceof Error ? err.message : "Failed to load CRM data.", data: prev.data }));
    } finally {
      inflight.current = false;
    }
  };

  useEffect(() => {
    refresh();
    const id = pollMs ? setInterval(() => refresh(), pollMs) : null;
    return () => {
      if (id) clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollMs, limit]);

  const index = useMemo(() => buildIndex(state.data), [state.data]);

  return { ...state, index, refresh };
}
