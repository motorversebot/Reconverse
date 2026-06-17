/**
 * Saved Bulk-Recall reports.
 *
 * Tries the MC endpoints first (apiFetch only — no Supabase, no proxy/auth
 * changes); if they 404 / are unavailable, falls back to dealer-scoped
 * localStorage so the feature works today. Each call reports which store was
 * used so the UI can surface "saved locally — MC endpoint pending".
 *
 * Expected MC endpoints:
 *   POST   /api/v1/reconverse/recalls/reports
 *   GET    /api/v1/reconverse/recalls/reports
 *   GET    /api/v1/reconverse/recalls/reports/:id
 *   DELETE /api/v1/reconverse/recalls/reports/:id
 *
 * Privacy: customer columns are NEVER sent to recall providers. They may be
 * stored in the saved report (the dealer's own MC/local store) because the
 * dealer chose to keep them. Nothing here is logged to the console.
 */
import { apiFetch } from "@/lib/api";
import type { VinRecallResult } from "@/lib/recalls";

type Row = Record<string, unknown>;

export interface RecallReportSummary {
  checked: number;
  withRecalls: number;
  totalRecalls: number;
  failed: number;
  invalid: number;
}

export interface SavedRecallReport {
  id: string;
  name: string;
  created_at: string;
  created_by?: string | null;
  dealer_id?: string | null;
  file_name: string;
  vin_count: number;
  open_recall_count: number;
  kept_columns: string[];
  summary: RecallReportSummary;
  results: VinRecallResult[];   // checked VINs + recall results (for View)
  summary_rows: Row[];          // pre-built export rows
  detailed_rows: Row[];
  invalid_rows: Row[];
}

export type Persistence = "server" | "local";
export interface StoreResult<T> { data: T; persistence: Persistence; }

const LS_KEY = (dealerId?: string) => `rv_recall_reports_${dealerId || "default"}`;
const BASE = "/api/v1/reconverse/recalls/reports";

function readLocal(dealerId?: string): SavedRecallReport[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY(dealerId)) || "[]"); } catch { return []; }
}
function writeLocal(dealerId: string | undefined, reports: SavedRecallReport[]) {
  try { localStorage.setItem(LS_KEY(dealerId), JSON.stringify(reports)); } catch { /* ignore */ }
}

/** True when MC returned a real (non-404) response. */
async function tryServer<T>(fn: () => Promise<Response>): Promise<{ ok: boolean; status: number; json: any }> {
  try {
    const res = await fn();
    if (res.status === 404) return { ok: false, status: 404, json: null };
    const json = await res.json().catch(() => null);
    return { ok: res.ok && !!json?.ok, status: res.status, json };
  } catch {
    return { ok: false, status: 0, json: null };
  }
}

export async function listRecallReports(dealerId?: string): Promise<StoreResult<SavedRecallReport[]>> {
  const r = await tryServer(() => apiFetch(BASE));
  if (r.ok) return { data: (r.json.data || []) as SavedRecallReport[], persistence: "server" };
  return { data: readLocal(dealerId), persistence: "local" };
}

export async function saveRecallReport(
  report: Omit<SavedRecallReport, "id" | "created_at">,
  dealerId?: string,
): Promise<StoreResult<SavedRecallReport>> {
  const r = await tryServer(() => apiFetch(BASE, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(report),
  }));
  if (r.ok) return { data: r.json.data as SavedRecallReport, persistence: "server" };

  // Local fallback
  const saved: SavedRecallReport = {
    ...report,
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    created_at: new Date().toISOString(),
  };
  const all = readLocal(dealerId);
  all.unshift(saved);
  writeLocal(dealerId, all);
  return { data: saved, persistence: "local" };
}

export async function deleteRecallReport(id: string, dealerId?: string): Promise<Persistence> {
  if (!id.startsWith("local-")) {
    const r = await tryServer(() => apiFetch(`${BASE}/${id}`, { method: "DELETE" }));
    if (r.ok) return "server";
  }
  writeLocal(dealerId, readLocal(dealerId).filter((x) => x.id !== id));
  return "local";
}
