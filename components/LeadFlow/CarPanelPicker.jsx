"use client";

import { useMemo, useState } from "react";

const PANELS = [
  { id: "front_bumper", label: "Front bumper" },
  { id: "hood", label: "Bonnet / hood" },
  { id: "left_fender", label: "Left fender" },
  { id: "right_fender", label: "Right fender" },
  { id: "left_mirror", label: "Left mirror" },
  { id: "right_mirror", label: "Right mirror" },
  { id: "windshield", label: "Windscreen strip" },
  { id: "roof", label: "Roof" },
  { id: "left_door", label: "Left door" },
  { id: "right_door", label: "Right door" },
  { id: "left_quarter", label: "Left rear quarter" },
  { id: "right_quarter", label: "Right rear quarter" },
  { id: "trunk", label: "Boot / trunk" },
  { id: "rear_bumper", label: "Rear bumper" }
];

const GROUPS = [
  {
    id: "front",
    title: "Front",
    sub: "High impact protection",
    panels: ["front_bumper", "hood", "left_fender", "right_fender", "left_mirror", "right_mirror", "windshield"]
  },
  {
    id: "mid",
    title: "Sides & Roof",
    sub: "Panels + roof",
    panels: ["roof", "left_door", "right_door"]
  },
  {
    id: "rear",
    title: "Rear",
    sub: "Quarters + rear",
    panels: ["left_quarter", "right_quarter", "trunk", "rear_bumper"]
  }
];

function uniq(arr) {
  const out = [];
  const seen = new Set();
  for (const v of Array.isArray(arr) ? arr : []) {
    const k = String(v || "");
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}

export default function CarPanelPicker({ value, onChange, hint }) {
  const selected = useMemo(() => new Set(Array.isArray(value) ? value : []), [value]);
  const [open, setOpen] = useState(() => new Set(["front"]));

  const toggle = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange?.(uniq(Array.from(next)));
  };

  const setAll = (mode) => {
    if (mode === "clear") return onChange?.([]);
    if (mode === "full-front") return onChange?.(["front_bumper", "hood", "left_fender", "right_fender", "left_mirror", "right_mirror"]);
    if (mode === "full") return onChange?.(PANELS.map((p) => p.id));
    return null;
  };

  const toggleGroup = (groupId) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const setGroupAll = (group, mode) => {
    const groupPanels = Array.isArray(group?.panels) ? group.panels : [];
    if (!groupPanels.length) return;
    const next = new Set(selected);
    if (mode === "add") {
      for (const p of groupPanels) next.add(p);
    } else if (mode === "clear") {
      for (const p of groupPanels) next.delete(p);
    }
    onChange?.(uniq(Array.from(next)));
  };

  const selectedCount = selected.size;

  return (
    <div className="lf-panels">
      <div className="lf-panels-top">
        <div className="lf-panels-actions">
          <button type="button" className="lf-pill" onClick={() => setAll("full-front")}>
            Full front
          </button>
          <button type="button" className="lf-pill" onClick={() => setAll("full")}>
            Full car
          </button>
          <button type="button" className="lf-pill lf-pill--ghost" onClick={() => setAll("clear")}>
            Clear
          </button>
        </div>
        <div className="lf-panels-hint">
          {hint || "Choose panels by section — quick and precise."}{" "}
          <span style={{ color: "rgba(255,255,255,.85)" }}>Selected: {selectedCount}</span>
        </div>
      </div>

      <div className="lf-groups" role="group" aria-label="Select body panels">
        {GROUPS.map((g) => {
          const isOpen = open.has(g.id);
          const total = g.panels.length;
          const onCount = g.panels.reduce((n, pid) => n + (selected.has(pid) ? 1 : 0), 0);
          return (
            <div key={g.id} className="lf-group">
              <button type="button" className="lf-group-h" onClick={() => toggleGroup(g.id)} aria-expanded={isOpen}>
                <div className="lf-group-left">
                  <div className="lf-group-title">{g.title}</div>
                  <div className="lf-group-sub">{g.sub}</div>
                </div>
                <div className="lf-group-right">
                  <div className="lf-group-count">
                    {onCount}/{total}
                  </div>
                  <div className={`lf-group-chev ${isOpen ? "on" : ""}`}>›</div>
                </div>
              </button>
              {isOpen ? (
                <div className="lf-group-body">
                  <div className="lf-group-actions">
                    <button type="button" className="lf-pill" onClick={() => setGroupAll(g, "add")}>
                      Select all
                    </button>
                    <button type="button" className="lf-pill lf-pill--ghost" onClick={() => setGroupAll(g, "clear")}>
                      Clear
                    </button>
                  </div>
                  <div className="lf-group-grid">
                    {g.panels.map((pid) => {
                      const panel = PANELS.find((p) => p.id === pid);
                      if (!panel) return null;
                      return (
                        <button
                          key={pid}
                          type="button"
                          className={`lf-chip2 ${selected.has(pid) ? "on" : ""}`}
                          onClick={() => toggle(pid)}
                        >
                          {panel.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
