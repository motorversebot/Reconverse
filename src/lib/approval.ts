/**
 * Approval client — review the submitted estimate and approve / decline /
 * send back. Builds on the MPI-driven estimate items.
 *
 * MC endpoints:
 *   GET  /api/v1/reconverse/units/:id/estimates/submitted
 *   POST /api/v1/reconverse/units/:id/approval/approve
 *   POST /api/v1/reconverse/units/:id/approval/decline   { reason }
 *   POST /api/v1/reconverse/units/:id/approval/send-back { reason }
 */
import { apiFetch } from "@/lib/api";
import type { EstimateItem, EstimateSummary } from "@/lib/estimateItems";

export interface SubmittedEstimate {
  unit: {
    id: number; year: number | null; make: string | null; model: string | null;
    vin: string | null; stock_number: string | null; repair_order_number: string | null;
    tag_number: string | null; promise_date: string | null; stage_slug: string | null;
  };
  estimate_status: string;       // draft|submitted|approved|declined|sent_back
  decision_note: string | null;
  submitted_by: string | null;
  submitted_at: string | null;
  decided_by: string | null;
  decided_at: string | null;
  items: EstimateItem[];
  summary: EstimateSummary;
  available: boolean;
}

const EMPTY_SUMMARY: EstimateSummary = {
  labor_total: 0, parts_total: 0, grand_total: 0, open_items: 0, completed_items: 0, needs_pricing: 0,
};

export async function getSubmittedEstimate(unitId: string): Promise<SubmittedEstimate | null> {
  try {
    const res = await apiFetch(`/api/v1/reconverse/units/${unitId}/estimates/submitted`);
    if (res.status === 404) return null; // endpoint not live, or unit not found
    const j = await res.json().catch(() => null);
    if (!res.ok || !j?.ok || !j.data) return null;
    const d = j.data;
    return {
      unit: d.unit,
      estimate_status: d.estimate_status ?? "draft",
      decision_note: d.decision_note ?? null,
      submitted_by: d.submitted_by ?? null,
      submitted_at: d.submitted_at ?? null,
      decided_by: d.decided_by ?? null,
      decided_at: d.decided_at ?? null,
      items: Array.isArray(d.items) ? d.items : [],
      summary: d.summary ?? EMPTY_SUMMARY,
      available: true,
    };
  } catch {
    return null;
  }
}

type DecisionResult = { ok: boolean; message?: string };

async function post(unitId: string, action: string, body?: unknown): Promise<DecisionResult> {
  const res = await apiFetch(`/api/v1/reconverse/units/${unitId}/approval/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const j = await res.json().catch(() => null);
  if (res.ok && j?.ok) return { ok: true };
  return { ok: false, message: j?.data?.message || j?.error || "action_failed" };
}

export const approveEstimate = (unitId: string) => post(unitId, "approve");
export const declineEstimate = (unitId: string, reason: string) => post(unitId, "decline", { reason });
export const sendBackEstimate = (unitId: string, reason: string) => post(unitId, "send-back", { reason });
