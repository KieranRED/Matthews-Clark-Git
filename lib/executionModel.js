import crypto from "node:crypto";

export const EXEC_STEP_STATUSES = ["todo", "doing", "done", "blocked"];

export function defaultExecutionSteps() {
  const now = new Date().toISOString();
  const mk = (id, label) => ({
    id,
    label,
    status: "todo",
    createdAt: now,
    updatedAt: now,
    updatedBy: null
  });
  return [
    mk("check_in", "Check-in (vehicle received)"),
    mk("wash_decon", "Wash + decontamination"),
    mk("prep", "Prep / masking / paint prep"),
    mk("work", "Work in progress"),
    mk("qc", "Quality check + final inspection"),
    mk("ready", "Ready for collection"),
    mk("collected", "Collected / delivered")
  ];
}

export function ensureExecution(lead, by) {
  const existing = lead?.execution && typeof lead.execution === "object" ? lead.execution : null;
  if (existing?.steps && Array.isArray(existing.steps) && existing.steps.length) {
    return {
      ...existing,
      updatedAt: new Date().toISOString(),
      updatedBy: by || existing.updatedBy || null
    };
  }
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    startedAt: now,
    startedBy: by || null,
    updatedBy: by || null,
    steps: defaultExecutionSteps(),
    notes: []
  };
}

export function upsertExecutionNote(execution, { by, text }) {
  const now = new Date().toISOString();
  const notes = Array.isArray(execution?.notes) ? execution.notes.slice(0, 80) : [];
  notes.unshift({ id: crypto.randomUUID(), at: now, by: by || null, text: String(text || "").trim() });
  return { ...(execution || {}), notes, updatedAt: now, updatedBy: by || null };
}

export function updateExecutionStep(execution, { stepId, status, by }) {
  const now = new Date().toISOString();
  const steps = Array.isArray(execution?.steps) ? execution.steps.slice(0, 50) : [];
  const next = steps.map((s) => {
    if (!s || typeof s !== "object") return s;
    if (String(s.id) !== String(stepId)) return s;
    return { ...s, status, updatedAt: now, updatedBy: by || null };
  });
  return { ...(execution || {}), steps: next, updatedAt: now, updatedBy: by || null };
}

