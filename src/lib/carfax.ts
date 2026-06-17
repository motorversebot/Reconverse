/**
 * CARFAX Link Reports — Phase 1 (frontend).
 *
 * The dealer pastes their official CARFAX "Link Reports" template once (from
 * carfaxonline.com → Resources → Link Reports). The template contains a {VIN}
 * placeholder; Reconverse generates a per-VIN report URL from it. No CARFAX
 * credentials or scraping are involved — only the dealer's own link format.
 *
 * Phase 1 stores config + per-unit links in localStorage (dealer-scoped) so we
 * don't need a schema migration. Phase 2 can move these onto the unit/dealer
 * records in MC (carfax_report_url, carfax_link_status, …) with the same shape.
 */
import { normalizeVin, isValidVin } from "@/lib/recalls";

export type CarfaxLinkStatus = "not_configured" | "available" | "missing" | "expired";

/** Per-unit CARFAX state (mirrors the intended persisted columns). */
export interface CarfaxInfo {
  vin: string;
  carfax_report_url: string | null;
  carfax_badge_type: string | null;
  carfax_link_status: CarfaxLinkStatus;
  carfax_last_checked_at: string | null;
}

/** Dealer-level CARFAX configuration (from the Link Reports page). */
export interface CarfaxConfig {
  enabled: boolean;
  /** URL template with a {VIN} placeholder, e.g.
   *  https://www.carfax.com/VehicleHistory/p/Report.cfx?partner=ABC_0&vin={VIN} */
  linkTemplate: string;
  /** Optional default badge label (e.g. "CARFAX Report", "1-Owner"). */
  badgeType: string;
}

const CFG_KEY = (dealerId: string) => `rv_carfax_cfg_${dealerId}`;
const UNIT_KEY = (dealerId: string, vin: string) => `rv_carfax_unit_${dealerId}_${vin}`;

const DEFAULT_CONFIG: CarfaxConfig = { enabled: false, linkTemplate: "", badgeType: "CARFAX Report" };

// Suggested template hint shown in Settings (placeholder only — dealer supplies
// their real partner code). Do NOT treat as a working link.
export const CARFAX_TEMPLATE_HINT =
  "https://www.carfax.com/VehicleHistory/p/Report.cfx?partner=YOUR_PARTNER_CODE&vin={VIN}";

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...(JSON.parse(raw) as object) } as T : fallback;
  } catch {
    return fallback;
  }
}

export function getCarfaxConfig(dealerId?: string): CarfaxConfig {
  if (!dealerId) return DEFAULT_CONFIG;
  return readJson<CarfaxConfig>(CFG_KEY(dealerId), DEFAULT_CONFIG);
}

export function saveCarfaxConfig(dealerId: string, cfg: CarfaxConfig): void {
  try { localStorage.setItem(CFG_KEY(dealerId), JSON.stringify(cfg)); } catch { /* ignore */ }
}

/** Substitute the VIN into the dealer's link template. */
export function buildCarfaxUrl(template: string, vin: string): string {
  const v = normalizeVin(vin);
  if (!template) return "";
  if (/\{vin\}/i.test(template)) return template.replace(/\{vin\}/gi, encodeURIComponent(v));
  // No placeholder — append as a query param.
  const sep = template.includes("?") ? "&" : "?";
  return `${template}${sep}vin=${encodeURIComponent(v)}`;
}

// ── Per-unit stored link (manual attach or generated) ──
interface StoredUnitLink {
  url: string;
  badgeType?: string;
  status?: CarfaxLinkStatus;
  lastCheckedAt?: string;
}

function getUnitLink(dealerId: string, vin: string): StoredUnitLink | null {
  if (!dealerId || !vin) return null;
  try {
    const raw = localStorage.getItem(UNIT_KEY(dealerId, vin));
    return raw ? (JSON.parse(raw) as StoredUnitLink) : null;
  } catch { return null; }
}

export function attachCarfaxLink(dealerId: string, vin: string, url: string, badgeType?: string): void {
  const v = normalizeVin(vin);
  if (!dealerId || !v) return;
  const rec: StoredUnitLink = { url, badgeType, status: "available", lastCheckedAt: new Date().toISOString() };
  try { localStorage.setItem(UNIT_KEY(dealerId, v), JSON.stringify(rec)); } catch { /* ignore */ }
}

export function clearCarfaxLink(dealerId: string, vin: string): void {
  const v = normalizeVin(vin);
  if (!dealerId || !v) return;
  try { localStorage.removeItem(UNIT_KEY(dealerId, v)); } catch { /* ignore */ }
}

/** Generate + persist a link for this VIN from the dealer template. */
export function generateCarfaxLink(dealerId: string, vin: string): string | null {
  const cfg = getCarfaxConfig(dealerId);
  const v = normalizeVin(vin);
  if (!cfg.enabled || !cfg.linkTemplate || !isValidVin(v)) return null;
  const url = buildCarfaxUrl(cfg.linkTemplate, v);
  attachCarfaxLink(dealerId, v, url, cfg.badgeType);
  return url;
}

/**
 * Resolve the CARFAX state for a unit, combining any stored per-unit link with
 * the dealer config. Pure read — does not persist.
 */
export function resolveCarfax(unit: { vin?: string | null }, dealerId?: string): CarfaxInfo {
  const vin = normalizeVin(unit?.vin);
  const cfg = getCarfaxConfig(dealerId);
  const stored = dealerId ? getUnitLink(dealerId, vin) : null;

  if (stored?.url) {
    return {
      vin,
      carfax_report_url: stored.url,
      carfax_badge_type: stored.badgeType || cfg.badgeType || "CARFAX Report",
      carfax_link_status: stored.status || "available",
      carfax_last_checked_at: stored.lastCheckedAt || null,
    };
  }

  // No stored link yet.
  if (!cfg.enabled || !cfg.linkTemplate) {
    return { vin, carfax_report_url: null, carfax_badge_type: cfg.badgeType || null, carfax_link_status: "not_configured", carfax_last_checked_at: null };
  }
  // Configured but nothing attached for this unit → "missing" (not attached).
  return { vin, carfax_report_url: null, carfax_badge_type: cfg.badgeType || "CARFAX Report", carfax_link_status: "missing", carfax_last_checked_at: null };
}

/** Can a link be generated right now (config on + valid VIN)? */
export function canGenerateCarfax(unit: { vin?: string | null }, dealerId?: string): boolean {
  const cfg = getCarfaxConfig(dealerId);
  return !!dealerId && cfg.enabled && !!cfg.linkTemplate && isValidVin(normalizeVin(unit?.vin));
}
