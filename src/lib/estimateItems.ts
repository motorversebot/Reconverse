/**
 * Simple MPI-driven estimate items client.
 *
 * Estimate items are generated from failed / attention MPI items — the user
 * never re-types concerns. Line total = labor_hours × labor_rate + parts_cost.
 *
 * MC endpoints:
 *   GET   /api/v1/reconverse/units/:id/estimate-items
 *   POST  /api/v1/reconverse/units/:id/estimate-items/from-mpi
 *   PATCH /api/v1/reconverse/units/:id/estimate-items/:itemId
 *   POST  /api/v1/reconverse/units/:id/move-to-approval
 */
import { apiFetch } from "@/lib/api";

export type EstimateItemStatus =
  | "needs_pricing" | "priced" | "no_charge" | "deferred" | "approved" | "declined";

export const ESTIMATE_STATUS_OPTIONS: { value: EstimateItemStatus; label: string }[] = [
  { value: "needs_pricing", label: "Needs pricing" },
  { value: "priced", label: "Priced" },
  { value: "no_charge", label: "No charge" },
  { value: "deferred", label: "Deferred" },
  { value: "approved", label: "Approved" },
  { value: "declined", label: "Declined" },
];

export interface EstimateItem {
  id: number;
  unit_id: number;
  source: string;
  mpi_category: string | null;
  mpi_item_name: string | null;
  concern: string;
  notes: string | null;
  photo_count: number;
  labor_hours: number;
  labor_rate: number;
  parts_description: string | null;
  parts_cost: number;
  line_total: number;
  status: EstimateItemStatus;
}

export interface EstimateSummary {
  labor_total: number;
  parts_total: number;
  grand_total: number;
  open_items: number;
  completed_items: number;
  needs_pricing: number;
}

export interface EstimateData {
  items: EstimateItem[];
  summary: EstimateSummary;
  available: boolean; // false when MC endpoints aren't live yet
}

const EMPTY_SUMMARY: EstimateSummary = {
  labor_total: 0, parts_total: 0, grand_total: 0, open_items: 0, completed_items: 0, needs_pricing: 0,
};

function num(v: unknown): number { const n = Number(v); return Number.isFinite(n) ? n : 0; }

function normItem(r: any): EstimateItem {
  return {
    id: r.id,
    unit_id: r.unit_id,
    source: r.source ?? "mpi",
    mpi_category: r.mpi_category ?? null,
    mpi_item_name: r.mpi_item_name ?? null,
    concern: r.concern ?? "",
    notes: r.notes ?? null,
    photo_count: num(r.photo_count),
    labor_hours: num(r.labor_hours),
    labor_rate: num(r.labor_rate),
    parts_description: r.parts_description ?? null,
    parts_cost: num(r.parts_cost),
    line_total: num(r.line_total),
    status: (r.status ?? "needs_pricing") as EstimateItemStatus,
  };
}

function normData(d: any): EstimateData {
  return {
    items: Array.isArray(d?.items) ? d.items.map(normItem) : [],
    summary: d?.summary ? { ...EMPTY_SUMMARY, ...d.summary } : EMPTY_SUMMARY,
    available: true,
  };
}

export async function listEstimateItems(unitId: string): Promise<EstimateData> {
  try {
    const res = await apiFetch(`/api/v1/reconverse/units/${unitId}/estimate-items`);
    if (res.status === 404) return { items: [], summary: EMPTY_SUMMARY, available: false };
    const j = await res.json().catch(() => null);
    if (!res.ok || !j?.ok) return { items: [], summary: EMPTY_SUMMARY, available: false };
    return normData(j.data);
  } catch {
    return { items: [], summary: EMPTY_SUMMARY, available: false };
  }
}

export async function generateFromMpi(unitId: string): Promise<EstimateData> {
  const res = await apiFetch(`/api/v1/reconverse/units/${unitId}/estimate-items/from-mpi`, { method: "POST" });
  if (res.status === 404) return { items: [], summary: EMPTY_SUMMARY, available: false };
  const j = await res.json().catch(() => null);
  if (!res.ok || !j?.ok) return { items: [], summary: EMPTY_SUMMARY, available: false };
  return normData(j.data);
}

export async function updateEstimateItem(
  unitId: string, itemId: number, patch: Partial<Pick<EstimateItem,
    "labor_hours" | "labor_rate" | "parts_cost" | "parts_description" | "notes" | "status">>,
): Promise<{ item: EstimateItem; summary: EstimateSummary } | null> {
  const res = await apiFetch(`/api/v1/reconverse/units/${unitId}/estimate-items/${itemId}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch),
  });
  const j = await res.json().catch(() => null);
  if (!res.ok || !j?.ok) return null;
  return { item: normItem(j.data.item), summary: { ...EMPTY_SUMMARY, ...j.data.summary } };
}

export async function moveToEstimate(unitId: string): Promise<EstimateData> {
  const res = await apiFetch(`/api/v1/reconverse/units/${unitId}/move-to-estimate`, { method: "POST" });
  const j = await res.json().catch(() => null);
  if (!res.ok || !j?.ok) return { items: [], summary: EMPTY_SUMMARY, available: false };
  return normData(j.data);
}

export async function moveToApproval(unitId: string): Promise<{ ok: boolean; blocked?: number; message?: string }> {
  const res = await apiFetch(`/api/v1/reconverse/units/${unitId}/move-to-approval`, { method: "POST" });
  const j = await res.json().catch(() => null);
  if (res.ok && j?.ok) return { ok: true };
  if (res.status === 409 && j?.data) return { ok: false, blocked: j.data.blocked, message: j.data.message };
  return { ok: false, message: j?.error || "move_failed" };
}

/** Items that still block approval (must be priced / no-charge / deferred / terminal). */
export function needsPricingCount(items: EstimateItem[]): number {
  return items.filter((i) => i.status === "needs_pricing").length;
}
