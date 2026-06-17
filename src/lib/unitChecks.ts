/**
 * Automatic unit checks — CARFAX link/report + open recalls.
 *
 * Providers run client-side (NHTSA is CORS-friendly; CARFAX uses the dealer's
 * own Link Reports template — no scraping, no stored credentials). Results are
 * persisted to MC via POST /units/:id/checks/run and read back for display +
 * the open-recall badge.
 *
 * OPEN-RECALL RULE (matches product spec):
 *   - repair_complete === false  → counts as OPEN
 *   - repair_complete === true   → completed, not shown by default
 *   - repair_complete === null   → UNKNOWN, never counted as open
 * NHTSA's free recallsByVehicle is year/make/model only (no per-VIN completion),
 * so those campaigns are stored as UNKNOWN and never raise the red badge. A
 * per-VIN completion provider (Nissan / paid) is required to confirm open
 * recalls — see report. Until then has_open_recalls stays false (no false reds).
 */
import { apiFetch } from "@/lib/api";
import { resolveCarfax, canGenerateCarfax, generateCarfaxLink } from "@/lib/carfax";
import { checkVin, normalizeVin, isValidVin } from "@/lib/recalls";

export type CarfaxStatus =
  | "not_checked" | "checking" | "available" | "available_not_attached"
  | "provider_not_configured" | "failed";

export type RecallStatus =
  | "not_checked" | "checking" | "no_open_recalls" | "recalls_unconfirmed"
  | "open_recalls_found" | "failed";

export interface UnitRecallRecord {
  id?: number;
  campaign_id: string | null;
  nhtsa_campaign_id?: string | null;
  nissan_campaign_id?: string | null;
  description: string | null;
  repair_complete: boolean | null;
  stop_sale: boolean;
  parts_restriction: boolean;
  remedy_available: boolean;
  campaign_start?: string | null;
  source: string | null;
  status: string;            // open | completed | unknown
  checked_at?: string;
}

export interface UnitChecks {
  carfax_status: CarfaxStatus | string;
  carfax_report_url: string | null;
  carfax_last_checked_at: string | null;
  recall_status: RecallStatus | string;
  open_recall_count: number;
  open_recall_last_checked_at: string | null;
  open_recall_summary: string | null;
  has_open_recalls: boolean;
  recalls: UnitRecallRecord[];
}

export const EMPTY_CHECKS: UnitChecks = {
  carfax_status: "not_checked", carfax_report_url: null, carfax_last_checked_at: null,
  recall_status: "not_checked", open_recall_count: 0, open_recall_last_checked_at: null,
  open_recall_summary: null, has_open_recalls: false, recalls: [],
};

/** Read persisted check results from MC. Returns null if unavailable (pre-deploy). */
export async function getUnitChecks(unitId: string): Promise<UnitChecks | null> {
  try {
    const res = await apiFetch(`/api/v1/reconverse/units/${unitId}/checks`);
    if (res.status === 404) return null;
    const j = await res.json().catch(() => null);
    if (!res.ok || !j?.ok || !j.data) return null;
    return normalizeChecks(j.data);
  } catch {
    return null;
  }
}

function normalizeChecks(d: any): UnitChecks {
  return {
    carfax_status: d.carfax_status ?? "not_checked",
    carfax_report_url: d.carfax_report_url ?? null,
    carfax_last_checked_at: d.carfax_last_checked_at ?? null,
    recall_status: d.recall_status ?? "not_checked",
    open_recall_count: Number(d.open_recall_count ?? 0),
    open_recall_last_checked_at: d.open_recall_last_checked_at ?? null,
    open_recall_summary: d.open_recall_summary ?? null,
    has_open_recalls: !!d.has_open_recalls,
    recalls: Array.isArray(d.recalls) ? d.recalls.map(normalizeRecord) : [],
  };
}

function normalizeRecord(r: any): UnitRecallRecord {
  return {
    id: r.id,
    campaign_id: r.campaign_id ?? null,
    nhtsa_campaign_id: r.nhtsa_campaign_id ?? null,
    nissan_campaign_id: r.nissan_campaign_id ?? null,
    description: r.description ?? null,
    repair_complete: r.repair_complete === true ? true : r.repair_complete === false ? false : null,
    stop_sale: !!r.stop_sale,
    parts_restriction: !!r.parts_restriction,
    remedy_available: !!r.remedy_available,
    campaign_start: r.campaign_start ?? null,
    source: r.source ?? null,
    status: r.status ?? "unknown",
    checked_at: r.checked_at,
  };
}

/** Compute CARFAX result from dealer config (auto-generates link if possible). */
function computeCarfax(unit: { id?: string; vin?: string | null }, dealerId?: string): {
  carfax_status: CarfaxStatus; carfax_report_url: string | null;
} {
  try {
    // Auto-generate a per-VIN link if the dealer configured a template.
    if (canGenerateCarfax(unit, dealerId)) {
      const existing = resolveCarfax(unit, dealerId);
      const url = existing.carfax_report_url || generateCarfaxLink(dealerId || "", unit.vin || "");
      if (url) return { carfax_status: "available", carfax_report_url: url };
    }
    const info = resolveCarfax(unit, dealerId);
    if (info.carfax_report_url) return { carfax_status: "available", carfax_report_url: info.carfax_report_url };
    if (info.carfax_link_status === "not_configured") return { carfax_status: "provider_not_configured", carfax_report_url: null };
    return { carfax_status: "available_not_attached", carfax_report_url: null };
  } catch {
    return { carfax_status: "failed", carfax_report_url: null };
  }
}

/** Map an NHTSA campaign to a recall record (completion unknown → not counted open). */
function nhtsaToRecord(c: any, vin: string): UnitRecallRecord {
  return {
    campaign_id: c.campaignNumber || null,
    nhtsa_campaign_id: c.campaignNumber || null,
    nissan_campaign_id: null,
    description: c.component ? `${c.component}${c.summary ? " — " + c.summary : ""}` : (c.summary || null),
    repair_complete: null,          // NHTSA y/m/m gives no per-VIN completion
    stop_sale: false,
    parts_restriction: false,
    remedy_available: !!(c.remedy && String(c.remedy).trim()),
    campaign_start: c.recallDate || null,
    source: c.source || "NHTSA",
    status: "unknown",
    vin,
  };
}

/**
 * Run the checks for a unit (CARFAX + recalls), persist to MC, return the result.
 * Never throws — provider failures degrade to a "failed" sub-status.
 */
export async function runUnitChecks(
  unit: { id?: string; vin?: string | null },
  dealerId?: string,
  checks: Array<"carfax" | "recalls"> = ["carfax", "recalls"],
): Promise<UnitChecks> {
  const unitId = unit?.id;
  const vin = normalizeVin(unit?.vin);

  // CARFAX (synchronous, local config).
  const carfax = checks.includes("carfax")
    ? computeCarfax(unit, dealerId)
    : { carfax_status: "not_checked" as CarfaxStatus, carfax_report_url: null };

  // Recalls (NHTSA live).
  let records: UnitRecallRecord[] = [];
  let recallFailed = false;
  if (checks.includes("recalls")) {
    if (!isValidVin(vin)) {
      recallFailed = false; // no VIN → simply no recalls, not a failure
    } else {
      try {
        const r = await checkVin(vin, "nhtsa");
        if (r.lookupError) recallFailed = true;
        else records = (r.recalls || []).map((c) => nhtsaToRecord(c, vin));
      } catch {
        recallFailed = true;
      }
    }
  }

  const payload = {
    checks,
    carfax: checks.includes("carfax") ? carfax : undefined,
    recalls: checks.includes("recalls") ? { records, failed: recallFailed } : undefined,
  };

  // Persist to MC; fall back to a locally-computed snapshot if MC isn't ready.
  if (unitId) {
    try {
      const res = await apiFetch(`/api/v1/reconverse/units/${unitId}/checks/run`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      if (res.status !== 404) {
        const j = await res.json().catch(() => null);
        if (res.ok && j?.ok && j.data) return normalizeChecks(j.data);
      }
    } catch { /* fall through to local snapshot */ }
  }
  return localSnapshot(carfax, records, recallFailed);
}

function localSnapshot(
  carfax: { carfax_status: CarfaxStatus; carfax_report_url: string | null },
  records: UnitRecallRecord[],
  failed: boolean,
): UnitChecks {
  const openCount = records.filter((r) => r.repair_complete === false).length;
  const recall_status: RecallStatus = failed ? "failed"
    : openCount > 0 ? "open_recalls_found"
    : records.length > 0 ? "recalls_unconfirmed"
    : "no_open_recalls";
  const now = new Date().toISOString();
  return {
    carfax_status: carfax.carfax_status,
    carfax_report_url: carfax.carfax_report_url,
    carfax_last_checked_at: now,
    recall_status,
    open_recall_count: openCount,
    open_recall_last_checked_at: now,
    open_recall_summary: failed ? "Recall check failed"
      : openCount > 0 ? `${openCount} open recall${openCount === 1 ? "" : "s"}`
      : records.length > 0 ? `${records.length} campaign${records.length === 1 ? "" : "s"} — completion not VIN-confirmed`
      : "No open recalls",
    has_open_recalls: openCount > 0,
    recalls: records,
  };
}
