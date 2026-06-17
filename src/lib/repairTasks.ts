/**
 * Repair lane client — approved estimate items become repair tasks.
 *
 * MC endpoints:
 *   GET   /api/v1/reconverse/units/:id/repair-tasks
 *   POST  /api/v1/reconverse/units/:id/repair-tasks/from-approved-estimate
 *   PATCH /api/v1/reconverse/units/:id/repair-tasks/:taskId
 *   POST  /api/v1/reconverse/units/:id/repair-tasks/:taskId/notes   { body }
 *   POST  /api/v1/reconverse/units/:id/repair-tasks/:taskId/photos
 *   POST  /api/v1/reconverse/units/:id/move-to-qc
 */
import { apiFetch } from "@/lib/api";

export type RepairStatus =
  | "not_started" | "in_progress" | "waiting_parts" | "waiting_vendor" | "done" | "cannot_complete";
export type PartsStatus = "needed" | "ordered" | "received" | "installed" | "not_available";

export const REPAIR_STATUS_LABEL: Record<RepairStatus, string> = {
  not_started: "Not Started", in_progress: "In Progress", waiting_parts: "Waiting on Parts",
  waiting_vendor: "Waiting on Vendor", done: "Done", cannot_complete: "Cannot Complete",
};
export const PARTS_STATUS_OPTIONS: { value: PartsStatus; label: string }[] = [
  { value: "needed", label: "Needed" }, { value: "ordered", label: "Ordered" },
  { value: "received", label: "Received" }, { value: "installed", label: "Installed" },
  { value: "not_available", label: "Not Available" },
];

export interface RepairNote { body: string; by: string | null; at: string; }
export interface RepairTask {
  id: number;
  unit_id: number;
  estimate_item_id: number | null;
  title: string;
  mpi_category: string | null;
  mpi_item_name: string | null;
  tech_note: string | null;
  labor_hours: number;
  parts_description: string | null;
  approved_amount: number;
  status: RepairStatus;
  parts_status: PartsStatus | null;
  assigned_to: number | null;
  assigned_to_name: string | null;
  repair_notes: RepairNote[];
  photo_count: number;
}
export interface RepairSummary {
  total: number; completed: number; open: number;
  waiting_parts: number; waiting_vendor: number; cannot_complete: number;
  approved_total: number;
}
export interface RepairData { tasks: RepairTask[]; summary: RepairSummary; available: boolean; }

const EMPTY_SUMMARY: RepairSummary = {
  total: 0, completed: 0, open: 0, waiting_parts: 0, waiting_vendor: 0, cannot_complete: 0, approved_total: 0,
};
const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

function normTask(t: any): RepairTask {
  return {
    id: t.id, unit_id: t.unit_id, estimate_item_id: t.estimate_item_id ?? null,
    title: t.title ?? "", mpi_category: t.mpi_category ?? null, mpi_item_name: t.mpi_item_name ?? null,
    tech_note: t.tech_note ?? null, labor_hours: num(t.labor_hours),
    parts_description: t.parts_description ?? null, approved_amount: num(t.approved_amount),
    status: (t.status ?? "not_started") as RepairStatus,
    parts_status: (t.parts_status ?? null) as PartsStatus | null,
    assigned_to: t.assigned_to ?? null, assigned_to_name: t.assigned_to_name ?? null,
    repair_notes: Array.isArray(t.repair_notes) ? t.repair_notes : [],
    photo_count: num(t.photo_count),
  };
}
function normData(d: any): RepairData {
  return {
    tasks: Array.isArray(d?.tasks) ? d.tasks.map(normTask) : [],
    summary: d?.summary ? { ...EMPTY_SUMMARY, ...d.summary } : EMPTY_SUMMARY,
    available: true,
  };
}

async function getData(path: string, init?: RequestInit): Promise<RepairData> {
  try {
    const res = await apiFetch(path, init);
    if (res.status === 404) return { tasks: [], summary: EMPTY_SUMMARY, available: false };
    const j = await res.json().catch(() => null);
    if (!res.ok || !j?.ok) return { tasks: [], summary: EMPTY_SUMMARY, available: false };
    return normData(j.data);
  } catch {
    return { tasks: [], summary: EMPTY_SUMMARY, available: false };
  }
}

const base = (unitId: string) => `/api/v1/reconverse/units/${unitId}`;

export const listRepairTasks = (unitId: string) => getData(`${base(unitId)}/repair-tasks`);
export const generateRepairFromApproved = (unitId: string) =>
  getData(`${base(unitId)}/repair-tasks/from-approved-estimate`, { method: "POST" });
export const updateRepairTask = (unitId: string, taskId: number, patch: Partial<Pick<RepairTask, "status" | "parts_status" | "assigned_to">>) =>
  getData(`${base(unitId)}/repair-tasks/${taskId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
export const addRepairNote = (unitId: string, taskId: number, body: string) =>
  getData(`${base(unitId)}/repair-tasks/${taskId}/notes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body }) });
export const addRepairPhoto = (unitId: string, taskId: number) =>
  getData(`${base(unitId)}/repair-tasks/${taskId}/photos`, { method: "POST" });

export async function moveToQc(unitId: string): Promise<{ ok: boolean; message?: string }> {
  const res = await apiFetch(`${base(unitId)}/move-to-qc`, { method: "POST" });
  const j = await res.json().catch(() => null);
  if (res.ok && j?.ok) return { ok: true };
  if (res.status === 409 && j?.data) return { ok: false, message: j.data.message };
  return { ok: false, message: j?.error || "move_failed" };
}

/** Tasks blocking QC (anything not Done). */
export function qcBlockers(tasks: RepairTask[]): number {
  return tasks.filter((t) => t.status !== "done").length;
}
