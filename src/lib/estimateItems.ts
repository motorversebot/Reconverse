/**
 * MPI-driven estimate client.
 *   GET   /units/:id/estimate-items
 *   POST  /units/:id/estimate-items/from-mpi
 *   PATCH /units/:id/estimate-items/:itemId           (labor/misc/notes/status)
 *   POST  /units/:id/estimate-items/:itemId/parts     (add part line)
 *   PATCH /units/:id/estimate-items/:itemId/parts/:partId
 *   DELETE /units/:id/estimate-items/:itemId/parts/:partId
 *   POST  /units/:id/move-to-approval
 */
import { apiFetch } from "@/lib/api";

export type EstimateItemStatus =
  | "needs_pricing" | "priced" | "no_charge" | "deferred" | "approved" | "declined";

export const ESTIMATE_STATUS_OPTIONS: { value: EstimateItemStatus; label: string }[] = [
  { value: "needs_pricing", label: "Needs Pricing" },
  { value: "priced", label: "Priced" },
  { value: "no_charge", label: "No Charge" },
  { value: "deferred", label: "Deferred" },
  { value: "approved", label: "Approved" },
  { value: "declined", label: "Declined" },
];

export interface EstimatePhoto { id: number; url: string; }
export interface EstimatePart {
  id: number;
  part_number: string | null;
  description: string | null;
  quantity: number;
  unit_price: number;
  kind: "oem" | "aftermarket" | null;
}

export interface EstimateItem {
  id: number;
  unit_id: number;
  source: string;
  mpi_category: string | null;
  mpi_item_name: string | null;
  concern: string;
  notes: string | null;
  photo_count: number;
  photos: EstimatePhoto[];
  labor_hours: number;
  labor_rate: number;
  parts_description: string | null;
  parts_cost: number;
  parts: EstimatePart[];
  misc_description: string | null;
  misc_cost: number;
  misc_notes: string | null;
  line_total: number;
  status: EstimateItemStatus;
}

export interface EstimateSummary {
  labor_total: number;
  parts_total: number;
  misc_total: number;
  grand_total: number;
  open_items: number;
  completed_items: number;
  needs_pricing: number;
}

export interface EstimateData {
  items: EstimateItem[];
  summary: EstimateSummary;
  available: boolean;
}

const EMPTY_SUMMARY: EstimateSummary = {
  labor_total: 0, parts_total: 0, misc_total: 0, grand_total: 0, open_items: 0, completed_items: 0, needs_pricing: 0,
};

function num(v: unknown): number { const n = Number(v); return Number.isFinite(n) ? n : 0; }

function normPart(r: any): EstimatePart {
  return {
    id: r.id,
    part_number: r.part_number ?? null,
    description: r.description ?? null,
    quantity: num(r.quantity),
    unit_price: num(r.unit_price),
    kind: (r.kind === "oem" || r.kind === "aftermarket") ? r.kind : null,
  };
}

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
    photos: Array.isArray(r.photos) ? r.photos.map((p: any) => ({ id: p.id, url: p.url })) : [],
    labor_hours: num(r.labor_hours),
    labor_rate: num(r.labor_rate),
    parts_description: r.parts_description ?? null,
    parts_cost: num(r.parts_cost),
    parts: Array.isArray(r.parts) ? r.parts.map(normPart) : [],
    misc_description: r.misc_description ?? null,
    misc_cost: num(r.misc_cost),
    misc_notes: r.misc_notes ?? null,
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

async function postJson(path: string, body?: unknown, method = "POST"): Promise<EstimateData | null> {
  const res = await apiFetch(`/api/v1/reconverse${path}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const j = await res.json().catch(() => null);
  if (!res.ok || !j?.ok) return null;
  return normData(j.data);
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

export interface EstimateItemPatch {
  labor_hours?: number;
  labor_rate?: number;
  parts_cost?: number;
  parts_description?: string | null;
  notes?: string | null;
  status?: EstimateItemStatus;
  misc_description?: string | null;
  misc_cost?: number;
  misc_notes?: string | null;
}

/** PATCH a line. Returns the full refreshed estimate (items + summary). */
export async function updateEstimateItem(unitId: string, itemId: number, patch: EstimateItemPatch): Promise<EstimateData | null> {
  return postJson(`/units/${unitId}/estimate-items/${itemId}`, patch, "PATCH");
}

export interface EstimatePartInput {
  part_number?: string | null;
  description?: string | null;
  quantity?: number;
  unit_price?: number;
  kind?: "oem" | "aftermarket" | null;
}

export async function addEstimatePart(unitId: string, itemId: number, part: EstimatePartInput): Promise<EstimateData | null> {
  return postJson(`/units/${unitId}/estimate-items/${itemId}/parts`, part, "POST");
}
export async function updateEstimatePart(unitId: string, itemId: number, partId: number, patch: EstimatePartInput): Promise<EstimateData | null> {
  return postJson(`/units/${unitId}/estimate-items/${itemId}/parts/${partId}`, patch, "PATCH");
}
export async function deleteEstimatePart(unitId: string, itemId: number, partId: number): Promise<EstimateData | null> {
  return postJson(`/units/${unitId}/estimate-items/${itemId}/parts/${partId}`, undefined, "DELETE");
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

export function needsPricingCount(items: EstimateItem[]): number {
  return items.filter((i) => i.status === "needs_pricing").length;
}
